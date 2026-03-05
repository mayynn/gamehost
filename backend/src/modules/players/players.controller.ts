import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PlayersService } from './players.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServersService } from '../servers/servers.service';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
    constructor(
        private playersService: PlayersService,
        private serversService: ServersService,
    ) { }

    private async verifyOwnership(user: any, uuid: string) {
        await this.serversService.verifyOwnershipByUuid(user.id, uuid);
    }

    @Get(':uuid/detect')
    async isMinecraft(@CurrentUser() user: any, @Param('uuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.isMinecraftServer(uuid);
    }

    @Get(':uuid/online')
    async getOnline(@CurrentUser() user: any, @Param('uuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.getOnlinePlayers(uuid);
    }

    @Get(':uuid/whitelist')
    async getWhitelist(@CurrentUser() user: any, @Param('uuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.getWhitelist(uuid);
    }

    @Post(':uuid/whitelist')
    async addWhitelist(@CurrentUser() user: any, @Param('uuid') uuid: string, @Body('player') player: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.addToWhitelist(uuid, player);
    }

    @Delete(':uuid/whitelist/:player')
    async removeWhitelist(@CurrentUser() user: any, @Param('uuid') uuid: string, @Param('player') player: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.removeFromWhitelist(uuid, player);
    }

    @Get(':uuid/banned')
    async getBanned(@CurrentUser() user: any, @Param('uuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.getBannedPlayers(uuid);
    }

    @Post(':uuid/ban')
    async ban(@CurrentUser() user: any, @Param('uuid') uuid: string, @Body() body: { player: string; reason?: string }) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.banPlayer(uuid, body.player, body.reason);
    }

    @Post(':uuid/unban')
    async unban(@CurrentUser() user: any, @Param('uuid') uuid: string, @Body('player') player: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.unbanPlayer(uuid, player);
    }

    @Get(':uuid/ops')
    async getOps(@CurrentUser() user: any, @Param('uuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.getOps(uuid);
    }

    @Post(':uuid/op')
    async op(@CurrentUser() user: any, @Param('uuid') uuid: string, @Body('player') player: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.opPlayer(uuid, player);
    }

    @Post(':uuid/deop')
    async deop(@CurrentUser() user: any, @Param('uuid') uuid: string, @Body('player') player: string) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.deopPlayer(uuid, player);
    }

    @Post(':uuid/kick')
    async kick(@CurrentUser() user: any, @Param('uuid') uuid: string, @Body() body: { player: string; reason?: string }) {
        await this.verifyOwnership(user, uuid);
        return this.playersService.kickPlayer(uuid, body.player, body.reason);
    }
}
