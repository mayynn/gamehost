import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';
import { AuthService } from '../auth/auth.service';
import { DiscordService } from '../discord/discord.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { ServerStatus, PlanType } from '@prisma/client';
import { calculateCustomServerPrice } from '../../common/utils/pricing';
import { RenewalInfo } from '../../common/interfaces';
import {
    FREE_SERVER_RENEWAL_DAYS,
    PAID_SERVER_RENEWAL_DAYS,
    RESOURCE_FETCH_TIMEOUT_MS,
} from '../../common/constants';

@Injectable()
export class ServersService {
    private readonly logger = new Logger(ServersService.name);

    constructor(
        private prisma: PrismaService,
        private pterodactyl: PterodactylService,
        private pterodactylClient: PterodactylClientService,
        private authService: AuthService,
        private discord: DiscordService,
        private cloudflare: CloudflareService,
    ) { }

    // ─── Private Helpers ─────────────────────────────────────

    private getClientServerRef(server: { pteroIdentifier?: string | null; pteroUuid?: string | null }): string {
        const ref = server.pteroIdentifier || server.pteroUuid;
        if (!ref) throw new BadRequestException('Server not linked to Pterodactyl');
        return ref;
    }

    /**
     * Verifies that a server belongs to the given user and returns it.
     * Central ownership check — eliminates repeated findFirst + NotFoundException patterns.
     */
    private async findOwnedServer(userId: string, serverId: string, include?: Record<string, any>) {
        const server = await this.prisma.server.findFirst({
            where: { id: serverId, userId },
            ...(include ? { include } : {}),
        });
        if (!server) throw new NotFoundException('Server not found');
        return server;
    }

    /**
     * Validates that a server is in a usable state for operations (not suspended/expired/deleted).
     */
    private assertServerOperable(server: { status: ServerStatus }, operation: string): void {
        if (server.status === ServerStatus.SUSPENDED) {
            throw new BadRequestException(`Server is suspended. Please renew to ${operation}.`);
        }
        if (server.status === ServerStatus.EXPIRED) {
            throw new BadRequestException('Server has expired. Please renew it first.');
        }
        if (server.status === ServerStatus.DELETED) {
            throw new BadRequestException('Server has been deleted');
        }
    }

    /**
     * Calculates the renewal price for a server based on its plan.
     */
    private calculateRenewalPrice(plan: any, server: { ram: number; cpu: number; disk: number }): number {
        if (plan.renewalCost > 0) return plan.renewalCost;

        if (plan.type === PlanType.CUSTOM) {
            return calculateCustomServerPrice({
                ram: server.ram,
                cpu: server.cpu,
                disk: server.disk,
                pricePerGb: plan.pricePerGb || 50,
            });
        }

        return plan.pricePerMonth || 0;
    }

    /**
     * Returns the renewal period in days for a server.
     */
    private getRenewalDays(plan: any | null, isFreeServer: boolean): number {
        return plan?.renewalPeriodDays || (isFreeServer ? FREE_SERVER_RENEWAL_DAYS : PAID_SERVER_RENEWAL_DAYS);
    }

    // ─── Ownership Verification ──────────────────────────────

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
                if (server.pteroUuid || server.pteroIdentifier) {
                    try {
                        resources = await Promise.race([
                            this.pterodactylClient.getServerResources(this.getClientServerRef(server)),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), RESOURCE_FETCH_TIMEOUT_MS)),
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

    // ─── Get Single Server ────────────────────────────────────

    async getServer(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId, { plan: true });

        let pteroData = null;
        let resources = null;

        if (server.pteroUuid || server.pteroIdentifier) {
            try {
                pteroData = await this.pterodactylClient.getServer(this.getClientServerRef(server));
                resources = await this.pterodactylClient.getServerResources(this.getClientServerRef(server));
            } catch (e) {
                this.logger.warn(`Failed to fetch Pterodactyl data for ${this.getClientServerRef(server)}: ${e.message}`);
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
                price = calculateCustomServerPrice({
                    ram, cpu, disk,
                    pricePerGb: plan.pricePerGb || 50,
                });
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

                // Record balance transaction for audit trail
                await this.prisma.balanceTransaction.create({
                    data: {
                        userId,
                        amount: -price,
                        type: 'SERVER_CREATION',
                        description: `Server creation: "${data.name}" (${plan.name})`,
                    },
                });

                this.logger.log(`Deducted ₹${price} from user ${userId} for server creation`);
            }
        }

        // Free plan: absolutely free to create — credits are only consumed for renewal
        if (plan.type === PlanType.FREE) {
            // Enforce one free server per user
            const existingFreeServers = await this.prisma.server.count({
                where: { userId, isFreeServer: true, status: { not: ServerStatus.DELETED } },
            });
            if (existingFreeServers > 0) {
                throw new BadRequestException('You can only have one free server. Upgrade to a paid plan for more servers.');
            }
        }

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
                const price = plan.type === PlanType.CUSTOM
                    ? calculateCustomServerPrice({ ram, cpu, disk, pricePerGb: plan.pricePerGb || 50 })
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
            }
            throw new BadRequestException(plan.type !== PlanType.FREE
                ? 'Failed to create server in Pterodactyl. Your balance has been refunded.'
                : 'Failed to create server in Pterodactyl. Please try again.');
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
                    expiresAt: new Date(Date.now() + this.getRenewalDays(plan, plan.type === PlanType.FREE) * 24 * 60 * 60 * 1000),
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
                const refundPrice = plan.type === PlanType.CUSTOM
                    ? calculateCustomServerPrice({ ram, cpu, disk, pricePerGb: plan.pricePerGb || 50 })
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

        // Discord log for new server
        try {
            const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
            await this.discord.logServerCreation(u?.name || u?.email || userId, data.name);
        } catch { /* best effort */ }

        // Auto-create Cloudflare DNS subdomain (if enabled)
        try {
            const alloc = pteroServer.relationships?.allocations?.data?.[0]?.attributes;
            if (alloc?.ip) {
                const subdomain = await this.cloudflare.createServerSubdomain(
                    data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 32),
                    alloc.ip,
                    alloc.port,
                );
                if (subdomain) {
                    this.logger.log(`Created DNS subdomain for server ${server.id}`);
                }
            }
        } catch (e: any) {
            this.logger.warn(`Cloudflare DNS creation failed (non-critical): ${e.message}`);
        }

        return server;
    }

    // ─── Power Actions ───────────────────────────────────────

    async powerAction(userId: string, serverId: string, action: 'start' | 'stop' | 'restart' | 'kill') {
        const server = await this.findOwnedServer(userId, serverId);
        this.assertServerOperable(server, 'control power');
        return this.pterodactylClient.sendPowerAction(this.getClientServerRef(server), action);
    }

    // ─── Console ─────────────────────────────────────────────

    async getConsoleWebsocket(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        this.assertServerOperable(server, 'access the console');
        if (server.status === ServerStatus.INSTALLING) throw new BadRequestException('Server is still installing. Please wait.');
        return this.pterodactylClient.getWebsocketCredentials(this.getClientServerRef(server));
    }

    async sendConsoleCommand(userId: string, serverId: string, command: string) {
        const server = await this.findOwnedServer(userId, serverId);
        this.assertServerOperable(server, 'send commands');
        if (server.status === ServerStatus.INSTALLING) throw new BadRequestException('Server is still installing. Please wait.');
        return this.pterodactylClient.sendCommand(this.getClientServerRef(server), command);
    }

    // ─── File Management ─────────────────────────────────────

    async listFiles(userId: string, serverId: string, directory = '/') {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.listFiles(this.getClientServerRef(server), directory);
    }

    async getFileContents(userId: string, serverId: string, file: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.getFileContents(this.getClientServerRef(server), file);
    }

    async writeFile(userId: string, serverId: string, file: string, content: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.writeFile(this.getClientServerRef(server), file, content);
    }

    async deleteFiles(userId: string, serverId: string, root: string, files: string[]) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.deleteFiles(this.getClientServerRef(server), root, files);
    }

    async getUploadUrl(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.uploadFileUrl(this.getClientServerRef(server));
    }

    // ─── Backups ─────────────────────────────────────────────

    async listBackups(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.listBackups(this.getClientServerRef(server));
    }

    async createBackup(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.createBackup(this.getClientServerRef(server));
    }

    // ─── Databases ───────────────────────────────────────────

    async listDatabases(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.listDatabases(this.getClientServerRef(server));
    }

    async createDatabase(userId: string, serverId: string, dbName: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.createDatabase(this.getClientServerRef(server), dbName, '%');
    }

    // ─── Network ─────────────────────────────────────────────

    async getNetwork(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.listAllocations(this.getClientServerRef(server));
    }

    // ─── Startup ─────────────────────────────────────────────

    async getStartup(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.getStartup(this.getClientServerRef(server));
    }

    async updateStartupVariable(userId: string, serverId: string, key: string, value: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.updateStartupVariable(this.getClientServerRef(server), key, value);
    }

    // ---------- Delete ----------
    async deleteServer(serverId: string) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (!server) throw new NotFoundException('Server not found');

        if (server.pteroServerId) {
            await this.pterodactyl.deleteServer(server.pteroServerId);
        }

        // Clean up Cloudflare DNS records
        try {
            const subdomain = server.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 32);
            await this.cloudflare.deleteServerSubdomain(subdomain);
        } catch (e: any) {
            this.logger.warn(`Cloudflare DNS cleanup failed for server ${serverId}: ${e.message}`);
        }

        return this.prisma.server.update({
            where: { id: serverId },
            data: { status: ServerStatus.DELETED },
        });
    }

    // ─── Backup Operations ────────────────────────────────────

    async deleteBackup(userId: string, serverId: string, backupId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.deleteBackup(this.getClientServerRef(server), backupId);
    }

    async downloadBackup(userId: string, serverId: string, backupId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        const url = await this.pterodactylClient.downloadBackup(this.getClientServerRef(server), backupId);
        return { url };
    }

    // ─── Database Operations ─────────────────────────────────

    async deleteDatabaseById(userId: string, serverId: string, databaseId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.deleteDatabase(this.getClientServerRef(server), databaseId);
    }

    // ─── File Operations ─────────────────────────────────────

    async renameFile(userId: string, serverId: string, root: string, from: string, to: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.renameFile(this.getClientServerRef(server), root, from, to);
    }

    async createDirectory(userId: string, serverId: string, root: string, name: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.createDirectory(this.getClientServerRef(server), root, name);
    }

    // ─── Server Reinstall ────────────────────────────────────

    async reinstallServer(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.reinstall(this.getClientServerRef(server));
    }

    // ─── Renewal Cost ────────────────────────────────────────

    async getServerRenewalCost(userId: string, serverId: string): Promise<RenewalInfo> {
        const server = await this.prisma.server.findFirst({
            where: { id: serverId, userId, status: { not: ServerStatus.DELETED } },
            include: { plan: true },
        });
        if (!server) throw new NotFoundException('Server not found');

        const renewalDays = this.getRenewalDays(server.plan, server.isFreeServer);
        const base = { renewalDays, expiresAt: server.expiresAt, serverName: server.name };

        if (server.isFreeServer) {
            return { ...base, price: 0, isFreeServer: true };
        }

        if (!server.plan) {
            return { ...base, price: 0, isFreeServer: false };
        }

        const price = this.calculateRenewalPrice(server.plan, server);
        return { ...base, price, isFreeServer: false };
    }

    // ─── Manual Server Renewal ────────────────────────────────

    async renewServer(userId: string, serverId: string) {
        const server = await this.prisma.server.findFirst({
            where: { id: serverId, userId, status: { not: ServerStatus.DELETED } },
            include: { plan: true },
        });
        if (!server) throw new NotFoundException('Server not found');

        const renewalDays = this.getRenewalDays(server.plan, server.isFreeServer);

        // Free servers renewal via credits
        if (server.isFreeServer) {
            const credit = await this.prisma.credit.findUnique({ where: { userId } });
            if (!credit || credit.amount < 1) {
                throw new BadRequestException('You need at least 1 credit to renew a free server. Earn credits by watching ads.');
            }
            await this.prisma.credit.update({
                where: { userId },
                data: { amount: { decrement: 1 } },
            });

            const currentExpiry = server.expiresAt?.getTime() || Date.now();
            const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + renewalDays * 24 * 60 * 60 * 1000);

            // Unsuspend if suspended
            if (server.status === ServerStatus.SUSPENDED && server.pteroServerId) {
                try {
                    await this.pterodactyl.unsuspendServer(server.pteroServerId);
                } catch (e: any) {
                    this.logger.error(`Failed to unsuspend server ${server.pteroServerId}: ${e.message}`);
                }
            }

            const updated = await this.prisma.server.update({
                where: { id: server.id },
                data: { status: ServerStatus.ACTIVE, expiresAt: newExpiry, renewalNotified: false },
            });

            this.logger.log(`Free server ${server.id} renewed with credits for ${renewalDays} days until ${newExpiry.toISOString()}`);
            return updated;
        }

        // Paid servers
        const { price } = await this.getServerRenewalCost(userId, serverId);
        if (price <= 0) throw new BadRequestException('This server has no renewal cost');

        // Deduct balance atomically
        const deducted = await this.prisma.$transaction(async (tx) => {
            const balance = await tx.balance.findUnique({ where: { userId } });
            if (!balance || balance.amount < price) return false;
            await tx.balance.update({
                where: { userId },
                data: { amount: { decrement: price } },
            });
            await tx.balanceTransaction.create({
                data: {
                    userId,
                    amount: -price,
                    type: 'RENEWAL',
                    description: `Renewal for server "${server.name}"`,
                    relatedId: server.id,
                },
            });
            return true;
        });

        if (!deducted) {
            throw new BadRequestException(
                `Insufficient balance. Renewal costs ₹${price} but you only have insufficient funds. Please add balance first.`,
            );
        }

        const currentExpiry = server.expiresAt?.getTime() || Date.now();
        const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + renewalDays * 24 * 60 * 60 * 1000);

        // Unsuspend if suspended
        if (server.status === ServerStatus.SUSPENDED && server.pteroServerId) {
            try {
                await this.pterodactyl.unsuspendServer(server.pteroServerId);
            } catch (e: any) {
                this.logger.error(`Failed to unsuspend server ${server.pteroServerId}: ${e.message}`);
            }
        }

        const updated = await this.prisma.server.update({
            where: { id: server.id },
            data: { status: ServerStatus.ACTIVE, expiresAt: newExpiry, renewalNotified: false },
        });

        // Record payment
        await this.prisma.payment.create({
            data: {
                userId,
                serverId: server.id,
                gateway: 'BALANCE',
                amount: price,
                status: 'COMPLETED',
                metadata: { type: 'manual_renewal' },
            },
        });

        this.logger.log(`Server ${server.id} renewed until ${newExpiry.toISOString()} (charged ₹${price})`);
        return updated;
    }

    // ─── File Compression & Utilities ─────────────────────────

    async compressFiles(userId: string, serverId: string, root: string, files: string[]) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.compressFiles(this.getClientServerRef(server), root, files);
    }

    async decompressFile(userId: string, serverId: string, root: string, file: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.decompressFile(this.getClientServerRef(server), root, file);
    }

    async getFileDownloadUrl(userId: string, serverId: string, file: string) {
        const server = await this.findOwnedServer(userId, serverId);
        const url = await this.pterodactylClient.getFileDownloadUrl(this.getClientServerRef(server), file);
        return { url };
    }

    async copyFile(userId: string, serverId: string, location: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.copyFile(this.getClientServerRef(server), location);
    }

    async chmodFiles(userId: string, serverId: string, root: string, files: { file: string; mode: string }[]) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.chmodFiles(this.getClientServerRef(server), root, files);
    }

    async pullFile(userId: string, serverId: string, url: string, directory: string, filename?: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.pullFile(this.getClientServerRef(server), url, directory, filename);
    }

    // ─── Backup Advanced Operations ───────────────────────────

    async restoreBackup(userId: string, serverId: string, backupId: string, truncate = false) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.restoreBackup(this.getClientServerRef(server), backupId, truncate);
    }

    async toggleBackupLock(userId: string, serverId: string, backupId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.toggleBackupLock(this.getClientServerRef(server), backupId);
    }

    // ─── Database Advanced Operations ─────────────────────────

    async rotateDatabasePassword(userId: string, serverId: string, databaseId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.rotateDatabasePassword(this.getClientServerRef(server), databaseId);
    }

    // ─── Server Settings ─────────────────────────────────────

    async renameServer(userId: string, serverId: string, name: string) {
        const server = await this.findOwnedServer(userId, serverId);
        const renamed = await this.pterodactylClient.renameServer(this.getClientServerRef(server), name);
        if (!renamed) throw new BadRequestException('Failed to rename server on Pterodactyl');

        await this.prisma.server.update({ where: { id: serverId }, data: { name } });
        return { success: true, name };
    }

    async changeDockerImage(userId: string, serverId: string, dockerImage: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.changeDockerImage(this.getClientServerRef(server), dockerImage);
    }

    // ─── Schedules ───────────────────────────────────────────

    async listSchedules(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.listSchedules(this.getClientServerRef(server));
    }

    async getSchedule(userId: string, serverId: string, scheduleId: number) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.getSchedule(this.getClientServerRef(server), scheduleId);
    }

    async createSchedule(userId: string, serverId: string, schedule: {
        name: string; is_active: boolean; minute: string; hour: string;
        day_of_week: string; day_of_month: string; month: string;
    }) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.createSchedule(this.getClientServerRef(server), schedule);
    }

    async updateSchedule(userId: string, serverId: string, scheduleId: number, schedule: {
        name: string; is_active: boolean; minute: string; hour: string;
        day_of_week: string; day_of_month: string; month: string;
    }) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.updateSchedule(this.getClientServerRef(server), scheduleId, schedule);
    }

    async deleteSchedule(userId: string, serverId: string, scheduleId: number) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.deleteSchedule(this.getClientServerRef(server), scheduleId);
    }

    async executeSchedule(userId: string, serverId: string, scheduleId: number) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.executeSchedule(this.getClientServerRef(server), scheduleId);
    }

    async createScheduleTask(userId: string, serverId: string, scheduleId: number, task: {
        action: 'command' | 'power' | 'backup'; payload: string;
        time_offset: number; continue_on_failure?: boolean;
    }) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.createScheduleTask(this.getClientServerRef(server), scheduleId, task);
    }

    async updateScheduleTask(userId: string, serverId: string, scheduleId: number, taskId: number, task: {
        action: 'command' | 'power' | 'backup'; payload: string;
        time_offset: number; continue_on_failure?: boolean;
    }) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.updateScheduleTask(this.getClientServerRef(server), scheduleId, taskId, task);
    }

    async deleteScheduleTask(userId: string, serverId: string, scheduleId: number, taskId: number) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.deleteScheduleTask(this.getClientServerRef(server), scheduleId, taskId);
    }

    // ─── Activity Log ────────────────────────────────────────
    async getActivityLog(userId: string, serverId: string) {
        const server = await this.findOwnedServer(userId, serverId);
        return this.pterodactylClient.getActivityLog(this.getClientServerRef(server));
    }
}
