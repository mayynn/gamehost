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
        const [userCount, serverCount, activeServers, suspendedServers, expiredServers, totalRevenue, recentPayments, pendingUpi, totalBalance] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.server.count({ where: { status: { not: 'DELETED' } } }),
            this.prisma.server.count({ where: { status: 'ACTIVE' } }),
            this.prisma.server.count({ where: { status: 'SUSPENDED' } }),
            this.prisma.server.count({ where: { status: { in: ['EXPIRED', 'DELETED'] } } }),
            this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
            this.prisma.payment.findMany({
                where: { status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { user: true },
            }),
            this.prisma.upiPayment.count({ where: { status: 'PENDING' } }),
            this.prisma.balance.aggregate({ _sum: { amount: true } }),
        ]);

        return {
            users: userCount,
            servers: serverCount,
            activeServers,
            suspendedServers,
            expiredServers,
            revenue: totalRevenue._sum.amount || 0,
            recentPayments,
            pendingUpi,
            totalBalanceAcrossUsers: totalBalance._sum.amount || 0,
        };
    }

    // ---------- Users ----------
    async getUsers(page = 1, limit = 20) {
        return this.usersService.getAllUsers(page, limit);
    }

    async setUserRole(userId: string, role: 'USER' | 'ADMIN', adminId?: string) {
        const result = await this.usersService.setRole(userId, role);
        if (adminId) await this.createAuditLog(adminId, 'SET_USER_ROLE', { targetUserId: userId, newRole: role });
        return result;
    }

    async deleteUser(userId: string, adminId?: string) {
        // Prevent admin from deleting themselves
        if (adminId && userId === adminId) {
            throw new ConflictException('You cannot delete your own account');
        }

        // Clean up Pterodactyl account before deleting
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { pterodactylAccount: true, servers: true, vpsInstances: true },
        });

        // Terminate all VPS instances on Datalix
        if (user?.vpsInstances?.length) {
            for (const vps of user.vpsInstances) {
                if (vps.status !== 'TERMINATED') {
                    try { await this.vpsService.terminateVps(vps.id); } catch { /* best effort */ }
                }
            }
        }

        // Delete all Pterodactyl servers + account
        if (user?.pterodactylAccount) {
            // Delete all user's servers from Pterodactyl first
            for (const server of user.servers) {
                if (server.pteroServerId) {
                    try { await this.pterodactyl.deleteServer(server.pteroServerId); } catch { /* best effort */ }
                }
            }
            try { await this.pterodactyl.deleteUser(user.pterodactylAccount.pteroUserId); } catch { /* best effort */ }
        }
        const result = await this.usersService.deleteUser(userId);
        if (adminId) await this.createAuditLog(adminId, 'DELETE_USER', { deletedUserId: userId, email: user?.email });
        return result;
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

    async suspendServer(serverId: string, adminId?: string) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (server?.pteroServerId) {
            await this.pterodactyl.suspendServer(server.pteroServerId);
        }
        const result = await this.prisma.server.update({
            where: { id: serverId },
            data: { status: ServerStatus.SUSPENDED },
        });
        if (adminId) await this.createAuditLog(adminId, 'SUSPEND_SERVER', { serverId, serverName: server?.name });
        return result;
    }

    async unsuspendServer(serverId: string, adminId?: string) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (server?.pteroServerId) {
            await this.pterodactyl.unsuspendServer(server.pteroServerId);
        }

        // Extend expiry by 30 days from now to prevent immediate re-suspension by cron
        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const result = await this.prisma.server.update({
            where: { id: serverId },
            data: { status: ServerStatus.ACTIVE, expiresAt: newExpiry, renewalNotified: false },
        });
        if (adminId) await this.createAuditLog(adminId, 'UNSUSPEND_SERVER', { serverId, serverName: server?.name, newExpiry: newExpiry.toISOString() });
        return result;
    }

    // ---------- Plans ----------
    async createPlan(data: any, adminId?: string) {
        const result = await this.plansService.createPlan(data);
        if (adminId) await this.createAuditLog(adminId, 'CREATE_PLAN', { planId: result.id, planName: data.name });
        return result;
    }
    async updatePlan(id: string, data: any, adminId?: string) {
        const result = await this.plansService.updatePlan(id, data);
        if (adminId) await this.createAuditLog(adminId, 'UPDATE_PLAN', { planId: id, changes: data });
        return result;
    }
    async deletePlan(id: string, adminId?: string) {
        const result = await this.plansService.deletePlan(id);
        if (adminId) await this.createAuditLog(adminId, 'DELETE_PLAN', { planId: id });
        return result;
    }

    // ---------- UPI Approvals ----------
    async getPendingUpi() { return this.billingService.getPendingUpiPayments(); }
    async approveUpi(id: string, adminId: string) {
        const result = await this.billingService.approveUpiPayment(id, adminId);
        await this.createAuditLog(adminId, 'APPROVE_UPI', { upiPaymentId: id });
        return result;
    }
    async rejectUpi(id: string, adminId?: string) {
        const result = await this.billingService.rejectUpiPayment(id);
        if (adminId) await this.createAuditLog(adminId, 'REJECT_UPI', { upiPaymentId: id });
        return result;
    }

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
        if (!datalixPlans.length) return { synced: 0, message: 'No plans returned from Datalix (is DATALIX_ENABLED=true and DATALIX_KVM_LINE set?)' };

        const results: any[] = [];
        for (const dp of datalixPlans) {
            // Datalix KVMLineResponse fields: id (UUID), displayname, cores, memory (MB),
            // disk (MB), traffic, price, uplink, line, ghzbase, ghzturbo, active, ...
            const planId = dp.id;
            if (!planId) continue;

            // Skip inactive plans on Datalix side
            if (dp.active === 0) continue;

            const existing = await this.prisma.vpsPlan.findUnique({ where: { datalixPlanName: planId } });

            const specs = {
                ram: dp.memory || 0,              // Memory in MB
                cpu: dp.cores || 0,               // vCPU cores
                disk: Math.round((dp.disk || 0) / 1024), // Datalix sends disk in MB, convert to GB
                bandwidth: dp.traffic || 0,       // Traffic units
                costPrice: dp.price || 0,         // What Datalix charges (EUR)
            };

            if (existing) {
                // Update specs + cost from Datalix, keep admin's sell price & display name
                const updated = await this.prisma.vpsPlan.update({
                    where: { id: existing.id },
                    data: { ...specs },
                });
                results.push({ plan: dp.displayname || planId, action: 'updated', id: updated.id });
            } else {
                // New plan: default sell price = cost * 1.5 (50% markup)
                const created = await this.prisma.vpsPlan.create({
                    data: {
                        datalixPlanName: planId,       // Datalix packet UUID
                        displayName: dp.displayname || `KVM ${specs.cpu}C/${specs.ram}MB`,
                        description: dp.ghzbase ? `${dp.cores} Cores @ ${dp.ghzbase} GHz (Turbo: ${dp.ghzturbo} GHz)` : null,
                        ...specs,
                        sellPrice: Math.ceil((specs.costPrice || 1) * 1.5),
                    },
                });
                results.push({ plan: dp.displayname || planId, action: 'created', id: created.id });
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
