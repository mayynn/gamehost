import { Controller, Get, Post, Delete, Param, Body, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VpsService } from './vps.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionVpsDto, VpsActionDto, ReinstallVpsDto } from '../../common/dto';

@Controller('vps')
@UseGuards(JwtAuthGuard)
export class VpsController {
    constructor(
        private vpsService: VpsService,
        private prisma: PrismaService,
    ) { }

    private async verifyVpsOwnership(userId: string, vpsId: string) {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps) throw new NotFoundException('VPS not found');
        if (vps.userId !== userId) throw new ForbiddenException('You do not own this VPS');
        return vps;
    }

    @Get('plans')
    getPlans() { return this.vpsService.getPlans(); }

    /** Get available OS images for a specific plan (fetches from Datalix API) */
    @Get('plans/:planId/os')
    getOsForPlan(@Param('planId') planId: string) {
        return this.vpsService.getOsForPlan(planId);
    }

    @Get()
    getMyVps(@CurrentUser() user: any) { return this.vpsService.getUserVps(user.id); }

    @Post()
    provision(@CurrentUser() user: any, @Body() body: ProvisionVpsDto) {
        return this.vpsService.provisionVps(user.id, body);
    }

    @Get(':id')
    async getStatus(@CurrentUser() user: any, @Param('id') id: string) {
        await this.verifyVpsOwnership(user.id, id);
        return this.vpsService.getVpsStatus(id);
    }

    @Post(':id/control')
    async control(@CurrentUser() user: any, @Param('id') id: string, @Body() body: VpsActionDto) {
        await this.verifyVpsOwnership(user.id, id);
        return this.vpsService.controlVps(id, body.action);
    }

    @Post(':id/reinstall')
    async reinstall(@CurrentUser() user: any, @Param('id') id: string, @Body() body: ReinstallVpsDto) {
        await this.verifyVpsOwnership(user.id, id);
        return this.vpsService.reinstallVps(id, body.os);
    }

    @Post(':id/renew')
    async renew(@CurrentUser() user: any, @Param('id') id: string) {
        await this.verifyVpsOwnership(user.id, id);
        return this.vpsService.renewVps(user.id, id);
    }

    @Delete(':id')
    async terminate(@CurrentUser() user: any, @Param('id') id: string) {
        await this.verifyVpsOwnership(user.id, id);
        return this.vpsService.terminateVps(id);
    }
}
