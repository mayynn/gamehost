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
    calculatePrice(@Body() body: { planId: string; ram: number; cpu: number; disk: number }) {
        return this.plansService.getPlanById(body.planId).then((plan) => {
            if (!plan) return { price: 0 };
            return { price: this.plansService.calculateCustomPrice(plan, body.ram, body.cpu, body.disk) };
        });
    }
}
