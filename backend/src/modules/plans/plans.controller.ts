import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('plans')
export class PlansController {
    constructor(private plansService: PlansService) { }

    @Get()
    getPlans() {
        return this.plansService.getActivePlans();
    }

    @Get('eggs')
    @UseGuards(JwtAuthGuard)
    getEggs() {
        return this.plansService.getAvailableEggs();
    }

    @Get('nodes')
    @UseGuards(JwtAuthGuard)
    getNodes() {
        return this.plansService.getAvailableNodes();
    }

    @Get(':id')
    getPlan(@Param('id') id: string) {
        return this.plansService.getPlanById(id);
    }

    @Post('calculate')
    @UseGuards(JwtAuthGuard)
    async calculatePrice(@Body() body: { planId: string; ram: number; cpu: number; disk: number }) {
        const plan = await this.plansService.getPlanById(body.planId);
        if (!plan) return { price: 0, ram: body.ram, cpu: body.cpu, disk: body.disk };
        const result = this.plansService.calculateCustomPrice(plan, body.ram, body.cpu, body.disk);
        return {
            price: result.price,
            ram: result.ram,
            cpu: result.cpu,
            disk: result.disk,
            limits: {
                minRam: plan.minRam || 512,
                maxRam: plan.maxRam || 16384,
                minCpu: plan.minCpu || 50,
                maxCpu: plan.maxCpu || 800,
                minDisk: plan.minDisk || 1024,
                maxDisk: plan.maxDisk || 102400,
                maxBackups: plan.maxBackups || plan.backups,
                maxPorts: plan.maxPorts || plan.ports,
            },
        };
    }

    @Get(':id/limits')
    async getPlanLimits(@Param('id') id: string) {
        const plan = await this.plansService.getPlanById(id);
        if (!plan) return null;
        return {
            minRam: plan.minRam || 512,
            maxRam: plan.maxRam || 16384,
            minCpu: plan.minCpu || 50,
            maxCpu: plan.maxCpu || 800,
            minDisk: plan.minDisk || 1024,
            maxDisk: plan.maxDisk || 102400,
            maxBackups: plan.maxBackups || plan.backups,
            maxPorts: plan.maxPorts || plan.ports,
            pricePerGb: plan.pricePerGb || 50,
        };
    }
}
