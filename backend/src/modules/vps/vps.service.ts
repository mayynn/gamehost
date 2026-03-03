import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { VpsStatus, PaymentGateway, PaymentStatus } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class VpsService {
    private readonly logger = new Logger(VpsService.name);
    private api: AxiosInstance;
    private enabled: boolean;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        this.enabled = config.get('DATALIX_ENABLED') === 'true';
        this.api = axios.create({
            baseURL: config.get('DATALIX_API_URL', 'https://api.datalix.de/v1'),
            headers: {
                Authorization: `Bearer ${config.get('DATALIX_API_KEY', '')}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    // ========== RAW DATALIX API (admin-only, for syncing) ==========

    /** Fetch plans directly from Datalix API (raw cost data). Used by admin sync. */
    async fetchDatalixPlans(): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const { data } = await this.api.get('/plans');
            return data.data || data || [];
        } catch (e) {
            this.logger.error(`Failed to fetch Datalix plans: ${e.message}`);
            return [];
        }
    }

    // ========== LOCAL PLANS (customer-facing) ==========

    /** Get active plans from local DB with reseller prices (safe for public) */
    async getPlans(): Promise<any[]> {
        const plans = await this.prisma.vpsPlan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                displayName: true,
                description: true,
                ram: true,
                cpu: true,
                disk: true,
                bandwidth: true,
                sellPrice: true,      // Customer sees YOUR price
                // costPrice is NOT exposed — this is your real cost
                datalixPlanName: false,
            },
        });

        // Map for frontend compatibility
        return plans.map((p) => ({
            id: p.id,
            name: p.displayName,
            description: p.description,
            ram: p.ram,
            cpu: p.cpu,
            disk: p.disk,
            bandwidth: p.bandwidth,
            price: p.sellPrice,       // The price customer pays
        }));
    }

    // ========== USER VPS MANAGEMENT ==========

    async getUserVps(userId: string) {
        return this.prisma.vps.findMany({
            where: { userId, status: { not: VpsStatus.TERMINATED } },
            orderBy: { createdAt: 'desc' },
            include: { vpsPlan: { select: { displayName: true } } },
        });
    }

    async provisionVps(userId: string, data: {
        planId: string;
        os: string;
        hostname: string;
    }) {
        if (!this.enabled) throw new BadRequestException('VPS hosting is not enabled');

        // 1. Look up local plan
        const plan = await this.prisma.vpsPlan.findUnique({ where: { id: data.planId } });
        if (!plan) throw new BadRequestException('Invalid VPS plan');
        if (!plan.isActive) throw new BadRequestException('This plan is no longer available');

        // 2. Check & deduct user balance
        const balance = await this.prisma.balance.findUnique({ where: { userId } });
        const userBalance = balance?.amount || 0;
        if (userBalance < plan.sellPrice) {
            throw new BadRequestException(
                `Insufficient balance. Required: ₹${plan.sellPrice}, Available: ₹${userBalance.toFixed(2)}`,
            );
        }

        // 3. Deduct balance
        await this.prisma.balance.update({
            where: { userId },
            data: { amount: { decrement: plan.sellPrice } },
        });

        // 4. Record payment
        await this.prisma.payment.create({
            data: {
                userId,
                gateway: PaymentGateway.BALANCE,
                amount: plan.sellPrice,
                status: PaymentStatus.COMPLETED,
                metadata: { type: 'vps_provision', planId: plan.id, planName: plan.datalixPlanName },
            },
        });

        // 5. Provision on Datalix
        try {
            const { data: result } = await this.api.post('/servers', {
                plan: plan.datalixPlanName,
                os: data.os,
                hostname: data.hostname,
            });

            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

            const vps = await this.prisma.vps.create({
                data: {
                    userId,
                    vpsPlanId: plan.id,
                    datalixId: result.id?.toString(),
                    planName: plan.displayName,
                    status: VpsStatus.PROVISIONING,
                    hostname: data.hostname,
                    os: data.os,
                    ip: result.ip || null,
                    ram: plan.ram,
                    cpu: plan.cpu,
                    disk: plan.disk,
                    bandwidth: plan.bandwidth,
                    costPrice: plan.costPrice,
                    sellPrice: plan.sellPrice,
                    expiresAt,
                },
            });

            this.logger.log(`VPS provisioned: ${vps.id} for user ${userId} (plan: ${plan.displayName}, charged: ₹${plan.sellPrice})`);
            return vps;
        } catch (e) {
            // Refund on failed provision
            await this.prisma.balance.update({
                where: { userId },
                data: { amount: { increment: plan.sellPrice } },
            });
            this.logger.error(`VPS provisioning failed, refunded ₹${plan.sellPrice}: ${e.message}`);
            throw new BadRequestException('VPS provisioning failed. Your balance has been refunded.');
        }
    }

    async getVpsStatus(vpsId: string) {
        const vps = await this.prisma.vps.findUnique({
            where: { id: vpsId },
            include: { vpsPlan: { select: { displayName: true, sellPrice: true } } },
        });
        if (!vps?.datalixId) return vps;

        try {
            const { data } = await this.api.get(`/servers/${vps.datalixId}`);
            const newStatus = data.status === 'running' ? VpsStatus.ACTIVE
                : data.status === 'stopped' ? VpsStatus.SUSPENDED
                    : vps.status;

            if (newStatus !== vps.status || (data.ip && data.ip !== vps.ip)) {
                await this.prisma.vps.update({
                    where: { id: vpsId },
                    data: { status: newStatus, ip: data.ip || vps.ip },
                });
            }
            return { ...vps, status: newStatus, ip: data.ip || vps.ip, liveData: data };
        } catch (e) {
            return vps;
        }
    }

    async controlVps(vpsId: string, action: 'start' | 'stop' | 'restart' | 'reinstall') {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) throw new BadRequestException('VPS not found');

        if (vps.status === VpsStatus.SUSPENDED) {
            throw new BadRequestException('VPS is suspended. Please renew to use it.');
        }

        try {
            await this.api.post(`/servers/${vps.datalixId}/${action}`);
            return { success: true };
        } catch (e) {
            throw new BadRequestException(`VPS ${action} failed: ${e.message}`);
        }
    }

    async terminateVps(vpsId: string) {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) throw new BadRequestException('VPS not found');

        try {
            await this.api.delete(`/servers/${vps.datalixId}`);
        } catch (e) {
            this.logger.error(`VPS termination API failed: ${e.message}`);
        }

        return this.prisma.vps.update({
            where: { id: vpsId },
            data: { status: VpsStatus.TERMINATED },
        });
    }

    // ========== MANUAL RENEWAL ==========

    async renewVps(userId: string, vpsId: string) {
        const vps = await this.prisma.vps.findFirst({
            where: { id: vpsId, userId },
        });
        if (!vps) throw new BadRequestException('VPS not found');

        const price = vps.sellPrice || 0;
        if (price <= 0) throw new BadRequestException('No pricing set for this VPS');

        // Check balance
        const balance = await this.prisma.balance.findUnique({ where: { userId } });
        const userBalance = balance?.amount || 0;
        if (userBalance < price) {
            throw new BadRequestException(
                `Insufficient balance. Required: ₹${price}, Available: ₹${userBalance.toFixed(2)}`,
            );
        }

        // Deduct & extend
        await this.prisma.balance.update({
            where: { userId },
            data: { amount: { decrement: price } },
        });

        const currentExpiry = vps.expiresAt?.getTime() || Date.now();
        const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + 30 * 24 * 60 * 60 * 1000);

        const updated = await this.prisma.vps.update({
            where: { id: vpsId },
            data: { expiresAt: newExpiry, status: VpsStatus.ACTIVE },
        });

        // Record payment
        await this.prisma.payment.create({
            data: {
                userId,
                gateway: PaymentGateway.BALANCE,
                amount: price,
                status: PaymentStatus.COMPLETED,
                metadata: { type: 'vps_renewal', vpsId },
            },
        });

        this.logger.log(`VPS ${vpsId} renewed until ${newExpiry.toISOString()} (charged ₹${price})`);
        return updated;
    }

    // ========== AUTO-BILLING CRON (runs daily) ==========

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async processVpsBilling() {
        const now = new Date();

        // Find VPS instances expiring in next 3 days that are still active
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const expiringVps = await this.prisma.vps.findMany({
            where: {
                status: VpsStatus.ACTIVE,
                expiresAt: { lte: threeDaysFromNow },
            },
            include: { user: { include: { balance: true } } },
        });

        for (const vps of expiringVps) {
            const price = vps.sellPrice || 0;
            const userBalance = vps.user?.balance?.amount || 0;

            // If expired, attempt auto-renewal or suspend
            if (vps.expiresAt && vps.expiresAt <= now) {
                if (userBalance >= price && price > 0) {
                    // Auto-renew from balance
                    try {
                        await this.renewVps(vps.userId, vps.id);
                        this.logger.log(`Auto-renewed VPS ${vps.id} for user ${vps.userId}`);
                    } catch (e) {
                        this.logger.error(`Auto-renewal failed for VPS ${vps.id}: ${e.message}`);
                    }
                } else {
                    // Suspend — insufficient balance
                    await this.prisma.vps.update({
                        where: { id: vps.id },
                        data: { status: VpsStatus.SUSPENDED },
                    });
                    this.logger.warn(`VPS ${vps.id} suspended (expired, balance ₹${userBalance} < ₹${price})`);
                }
            }
            // If expiring soon but not yet expired, just log (could send notification here)
        }

        // Terminate VPS suspended for > 7 days
        const terminateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const toTerminate = await this.prisma.vps.findMany({
            where: {
                status: VpsStatus.SUSPENDED,
                updatedAt: { lte: terminateThreshold },
            },
        });

        for (const vps of toTerminate) {
            try {
                await this.terminateVps(vps.id);
                this.logger.warn(`VPS ${vps.id} auto-terminated (suspended 7+ days)`);
            } catch (e) {
                this.logger.error(`Auto-terminate failed for VPS ${vps.id}: ${e.message}`);
            }
        }
    }
}
