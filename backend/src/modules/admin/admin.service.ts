import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import { BillingService } from '../billing/billing.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { VpsService } from '../vps/vps.service';
import { ServerStatus } from '@prisma/client';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private prisma: PrismaService,
        private usersService: UsersService,
        private plansService: PlansService,
        private billingService: BillingService,
        private pterodactyl: PterodactylService,
        private vpsService: VpsService,
    ) { }

    // ---------- Dashboard Stats ----------
    async getDashboardStats() {
        const [userCount, serverCount, activeServers, totalRevenue, recentPayments] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.server.count(),
            this.prisma.server.count({ where: { status: 'ACTIVE' } }),
            this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
            this.prisma.payment.findMany({
                where: { status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { user: true },
            }),
        ]);

        return {
            users: userCount,
            servers: serverCount,
            activeServers,
            revenue: totalRevenue._sum.amount || 0,
            recentPayments,
        };
    }

    // ---------- Users ----------
    async getUsers(page = 1, limit = 20) {
        return this.usersService.getAllUsers(page, limit);
    }

    async setUserRole(userId: string, role: 'USER' | 'ADMIN') {
        return this.usersService.setRole(userId, role);
    }

    async deleteUser(userId: string) {
        return this.usersService.deleteUser(userId);
    }

    async getUserDetails(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                servers: true,
                payments: { orderBy: { createdAt: 'desc' }, take: 20 },
                balance: true,
                credits: true,
                pterodactylAccount: true,
                _count: { select: { servers: true, payments: true } },
            },
        });
    }

    // ---------- Servers ----------
    async getAllServers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [servers, total] = await Promise.all([
            this.prisma.server.findMany({
                skip,
                take: limit,
                include: { user: true, plan: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.server.count(),
        ]);
        return { servers, total, page, totalPages: Math.ceil(total / limit) };
    }

    async suspendServer(serverId: string) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (server?.pteroServerId) {
            await this.pterodactyl.suspendServer(server.pteroServerId);
        }
        return this.prisma.server.update({
            where: { id: serverId },
            data: { status: ServerStatus.SUSPENDED },
        });
    }

    async unsuspendServer(serverId: string) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (server?.pteroServerId) {
            await this.pterodactyl.unsuspendServer(server.pteroServerId);
        }
        return this.prisma.server.update({
            where: { id: serverId },
            data: { status: ServerStatus.ACTIVE },
        });
    }

    // ---------- Plans ----------
    async createPlan(data: any) { return this.plansService.createPlan(data); }
    async updatePlan(id: string, data: any) { return this.plansService.updatePlan(id, data); }
    async deletePlan(id: string) { return this.plansService.deletePlan(id); }

    // ---------- UPI Approvals ----------
    async getPendingUpi() { return this.billingService.getPendingUpiPayments(); }
    async approveUpi(id: string, adminId: string) { return this.billingService.approveUpiPayment(id, adminId); }
    async rejectUpi(id: string) { return this.billingService.rejectUpiPayment(id); }

    // ---------- Settings ----------
    async getSettings() {
        const settings = await this.prisma.adminSetting.findMany();
        return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    }

    async updateSetting(key: string, value: string) {
        return this.prisma.adminSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }

    async bulkUpdateSettings(settings: Record<string, string>) {
        const ops = Object.entries(settings).map(([key, value]) =>
            this.prisma.adminSetting.upsert({
                where: { key },
                update: { value },
                create: { key, value },
            }),
        );
        return this.prisma.$transaction(ops);
    }

    // ---------- Audit Logs ----------
    async getAuditLogs(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                skip,
                take: limit,
                include: { user: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count(),
        ]);
        return { logs, total, page, totalPages: Math.ceil(total / limit) };
    }

    async createAuditLog(userId: string, action: string, details?: any, ipAddress?: string) {
        return this.prisma.auditLog.create({
            data: { userId, action, details, ipAddress },
        });
    }

    // ---------- Pterodactyl Sync ----------
    async getNodes() { return this.pterodactyl.getNodes(); }
    async getEggs() { return this.plansService.getAvailableEggs(); }

    // ---------- Alt Account Detection ----------
    async getAltAccounts(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        // Find IPs used by multiple users
        const sharedIps = await this.prisma.$queryRaw<Array<{ ipAddress: string; userCount: bigint }>>`
            SELECT "ipAddress", COUNT(DISTINCT "userId") as "userCount"
            FROM "LoginSession"
            GROUP BY "ipAddress"
            HAVING COUNT(DISTINCT "userId") > 1
            ORDER BY COUNT(DISTINCT "userId") DESC
            LIMIT ${limit} OFFSET ${skip}
        `;

        const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM (
                SELECT "ipAddress"
                FROM "LoginSession"
                GROUP BY "ipAddress"
                HAVING COUNT(DISTINCT "userId") > 1
            ) sub
        `;

        const total = Number(totalResult[0]?.count || 0);

        // For each shared IP, get the users
        const altGroups = await Promise.all(
            sharedIps.map(async (ip) => {
                const sessions = await this.prisma.loginSession.findMany({
                    where: { ipAddress: ip.ipAddress },
                    select: { userId: true, userAgent: true, createdAt: true },
                    distinct: ['userId'],
                    orderBy: { createdAt: 'desc' },
                });

                const users = await this.prisma.user.findMany({
                    where: { id: { in: sessions.map((s) => s.userId) } },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatar: true,
                        provider: true,
                        role: true,
                        createdAt: true,
                        lastLoginAt: true,
                        lastLoginIp: true,
                        _count: { select: { servers: true } },
                    },
                });

                return {
                    ipAddress: ip.ipAddress,
                    userCount: Number(ip.userCount),
                    users,
                    lastSeen: sessions[0]?.createdAt,
                };
            }),
        );

        return {
            altGroups,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserAlts(userId: string) {
        // Get all IPs this user has logged in from
        const userSessions = await this.prisma.loginSession.findMany({
            where: { userId },
            select: { ipAddress: true },
            distinct: ['ipAddress'],
        });

        const userIps = userSessions.map((s) => s.ipAddress);

        if (userIps.length === 0) return { alts: [], sharedIps: [] };

        // Find other users who share any of these IPs
        const sharedSessions = await this.prisma.loginSession.findMany({
            where: {
                ipAddress: { in: userIps },
                userId: { not: userId },
            },
            select: { userId: true, ipAddress: true, createdAt: true },
            distinct: ['userId'],
        });

        const altUserIds = [...new Set(sharedSessions.map((s) => s.userId))];

        const alts = altUserIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: altUserIds } },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,
                    provider: true,
                    role: true,
                    createdAt: true,
                    lastLoginAt: true,
                    lastLoginIp: true,
                    _count: { select: { servers: true, payments: true } },
                },
            })
            : [];

        return {
            alts,
            sharedIps: userIps.filter((ip) =>
                sharedSessions.some((s) => s.ipAddress === ip),
            ),
        };
    }

    async deleteAltAccounts(userIds: string[], adminId: string) {
        const results: Array<{ id: string; email: string; deleted: boolean; error?: string }> = [];

        for (const userId of userIds) {
            try {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: { pterodactylAccount: true },
                });

                if (!user) {
                    results.push({ id: userId, email: 'unknown', deleted: false, error: 'User not found' });
                    continue;
                }

                if (user.role === 'ADMIN') {
                    results.push({ id: userId, email: user.email, deleted: false, error: 'Cannot delete admin accounts' });
                    continue;
                }

                // Delete Pterodactyl account if exists
                if (user.pterodactylAccount) {
                    try {
                        await this.pterodactyl.deleteUser(user.pterodactylAccount.pteroUserId);
                    } catch {
                        this.logger.warn(`Failed to delete Pterodactyl account for alt: ${user.email}`);
                    }
                }

                await this.prisma.user.delete({ where: { id: userId } });

                await this.createAuditLog(adminId, 'DELETE_ALT_ACCOUNT', {
                    deletedUserId: userId,
                    deletedEmail: user.email,
                });

                results.push({ id: userId, email: user.email, deleted: true });
            } catch (error) {
                results.push({ id: userId, email: 'unknown', deleted: false, error: error.message });
            }
        }

        return { results };
    }

    async getLinkedAccounts(userId: string) {
        return this.prisma.linkedAccount.findMany({
            where: { userId },
            orderBy: { linkedAt: 'asc' },
        });
    }

    // ---------- VPS Plan Management ----------

    /** Sync plans from Datalix API into local DB (upserts by datalixPlanName) */
    async syncVpsPlansFromDatalix() {
        const datalixPlans = await this.vpsService.fetchDatalixPlans();
        if (!datalixPlans.length) return { synced: 0, message: 'No plans returned from Datalix (is DATALIX_ENABLED=true?)' };

        const results: any[] = [];
        for (const dp of datalixPlans) {
            const planName = dp.name || dp.plan || dp.id?.toString();
            if (!planName) continue;

            const existing = await this.prisma.vpsPlan.findUnique({ where: { datalixPlanName: planName } });

            const specs = {
                ram: dp.ram || dp.memory || 0,
                cpu: dp.cpu || dp.cores || dp.vcpu || 0,
                disk: dp.disk || dp.storage || 0,
                bandwidth: dp.bandwidth || dp.traffic || 0,
                costPrice: dp.price || dp.price_monthly || dp.priceMonth || 0,
            };

            if (existing) {
                // Update specs + cost from Datalix, keep admin's sell price & name
                const updated = await this.prisma.vpsPlan.update({
                    where: { id: existing.id },
                    data: { ...specs },
                });
                results.push({ plan: planName, action: 'updated', id: updated.id });
            } else {
                // New plan: default sell price = cost * 1.5 (50% markup)
                const created = await this.prisma.vpsPlan.create({
                    data: {
                        datalixPlanName: planName,
                        displayName: dp.display_name || dp.label || planName,
                        description: dp.description || null,
                        ...specs,
                        sellPrice: Math.ceil((specs.costPrice || 1) * 1.5),
                    },
                });
                results.push({ plan: planName, action: 'created', id: created.id });
            }
        }

        return { synced: results.length, results };
    }

    /** Get all VPS plans (admin view with cost + sell prices) */
    async getVpsPlans() {
        return this.prisma.vpsPlan.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { vpsInstances: true } } },
        });
    }

    /** Update a VPS plan (admin sets sell price, display name, active status) */
    async updateVpsPlan(id: string, data: {
        displayName?: string;
        description?: string;
        sellPrice?: number;
        isActive?: boolean;
        sortOrder?: number;
    }) {
        return this.prisma.vpsPlan.update({
            where: { id },
            data,
        });
    }

    /** Delete a VPS plan (only if no active VPS instances) */
    async deleteVpsPlan(id: string) {
        const activeCount = await this.prisma.vps.count({
            where: { vpsPlanId: id, status: { not: 'TERMINATED' } },
        });
        if (activeCount > 0) {
            throw new ConflictException(`Cannot delete plan with ${activeCount} active VPS instances`);
        }
        return this.prisma.vpsPlan.delete({ where: { id } });
    }

    /** VPS revenue stats */
    async getVpsStats() {
        const [totalVps, activeVps, plans] = await Promise.all([
            this.prisma.vps.count({ where: { status: { not: 'TERMINATED' } } }),
            this.prisma.vps.count({ where: { status: 'ACTIVE' } }),
            this.prisma.vpsPlan.findMany({
                include: {
                    vpsInstances: {
                        where: { status: { not: 'TERMINATED' } },
                        select: { costPrice: true, sellPrice: true },
                    },
                },
            }),
        ]);

        let monthlyRevenue = 0;
        let monthlyCost = 0;
        for (const plan of plans) {
            for (const vps of plan.vpsInstances) {
                monthlyRevenue += vps.sellPrice || 0;
                monthlyCost += vps.costPrice || 0;
            }
        }

        return {
            totalVps,
            activeVps,
            monthlyRevenue,
            monthlyCost,
            monthlyProfit: monthlyRevenue - monthlyCost,
        };
    }
}
