import { Injectable, Logger } from '@nestjs/common';
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
    calculateCustomPrice(plan: any, ram: number, cpu: number, disk: number): number {
        const pricePerGb = plan.pricePerGb || 50; // per GB RAM per month
        const ramGb = ram / 1024;
        const cpuFactor = cpu / 100;
        const diskGb = disk / 1024;

        return Math.ceil(ramGb * pricePerGb + diskGb * (pricePerGb * 0.1) + cpuFactor * (pricePerGb * 0.5));
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
