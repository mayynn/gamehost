import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';
import { AuthService } from '../auth/auth.service';
import { ServerStatus, PlanType } from '@prisma/client';

@Injectable()
export class ServersService {
    private readonly logger = new Logger(ServersService.name);

    constructor(
        private prisma: PrismaService,
        private pterodactyl: PterodactylService,
        private pterodactylClient: PterodactylClientService,
        private authService: AuthService,
    ) { }

    // ---------- Verify ownership by pterodactyl UUID ----------
    async verifyOwnershipByUuid(userId: string, pteroUuid: string) {
        const server = await this.prisma.server.findFirst({
            where: { pteroUuid, userId, status: { not: ServerStatus.DELETED } },
        });
        if (!server) throw new ForbiddenException('You do not own this server');
        return server;
    }

    // ---------- List user's servers ----------
    async getUserServers(userId: string) {
        const servers = await this.prisma.server.findMany({
            where: { userId, status: { not: ServerStatus.DELETED } },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        });

        // Enrich with live status from Pterodactyl (with concurrency guard)
        const enriched = await Promise.all(
            servers.map(async (server) => {
                let resources = null;
                if (server.pteroUuid) {
                    try {
                        resources = await Promise.race([
                            this.pterodactylClient.getServerResources(server.pteroUuid),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
                        ]);
                    } catch {
                        // Silently skip — resource fetch is best-effort enrichment
                    }
                }
                return { ...server, resources };
            }),
        );

        return enriched;
    }

    // ---------- Get single server ----------
    async getServer(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({
            where: { id: serverId, userId },
            include: { plan: true },
        });

        if (!server) throw new NotFoundException('Server not found');

        let pteroData = null;
        let resources = null;

        if (server.pteroUuid) {
            try {
                pteroData = await this.pterodactylClient.getServer(server.pteroUuid);
                resources = await this.pterodactylClient.getServerResources(server.pteroUuid);
            } catch (e) {
                this.logger.warn(`Failed to fetch Pterodactyl data for ${server.pteroUuid}: ${e.message}`);
            }
        }

        return { ...server, pteroData, resources };
    }

    // ---------- Provision server ----------
    async provisionServer(userId: string, data: {
        name: string;
        planId: string;
        eggId: number;
        nestId: number;
        nodeId?: number;
        ram?: number;
        cpu?: number;
        disk?: number;
        environment?: Record<string, string>;
    }) {
        // Ensure user has Pterodactyl account (auto-heal)
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { pterodactylAccount: true, balance: true, credits: true },
        });

        if (!user) throw new BadRequestException('User not found');

        // Get plan for resource limits and pricing
        const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
        if (!plan) throw new BadRequestException('Invalid plan');
        if (!plan.isActive) throw new BadRequestException('This plan is no longer available');

        // Determine final resources
        let ram = plan.ram;
        let cpu = plan.cpu;
        let disk = plan.disk;

        if (plan.type === PlanType.CUSTOM && (data.ram || data.cpu || data.disk)) {
            // Validate custom builder limits
            ram = data.ram || plan.ram;
            cpu = data.cpu || plan.cpu;
            disk = data.disk || plan.disk;

            // Enforce plan min/max limits
            const minRam = plan.minRam || 512;
            const maxRam = plan.maxRam || 16384;
            const minCpu = plan.minCpu || 50;
            const maxCpu = plan.maxCpu || 800;
            const minDisk = plan.minDisk || 1024;
            const maxDisk = plan.maxDisk || 102400;

            if (ram < minRam || ram > maxRam) throw new BadRequestException(`RAM must be between ${minRam}MB and ${maxRam}MB`);
            if (cpu < minCpu || cpu > maxCpu) throw new BadRequestException(`CPU must be between ${minCpu}% and ${maxCpu}%`);
            if (disk < minDisk || disk > maxDisk) throw new BadRequestException(`Disk must be between ${minDisk}MB and ${maxDisk}MB`);
        } else if (data.ram || data.cpu || data.disk) {
            // Non-custom plans: ignore custom resources, use plan values
            ram = plan.ram;
            cpu = plan.cpu;
            disk = plan.disk;
        }

        // ---------- Cost verification for paid plans ----------
        if (plan.type === PlanType.PREMIUM || plan.type === PlanType.CUSTOM) {
            let price: number;

            if (plan.type === PlanType.CUSTOM) {
                // Calculate custom price
                const pricePerGb = plan.pricePerGb || 50;
                const ramGb = ram / 1024;
                const cpuFactor = cpu / 100;
                const diskGb = disk / 1024;
                price = Math.ceil(ramGb * pricePerGb + diskGb * (pricePerGb * 0.1) + cpuFactor * (pricePerGb * 0.5));
            } else {
                price = plan.pricePerMonth;
            }

            if (price > 0) {
                // Try to deduct from balance first (atomic transaction)
                const userBalance = user.balance?.amount || 0;
                if (userBalance < price) {
                    throw new BadRequestException(
                        `Insufficient balance. Server costs ₹${price}/mo but you only have ₹${userBalance.toFixed(2)}. Please add funds first.`
                    );
                }

                // Deduct balance atomically
                const deducted = await this.prisma.$transaction(async (tx) => {
                    const bal = await tx.balance.findUnique({ where: { userId } });
                    if (!bal || bal.amount < price) return false;
                    await tx.balance.update({
                        where: { userId },
                        data: { amount: { decrement: price } },
                    });
                    return true;
                });

                if (!deducted) {
                    throw new BadRequestException('Insufficient balance — concurrent deduction detected. Please try again.');
                }

                // Record payment
                await this.prisma.payment.create({
                    data: {
                        userId,
                        gateway: 'BALANCE',
                        amount: price,
                        status: 'COMPLETED',
                        metadata: { type: 'server_creation', planId: plan.id, ram, cpu, disk },
                    },
                });

                this.logger.log(`Deducted ₹${price} from user ${userId} for server creation`);
            }
        }

        // Free plan: no upfront cost — credits are only consumed for renewal
        // (see CreditsService.checkFreeServerCredits cron job)

        // ---------- Create Pterodactyl account ----------
        await this.authService.ensurePterodactylAccount(user);

        // Refresh user to get pterodactylId
        const updatedUser = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { pterodactylAccount: true },
        });

        if (!updatedUser?.pterodactylId) {
            throw new BadRequestException('Failed to create Pterodactyl account');
        }

        // Get egg details
        const egg = await this.pterodactyl.getEgg(data.nestId, data.eggId);
        if (!egg) throw new BadRequestException('Invalid egg');

        // Build environment variables from egg defaults
        const environment: Record<string, string> = {};
        if (egg.relationships?.variables?.data) {
            for (const v of egg.relationships.variables.data) {
                const attr = v.attributes;
                environment[attr.env_variable] = data.environment?.[attr.env_variable] || attr.default_value || '';
            }
        }

        // Determine docker image (egg may have multiple, pick first)
        const dockerImage = egg.docker_image || (egg.docker_images ? Object.values(egg.docker_images)[0] : 'ghcr.io/pterodactyl/yolks:java_17');

        // Determine node/allocation
        let deploy: any = undefined;
        let allocation: any = undefined;
        if (data.nodeId) {
            // Get a free allocation from the specified node (paginated)
            const freeAlloc = await this.pterodactyl.findFreeAllocation(data.nodeId);
            if (!freeAlloc) throw new BadRequestException('No free allocations on selected node. Try another location.');
            allocation = { default: freeAlloc.id };
        } else if (plan.nodeId) {
            // Plan has a locked node
            const freeAlloc = await this.pterodactyl.findFreeAllocation(plan.nodeId);
            if (!freeAlloc) throw new BadRequestException('No free allocations on the plan node. Contact support.');
            allocation = { default: freeAlloc.id };
        } else {
            // Dynamic: let Pterodactyl auto-deploy across all locations
            const locations = await this.pterodactyl.getLocations();
            if (!locations.length) throw new BadRequestException('No server locations available. Contact support.');
            deploy = {
                locations: locations.map((l: any) => l.id),
                dedicated_ip: false,
                port_range: ['1024-65535'],  // Allow any port; Pterodactyl picks from available allocations
            };
        }

        // Create server in Pterodactyl
        const pteroServer = await this.pterodactyl.createServer({
            name: data.name,
            user: updatedUser.pterodactylId,
            egg: data.eggId,
            docker_image: dockerImage,
            startup: egg.startup,
            environment,
            limits: { memory: ram, swap: 0, disk, io: 500, cpu },
            feature_limits: { databases: plan.databases, backups: plan.backups, allocations: plan.ports },
            deploy,
            allocation,
        });

        if (!pteroServer) {
            // Refund if paid
            if (plan.type !== PlanType.FREE) {
                const pricePerGb = plan.pricePerGb || 50;
                const ramGb = ram / 1024;
                const cpuFactor = cpu / 100;
                const diskGb = disk / 1024;
                const price = plan.type === PlanType.CUSTOM
                    ? Math.ceil(ramGb * pricePerGb + diskGb * (pricePerGb * 0.1) + cpuFactor * (pricePerGb * 0.5))
                    : plan.pricePerMonth;
                if (price > 0) {
                    await this.prisma.balance.upsert({
                        where: { userId },
                        update: { amount: { increment: price } },
                        create: { userId, amount: price },
                    });
                    // Record refund in balance transaction ledger
                    await this.prisma.balanceTransaction.create({
                        data: {
                            userId,
                            amount: price,
                            type: 'REFUND',
                            description: 'Server provisioning failed — auto-refund',
                        },
                    });
                    this.logger.warn(`Refunded ₹${price} to user ${userId} due to Pterodactyl provisioning failure`);
                }
            } else {
                // Refund the 1 credit for free server
                await this.prisma.credit.upsert({
                    where: { userId },
                    update: { amount: { increment: 1 } },
                    create: { userId, amount: 1 },
                });
                this.logger.warn(`Refunded 1 credit to user ${userId} due to free server provisioning failure`);
            }
            throw new BadRequestException('Failed to create server in Pterodactyl. Your balance has been refunded.');
        }

        // Save to DB — wrapped in try/catch to handle DB failure after Pterodactyl success
        let server;
        try {
            server = await this.prisma.server.create({
                data: {
                    userId,
                    planId: data.planId,
                    name: data.name,
                    pteroServerId: pteroServer.id,
                    pteroUuid: pteroServer.uuid,
                    pteroIdentifier: pteroServer.identifier,
                    status: ServerStatus.ACTIVE,
                    isFreeServer: plan.type === PlanType.FREE,
                    ram,
                    cpu,
                    disk,
                    backups: plan.backups,
                    ports: plan.ports,
                    databases: plan.databases,
                    expiresAt: plan.type === PlanType.FREE
                        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // Free: 7 days
                        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Paid: 30 days
                },
            });
        } catch (dbError: any) {
            // DB failed after Pterodactyl succeeded — clean up orphaned Pterodactyl server
            this.logger.error(`DB save failed after Pterodactyl server created (pteroId=${pteroServer.id}): ${dbError.message}`);
            try {
                await this.pterodactyl.deleteServer(pteroServer.id);
                this.logger.warn(`Cleaned up orphaned Pterodactyl server ${pteroServer.id}`);
            } catch (cleanupError: any) {
                this.logger.error(`CRITICAL: Failed to clean up orphaned Pterodactyl server ${pteroServer.id}: ${cleanupError.message}`);
            }
            // Refund the user
            if (plan.type !== PlanType.FREE) {
                const pricePerGb = plan.pricePerGb || 50;
                const ramGb = ram / 1024;
                const cpuFactor = cpu / 100;
                const diskGb = disk / 1024;
                const refundPrice = plan.type === PlanType.CUSTOM
                    ? Math.ceil(ramGb * pricePerGb + diskGb * (pricePerGb * 0.1) + cpuFactor * (pricePerGb * 0.5))
                    : plan.pricePerMonth;
                if (refundPrice > 0) {
                    await this.prisma.balance.upsert({
                        where: { userId },
                        update: { amount: { increment: refundPrice } },
                        create: { userId, amount: refundPrice },
                    });
                    await this.prisma.balanceTransaction.create({
                        data: { userId, amount: refundPrice, type: 'REFUND', description: 'Server DB save failed — auto-refund' },
                    });
                }
            }
            throw new BadRequestException('Server creation failed. Your balance has been refunded.');
        }

        this.logger.log(`Server ${server.id} provisioned for user ${userId} (${ram}MB RAM / ${cpu}% CPU / ${disk}MB Disk)`);
        return server;
    }

    // ---------- Power Actions ----------
    async powerAction(userId: string, serverId: string, action: 'start' | 'stop' | 'restart' | 'kill') {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server) throw new NotFoundException('Server not found');
        if (server.status === ServerStatus.SUSPENDED) throw new BadRequestException('Server is suspended');
        if (!server.pteroUuid) throw new BadRequestException('Server not linked to Pterodactyl');

        return this.pterodactylClient.sendPowerAction(server.pteroUuid, action);
    }

    // ---------- Console ----------
    async getConsoleWebsocket(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.getWebsocketCredentials(server.pteroUuid);
    }

    async sendConsoleCommand(userId: string, serverId: string, command: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.sendCommand(server.pteroUuid, command);
    }

    // ---------- Files ----------
    async listFiles(userId: string, serverId: string, directory = '/') {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.listFiles(server.pteroUuid, directory);
    }

    async getFileContents(userId: string, serverId: string, file: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.getFileContents(server.pteroUuid, file);
    }

    async writeFile(userId: string, serverId: string, file: string, content: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.writeFile(server.pteroUuid, file, content);
    }

    async deleteFiles(userId: string, serverId: string, root: string, files: string[]) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.deleteFiles(server.pteroUuid, root, files);
    }

    async getUploadUrl(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.uploadFileUrl(server.pteroUuid);
    }

    // ---------- Backups ----------
    async listBackups(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.listBackups(server.pteroUuid);
    }

    async createBackup(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.createBackup(server.pteroUuid);
    }

    // ---------- Databases ----------
    async listDatabases(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.listDatabases(server.pteroUuid);
    }

    async createDatabase(userId: string, serverId: string, dbName: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.createDatabase(server.pteroUuid, dbName, '%');
    }

    // ---------- Network ----------
    async getNetwork(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.listAllocations(server.pteroUuid);
    }

    // ---------- Startup ----------
    async getStartup(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.getStartup(server.pteroUuid);
    }

    async updateStartupVariable(userId: string, serverId: string, key: string, value: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.updateStartupVariable(server.pteroUuid, key, value);
    }

    // ---------- Delete ----------
    async deleteServer(serverId: string) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (!server) throw new NotFoundException('Server not found');

        if (server.pteroServerId) {
            await this.pterodactyl.deleteServer(server.pteroServerId);
        }

        return this.prisma.server.update({
            where: { id: serverId },
            data: { status: ServerStatus.DELETED },
        });
    }

    // ---------- Delete Backup ----------
    async deleteBackup(userId: string, serverId: string, backupId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.deleteBackup(server.pteroUuid, backupId);
    }

    // ---------- Download Backup ----------
    async downloadBackup(userId: string, serverId: string, backupId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        const url = await this.pterodactylClient.downloadBackup(server.pteroUuid, backupId);
        return { url };
    }

    // ---------- Delete Database (by DB id) ----------
    async deleteDatabase2(userId: string, serverId: string, databaseId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.deleteDatabase(server.pteroUuid, databaseId);
    }

    // ---------- Rename File ----------
    async renameFile(userId: string, serverId: string, root: string, from: string, to: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.renameFile(server.pteroUuid, root, from, to);
    }

    // ---------- Create Directory ----------
    async createDirectory(userId: string, serverId: string, root: string, name: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.createDirectory(server.pteroUuid, root, name);
    }

    // ---------- Reinstall ----------
    async reinstallServer(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({ where: { id: serverId, userId } });
        if (!server?.pteroUuid) throw new NotFoundException('Server not found');
        return this.pterodactylClient.reinstall(server.pteroUuid);
    }
}
