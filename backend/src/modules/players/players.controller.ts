import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PlayersService } from './players.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
    constructor(private playersService: PlayersService) { }

    @Get(':uuid/detect')
    isMinecraft(@Param('uuid') uuid: string) {
        return this.playersService.isMinecraftServer(uuid);
    }

    @Get(':uuid/online')
    getOnline(@Param('uuid') uuid: string) {
        return this.playersService.getOnlinePlayers(uuid);
    }

    @Get(':uuid/whitelist')
    getWhitelist(@Param('uuid') uuid: string) {
        return this.playersService.getWhitelist(uuid);
    }

    @Post(':uuid/whitelist')
    addWhitelist(@Param('uuid') uuid: string, @Body('player') player: string) {
        return this.playersService.addToWhitelist(uuid, player);
    }

    @Delete(':uuid/whitelist/:player')
    removeWhitelist(@Param('uuid') uuid: string, @Param('player') player: string) {
        return this.playersService.removeFromWhitelist(uuid, player);
    }

    @Get(':uuid/banned')
    getBanned(@Param('uuid') uuid: string) {
        return this.playersService.getBannedPlayers(uuid);
    }

    @Post(':uuid/ban')
    ban(@Param('uuid') uuid: string, @Body() body: { player: string; reason?: string }) {
        return this.playersService.banPlayer(uuid, body.player, body.reason);
    }

    @Post(':uuid/unban')
    unban(@Param('uuid') uuid: string, @Body('player') player: string) {
        return this.playersService.unbanPlayer(uuid, player);
    }

    @Get(':uuid/ops')
    getOps(@Param('uuid') uuid: string) {
        return this.playersService.getOps(uuid);
    }

    @Post(':uuid/op')
    op(@Param('uuid') uuid: string, @Body('player') player: string) {
        return this.playersService.opPlayer(uuid, player);
    }

    @Post(':uuid/deop')
    deop(@Param('uuid') uuid: string, @Body('player') player: string) {
        return this.playersService.deopPlayer(uuid, player);
    }

    @Post(':uuid/kick')
    kick(@Param('uuid') uuid: string, @Body() body: { player: string; reason?: string }) {
        return this.playersService.kickPlayer(uuid, body.player, body.reason);
    }
}
