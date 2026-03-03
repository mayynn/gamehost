import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';
import { AuthService } from '../auth/auth.service';
import { ServerStatus } from '@prisma/client';

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

        // Enrich with live status from Pterodactyl
        const enriched = await Promise.all(
            servers.map(async (server) => {
                let resources = null;
                if (server.pteroUuid) {
                    resources = await this.pterodactylClient.getServerResources(server.pteroUuid);
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
            pteroData = await this.pterodactylClient.getServer(server.pteroUuid);
            resources = await this.pterodactylClient.getServerResources(server.pteroUuid);
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
            include: { pterodactylAccount: true },
        });

        if (!user) throw new BadRequestException('User not found');
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

        // Get plan for resource limits
        const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
        if (!plan) throw new BadRequestException('Invalid plan');

        const ram = data.ram || plan.ram;
        const cpu = data.cpu || plan.cpu;
        const disk = data.disk || plan.disk;

        // Build environment variables from egg defaults
        const environment: Record<string, string> = {};
        if (egg.relationships?.variables?.data) {
            for (const v of egg.relationships.variables.data) {
                const attr = v.attributes;
                environment[attr.env_variable] = data.environment?.[attr.env_variable] || attr.default_value || '';
            }
        }

        // Determine node/allocation
        let deploy: any = undefined;
        let allocation: any = undefined;
        if (data.nodeId) {
            // Get a free allocation from the specified node
            const allocations = await this.pterodactyl.getNodeAllocations(data.nodeId);
            const freeAlloc = allocations?.data?.find((a: any) => !a.attributes.assigned);
            if (!freeAlloc) throw new BadRequestException('No free allocations on selected node');
            allocation = { default: freeAlloc.attributes.id };
        } else {
            // Dynamic: let Pterodactyl auto-deploy
            const locations = await this.pterodactyl.getLocations();
            deploy = {
                locations: locations.map((l: any) => l.id),
                dedicated_ip: false,
                port_range: [],
            };
        }

        // Create server in Pterodactyl
        const pteroServer = await this.pterodactyl.createServer({
            name: data.name,
            user: updatedUser.pterodactylId,
            egg: data.eggId,
            docker_image: egg.docker_image,
            startup: egg.startup,
            environment,
            limits: { memory: ram, swap: 0, disk, io: 500, cpu },
            feature_limits: { databases: plan.databases, backups: plan.backups, allocations: plan.ports },
            deploy,
            allocation,
        });

        if (!pteroServer) throw new BadRequestException('Failed to create server in Pterodactyl');

        // Save to DB
        const server = await this.prisma.server.create({
            data: {
                userId,
                planId: data.planId,
                name: data.name,
                pteroServerId: pteroServer.id,
                pteroUuid: pteroServer.uuid,
                pteroIdentifier: pteroServer.identifier,
                status: ServerStatus.ACTIVE,
                isFreeServer: plan.type === 'FREE',
                ram,
                cpu,
                disk,
                backups: plan.backups,
                ports: plan.ports,
                databases: plan.databases,
                expiresAt: plan.type === 'FREE'
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        this.logger.log(`Server ${server.id} provisioned for user ${userId}`);
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
