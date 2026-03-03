import { Controller, Get, Post, Delete, Param, Body, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VpsService } from './vps.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

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

    @Get()
    getMyVps(@CurrentUser() user: any) { return this.vpsService.getUserVps(user.id); }

    @Post()
    provision(@CurrentUser() user: any, @Body() body: any) {
        return this.vpsService.provisionVps(user.id, body);
    }

    @Get(':id')
    async getStatus(@CurrentUser() user: any, @Param('id') id: string) {
        await this.verifyVpsOwnership(user.id, id);
        return this.vpsService.getVpsStatus(id);
    }

    @Post(':id/control')
    async control(@CurrentUser() user: any, @Param('id') id: string, @Body('action') action: any) {
        await this.verifyVpsOwnership(user.id, id);
        return this.vpsService.controlVps(id, action);
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
