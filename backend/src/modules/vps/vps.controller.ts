import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { VpsService } from './vps.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('vps')
@UseGuards(JwtAuthGuard)
export class VpsController {
    constructor(private vpsService: VpsService) { }

    @Get('plans')
    getPlans() { return this.vpsService.getPlans(); }

    @Get()
    getMyVps(@CurrentUser() user: any) { return this.vpsService.getUserVps(user.id); }

    @Post()
    provision(@CurrentUser() user: any, @Body() body: any) {
        return this.vpsService.provisionVps(user.id, body);
    }

    @Get(':id')
    getStatus(@Param('id') id: string) { return this.vpsService.getVpsStatus(id); }

    @Post(':id/control')
    control(@Param('id') id: string, @Body('action') action: any) {
        return this.vpsService.controlVps(id, action);
    }

    @Delete(':id')
    terminate(@Param('id') id: string) { return this.vpsService.terminateVps(id); }
}
