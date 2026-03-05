import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { VpsStatus, PaymentGateway, PaymentStatus } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class VpsService {
    private readonly logger = new Logger(VpsService.name);
    private api: AxiosInstance;
    private enabled: boolean;
    private kvmLine: string;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        this.enabled = config.get('DATALIX_ENABLED') === 'true';
        this.kvmLine = config.get('DATALIX_KVM_LINE', 'intelxeon');

        // Datalix API authenticates via ?token= query parameter
        // Real base URL: https://backend.datalix.de/v1
        const apiKey = config.get('DATALIX_API_KEY', '');
        this.api = axios.create({
            baseURL: config.get('DATALIX_API_URL', 'https://backend.datalix.de/v1'),
            params: { token: apiKey },
            headers: { Accept: 'application/json' },
            timeout: 30000,
        });
    }

    /** Helper to send form-data POST requests (Datalix requires multipart/form-data) */
    private async postForm(url: string, fields: Record<string, string | number>): Promise<any> {
        const form = new FormData();
        for (const [key, val] of Object.entries(fields)) {
            form.append(key, String(val));
        }
        const { data } = await this.api.post(url, form, {
            headers: form.getHeaders(),
        });
        return data;
    }

    // ========== RAW DATALIX API ==========

    /**
     * Fetch KVM plans from Datalix for the configured line.
     * Endpoint: GET /kvmserver/line/{kvmline}
     * Returns: array of { id, line, cores, memory, disk, uplink, ipv4, ipv6,
     *           active, price, displayname, ghzbase, ghzturbo, traffic, discount, ... }
     */
    async fetchDatalixPlans(): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const { data } = await this.api.get(`/kvmserver/line/${this.kvmLine}`);
            // Response is an array of KVMLineResponse objects
            return Array.isArray(data) ? data : [];
        } catch (e) {
            this.logger.error(`Failed to fetch Datalix plans: ${e.message}`);
            return [];
        }
    }

    /**
     * Fetch available OS images for a Datalix packet (plan).
     * Endpoint: GET /kvmserver/packet/{packetid}/os
     * Returns: array of { id, displayname, proxmoxid, type }
     */
    async fetchOsForPacket(datalixPacketId: string): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const { data } = await this.api.get(`/kvmserver/packet/${datalixPacketId}/os`);
            return Array.isArray(data) ? data : [];
        } catch (e) {
            this.logger.error(`Failed to fetch OS list for packet ${datalixPacketId}: ${e.message}`);
            return [];
        }
    }

    /**
     * Fetch OS images available for a local VPS plan.
     * Looks up the plan's Datalix packet ID and queries the API.
     */
    async getOsForPlan(planId: string): Promise<any[]> {
        const plan = await this.prisma.vpsPlan.findUnique({ where: { id: planId } });
        if (!plan?.datalixPlanName) return [];
        const osList = await this.fetchOsForPacket(plan.datalixPlanName);
        return osList.map((o) => ({
            id: o.id,
            name: o.displayname,
            type: o.type,
        }));
    }

    /**
     * Fetch OS images available for an existing Datalix service (for reinstall).
     * Endpoint: GET /service/{serviceid}/os
     */
    async getOsForService(datalixServiceId: string): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const { data } = await this.api.get(`/service/${datalixServiceId}/os`);
            return Array.isArray(data) ? data.map((o: any) => ({
                id: o.id,
                name: o.displayname,
                type: o.type,
            })) : [];
        } catch (e) {
            this.logger.error(`Failed to fetch OS for service ${datalixServiceId}: ${e.message}`);
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
                sellPrice: true,
                datalixPlanName: true,
            },
        });

        return plans.map((p) => ({
            id: p.id,
            name: p.displayName,
            description: p.description,
            ram: p.ram,
            cpu: p.cpu,
            disk: p.disk,
            bandwidth: p.bandwidth,
            price: p.sellPrice,
            datalixPacketId: p.datalixPlanName,  // Frontend needs this to fetch OS
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
        os: string;      // Datalix OS UUID
        hostname: string;
    }) {
        if (!this.enabled) throw new BadRequestException('VPS hosting is not enabled');

        // 1. Look up local plan (contains Datalix packet UUID in datalixPlanName)
        const plan = await this.prisma.vpsPlan.findUnique({ where: { id: data.planId } });
        if (!plan) throw new BadRequestException('Invalid VPS plan');
        if (!plan.isActive) throw new BadRequestException('This plan is no longer available');
        if (!plan.datalixPlanName) throw new BadRequestException('Plan not linked to Datalix');

        // 2. Check & deduct user balance atomically
        const deducted = await this.prisma.$transaction(async (tx) => {
            const balance = await tx.balance.findUnique({ where: { userId } });
            const userBalance = balance?.amount || 0;
            if (userBalance < plan.sellPrice) return false;
            await tx.balance.update({
                where: { userId },
                data: { amount: { decrement: plan.sellPrice } },
            });
            return true;
        });

        if (!deducted) {
            throw new BadRequestException(`Insufficient balance. Required: ₹${plan.sellPrice}`);
        }

        // 3. Record payment
        await this.prisma.payment.create({
            data: {
                userId,
                gateway: PaymentGateway.BALANCE,
                amount: plan.sellPrice,
                status: PaymentStatus.COMPLETED,
                metadata: { type: 'vps_provision', planId: plan.id, planName: plan.datalixPlanName },
            },
        });

        // 4. Provision on Datalix via reseller order API
        // POST /reseller/order/kvm/{kvmPacketId} with form-data: os, ipcount, trafficcount, days
        try {
            const result = await this.postForm(`/reseller/order/kvm/${plan.datalixPlanName}`, {
                os: data.os,
                ipcount: 1,
                trafficcount: 1,
                days: 30,
            });

            const datalixServiceId = result.id;
            if (!datalixServiceId) {
                throw new Error('No service ID returned from Datalix');
            }

            // 5. Fetch IP address from Datalix (may not be available immediately)
            let ip: string | null = null;
            try {
                const ipData = await this.fetchServiceIp(datalixServiceId);
                ip = ipData.ipv4?.[0]?.ip || null;
            } catch { /* IP might not be assigned yet during provisioning */ }

            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const vps = await this.prisma.vps.create({
                data: {
                    userId,
                    vpsPlanId: plan.id,
                    datalixId: datalixServiceId,
                    planName: plan.displayName,
                    status: VpsStatus.PROVISIONING,
                    hostname: data.hostname,
                    os: data.os,
                    ip,
                    ram: plan.ram,
                    cpu: plan.cpu,
                    disk: plan.disk,
                    bandwidth: plan.bandwidth,
                    costPrice: plan.costPrice,
                    sellPrice: plan.sellPrice,
                    expiresAt,
                },
            });

            this.logger.log(`VPS provisioned: ${vps.id} (Datalix service: ${datalixServiceId}) for user ${userId}`);
            return vps;
        } catch (e) {
            // Refund on failed provision
            await this.prisma.balance.update({
                where: { userId },
                data: { amount: { increment: plan.sellPrice } },
            });
            const errMsg = e?.response?.data?.message || e.message || 'Unknown error';
            this.logger.error(`VPS provisioning failed, refunded ₹${plan.sellPrice}: ${errMsg}`);
            throw new BadRequestException('VPS provisioning failed. Your balance has been refunded.');
        }
    }

    // ========== DATALIX SERVICE QUERIES ==========

    /**
     * GET /service/{serviceid} → { display, product, service }
     * product contains: cores, memory, disk, hostname, mac, os, status, password, user, ip info
     * service contains: id, created_on, expire_at, price, productdisplay
     */
    private async fetchServiceInfo(datalixId: string): Promise<any> {
        const { data } = await this.api.get(`/service/${datalixId}`);
        return data;
    }

    /**
     * GET /service/{serviceid}/status → { status: "running"|"stopped"|... }
     */
    private async fetchServiceStatus(datalixId: string): Promise<string> {
        const { data } = await this.api.get(`/service/${datalixId}/status`);
        return data.status || 'unknown';
    }

    /**
     * GET /service/{serviceid}/ip → { ipv4: [{ip, gw, netmask, rdns}], ipv6: [{...}] }
     */
    private async fetchServiceIp(datalixId: string): Promise<{ ipv4: any[]; ipv6: any[] }> {
        const { data } = await this.api.get(`/service/${datalixId}/ip`);
        return { ipv4: data.ipv4 || [], ipv6: data.ipv6 || [] };
    }

    // ========== VPS STATUS & LIVE DATA ==========

    async getVpsStatus(vpsId: string) {
        const vps = await this.prisma.vps.findUnique({
            where: { id: vpsId },
            include: { vpsPlan: { select: { displayName: true, sellPrice: true } } },
        });
        if (!vps?.datalixId || !this.enabled) return vps;

        try {
            // Fetch live status and IP from Datalix
            const [statusStr, ipData] = await Promise.all([
                this.fetchServiceStatus(vps.datalixId),
                this.fetchServiceIp(vps.datalixId).catch(() => ({ ipv4: [], ipv6: [] })),
            ]);

            const liveIp = ipData.ipv4?.[0]?.ip || null;
            const newStatus = statusStr === 'running' ? VpsStatus.ACTIVE
                : statusStr === 'stopped' ? VpsStatus.SUSPENDED
                : vps.status;

            // Update local record if changed
            if (newStatus !== vps.status || (liveIp && liveIp !== vps.ip)) {
                await this.prisma.vps.update({
                    where: { id: vpsId },
                    data: {
                        status: newStatus,
                        ...(liveIp && liveIp !== vps.ip ? { ip: liveIp } : {}),
                    },
                });
            }

            return {
                ...vps,
                status: newStatus,
                ip: liveIp || vps.ip,
                ipv4: ipData.ipv4,
                ipv6: ipData.ipv6,
            };
        } catch (e) {
            this.logger.warn(`Failed to fetch live status for VPS ${vpsId}: ${e.message}`);
            return vps;
        }
    }

    // ========== POWER CONTROL ==========

    async controlVps(vpsId: string, action: 'start' | 'stop' | 'restart' | 'shutdown') {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) throw new BadRequestException('VPS not found or not linked to Datalix');

        if (vps.status === VpsStatus.SUSPENDED) {
            throw new BadRequestException('VPS is suspended. Please renew to use it.');
        }

        // Datalix power endpoints: POST /service/{serviceid}/{start|stop|restart|shutdown}
        const validActions = ['start', 'stop', 'restart', 'shutdown'];
        if (!validActions.includes(action)) {
            throw new BadRequestException(`Invalid action: ${action}`);
        }

        try {
            await this.api.post(`/service/${vps.datalixId}/${action}`);
            return { success: true, action };
        } catch (e) {
            const errMsg = e?.response?.data?.message || e.message;
            throw new BadRequestException(`VPS ${action} failed: ${errMsg}`);
        }
    }

    // ========== REINSTALL ==========

    async reinstallVps(vpsId: string, osId: string) {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) throw new BadRequestException('VPS not found');

        // POST /service/{serviceid}/reinstall with form-data: os (UUID)
        try {
            await this.postForm(`/service/${vps.datalixId}/reinstall`, { os: osId });
            await this.prisma.vps.update({
                where: { id: vpsId },
                data: { os: osId, status: VpsStatus.PROVISIONING },
            });
            return { success: true };
        } catch (e) {
            const errMsg = e?.response?.data?.message || e.message;
            throw new BadRequestException(`VPS reinstall failed: ${errMsg}`);
        }
    }

    // ========== TERMINATE ==========

    async terminateVps(vpsId: string) {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) throw new BadRequestException('VPS not found');

        // Datalix has no delete endpoint — services expire naturally.
        // We stop the server and mark it terminated locally.
        try {
            await this.api.post(`/service/${vps.datalixId}/stop`);
        } catch (e) {
            this.logger.warn(`Could not stop VPS on Datalix during termination: ${e.message}`);
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

        // Extend on Datalix first via reseller API
        // POST /reseller/extend/service/{serviceId} with form-data: { days: 30 }
        if (this.enabled && vps.datalixId) {
            try {
                await this.postForm(`/reseller/extend/service/${vps.datalixId}`, { days: 30 });
            } catch (e) {
                const errMsg = e?.response?.data?.message || e.message;
                this.logger.error(`Datalix extend failed for VPS ${vpsId}: ${errMsg}`);
                throw new BadRequestException('Failed to extend VPS on provider. Please try again.');
            }
        }

        // Deduct balance only after successful Datalix extension
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

            if (vps.expiresAt && vps.expiresAt <= now) {
                if (userBalance >= price && price > 0) {
                    try {
                        await this.renewVps(vps.userId, vps.id);
                        this.logger.log(`Auto-renewed VPS ${vps.id} for user ${vps.userId}`);
                    } catch (e) {
                        this.logger.error(`Auto-renewal failed for VPS ${vps.id}: ${e.message}`);
                    }
                } else {
                    await this.prisma.vps.update({
                        where: { id: vps.id },
                        data: { status: VpsStatus.SUSPENDED },
                    });
                    this.logger.warn(`VPS ${vps.id} suspended (expired, balance ₹${userBalance} < ₹${price})`);
                }
            }
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
