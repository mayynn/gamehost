import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('plugins')
@UseGuards(JwtAuthGuard)
export class PluginsController {
    constructor(private pluginsService: PluginsService) { }

    @Get(':serverUuid/detect')
    detect(@Param('serverUuid') uuid: string) {
        return this.pluginsService.detectServerSoftware(uuid);
    }

    @Get(':serverUuid/installed')
    getInstalled(@Param('serverUuid') uuid: string) {
        return this.pluginsService.getInstalledPlugins(uuid);
    }

    @Delete(':serverUuid/remove/:fileName')
    remove(@Param('serverUuid') uuid: string, @Param('fileName') fileName: string) {
        return this.pluginsService.removePlugin(uuid, fileName);
    }

    // --- Modrinth ---
    @Get('modrinth/search')
    searchModrinth(@Query('query') query: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
        return this.pluginsService.searchModrinth(query, {
            limit: parseInt(limit || '20'),
            offset: parseInt(offset || '0'),
        });
    }

    @Get('modrinth/project/:id')
    getModrinthProject(@Param('id') id: string) {
        return this.pluginsService.getModrinthProject(id);
    }

    @Get('modrinth/project/:id/versions')
    getModrinthVersions(
        @Param('id') id: string,
        @Query('loaders') loaders?: string,
        @Query('game_versions') gameVersions?: string,
    ) {
        return this.pluginsService.getModrinthVersions(
            id,
            loaders ? JSON.parse(loaders) : undefined,
            gameVersions ? JSON.parse(gameVersions) : undefined,
        );
    }

    @Post(':serverUuid/modrinth/install')
    installModrinth(
        @Param('serverUuid') uuid: string,
        @Body() body: { projectId: string; versionId: string },
    ) {
        return this.pluginsService.installFromModrinth(uuid, body.projectId, body.versionId);
    }

    // --- Spiget ---
    @Get('spiget/search')
    searchSpiget(@Query('query') query: string, @Query('page') page?: string) {
        return this.pluginsService.searchSpiget(query, parseInt(page || '1'));
    }

    @Get('spiget/resource/:id')
    getSpigetResource(@Param('id') id: string) {
        return this.pluginsService.getSpigetResource(parseInt(id));
    }

    @Post(':serverUuid/spiget/install')
    installSpiget(@Param('serverUuid') uuid: string, @Body('resourceId') resourceId: number) {
        return this.pluginsService.installFromSpiget(uuid, resourceId);
    }
}
