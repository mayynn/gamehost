import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import { BillingService } from '../billing/billing.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private prisma: PrismaService,
        private usersService: UsersService,
        private plansService: PlansService,
        private billingService: BillingService,
        private pterodactyl: PterodactylService,
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
            data: { status: 'SUSPENDED' },
        });
    }

    async unsuspendServer(serverId: string) {
        const server = await this.prisma.server.findUnique({ where: { id: serverId } });
        if (server?.pteroServerId) {
            await this.pterodactyl.unsuspendServer(server.pteroServerId);
        }
        return this.prisma.server.update({
            where: { id: serverId },
            data: { status: 'ACTIVE' },
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
}
