import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { PlanType } from '@prisma/client';

@Injectable()
export class PlansService {
    private readonly logger = new Logger(PlansService.name);

    constructor(
        private prisma: PrismaService,
        private pterodactyl: PterodactylService,
    ) { }

    // ---------- CRUD ----------
    async getActivePlans() {
        return this.prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async getPlanById(id: string) {
        return this.prisma.plan.findUnique({ where: { id } });
    }

    async createPlan(data: any) {
        return this.prisma.plan.create({ data });
    }

    async updatePlan(id: string, data: any) {
        return this.prisma.plan.update({ where: { id }, data });
    }

    async deletePlan(id: string) {
        return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
    }

    // ---------- Custom Builder Price Calculation ----------
    calculateCustomPrice(plan: any, ram: number, cpu: number, disk: number): {
        price: number;
        ram: number;
        cpu: number;
        disk: number;
    } {
        // Clamp values within plan's custom builder limits
        const clampedRam = Math.min(Math.max(ram, plan.minRam || 512), plan.maxRam || 16384);
        const clampedCpu = Math.min(Math.max(cpu, plan.minCpu || 50), plan.maxCpu || 800);
        const clampedDisk = Math.min(Math.max(disk, plan.minDisk || 1024), plan.maxDisk || 102400);

        const pricePerGb = plan.pricePerGb || 50;
        const ramGb = clampedRam / 1024;
        const cpuFactor = clampedCpu / 100;
        const diskGb = clampedDisk / 1024;

        const price = Math.ceil(ramGb * pricePerGb + diskGb * (pricePerGb * 0.1) + cpuFactor * (pricePerGb * 0.5));

        return { price, ram: clampedRam, cpu: clampedCpu, disk: clampedDisk };
    }

    // ---------- Validate Custom Builder Limits ----------
    validateCustomLimits(plan: any, ram: number, cpu: number, disk: number): void {
        if (plan.type !== 'CUSTOM') {
            throw new BadRequestException('Plan does not support custom configuration');
        }
        if (plan.minRam && ram < plan.minRam) throw new BadRequestException(`RAM must be at least ${plan.minRam}MB`);
        if (plan.maxRam && ram > plan.maxRam) throw new BadRequestException(`RAM cannot exceed ${plan.maxRam}MB`);
        if (plan.minCpu && cpu < plan.minCpu) throw new BadRequestException(`CPU must be at least ${plan.minCpu}%`);
        if (plan.maxCpu && cpu > plan.maxCpu) throw new BadRequestException(`CPU cannot exceed ${plan.maxCpu}%`);
        if (plan.minDisk && disk < plan.minDisk) throw new BadRequestException(`Disk must be at least ${plan.minDisk}MB`);
        if (plan.maxDisk && disk > plan.maxDisk) throw new BadRequestException(`Disk cannot exceed ${plan.maxDisk}MB`);
    }

    // ---------- Egg Sync ----------
    async syncEggs() {
        try {
            const eggs = await this.pterodactyl.getAllEggs();
            this.logger.log(`Synced ${eggs.length} eggs from Pterodactyl`);
            return eggs;
        } catch (e) {
            this.logger.error(`Failed to sync eggs: ${e.message}`);
            return [];
        }
    }

    @Cron(CronExpression.EVERY_HOUR)
    async autoSyncEggs() {
        await this.syncEggs();
    }

    // ---------- Available Eggs & Nodes ----------
    async getAvailableEggs() {
        return this.pterodactyl.getAllEggs();
    }

    async getAvailableNodes() {
        return this.pterodactyl.getNodes();
    }
}
