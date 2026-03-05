import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServersService } from '../servers/servers.service';

@Controller('plugins')
@UseGuards(JwtAuthGuard)
export class PluginsController {
    constructor(
        private pluginsService: PluginsService,
        private serversService: ServersService,
    ) { }

    private async verifyOwnership(user: any, uuid: string) {
        await this.serversService.verifyOwnershipByUuid(user.id, uuid);
    }

    @Get(':serverUuid/detect')
    async detect(@CurrentUser() user: any, @Param('serverUuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.detectServerSoftware(uuid);
    }

    @Get(':serverUuid/installed')
    async getInstalled(@CurrentUser() user: any, @Param('serverUuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.getInstalledPlugins(uuid);
    }

    @Get(':serverUuid/check-updates')
    async checkUpdates(@CurrentUser() user: any, @Param('serverUuid') uuid: string) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.checkPluginUpdates(uuid);
    }

    @Delete(':serverUuid/remove/:fileName')
    async remove(@CurrentUser() user: any, @Param('serverUuid') uuid: string, @Param('fileName') fileName: string) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.removePlugin(uuid, fileName);
    }

    // --- Modrinth (search is public, no ownership needed) ---
    @Get('modrinth/search')
    searchModrinth(
        @Query('query') query: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('project_type') projectType?: 'plugin' | 'mod',
        @Query('loaders') loaders?: string,
    ) {
        const parsedLoaders = loaders ? JSON.parse(loaders) as string[] : undefined;
        return this.pluginsService.searchModrinth(query, {
            limit: parseInt(limit || '20'),
            offset: parseInt(offset || '0'),
            projectType: projectType || 'mod',
            loaders: parsedLoaders,
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
    async installModrinth(
        @CurrentUser() user: any,
        @Param('serverUuid') uuid: string,
        @Body() body: { projectId: string; versionId: string },
    ) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.installFromModrinth(uuid, body.projectId, body.versionId);
    }

    // --- Spiget (search is public, no ownership needed) ---
    @Get('spiget/search')
    searchSpiget(@Query('query') query: string, @Query('page') page?: string) {
        return this.pluginsService.searchSpiget(query, parseInt(page || '1'));
    }

    @Get('spiget/resource/:id')
    getSpigetResource(@Param('id') id: string) {
        return this.pluginsService.getSpigetResource(parseInt(id));
    }

    @Get('spiget/resource/:id/versions')
    getSpigetVersions(@Param('id') id: string) {
        return this.pluginsService.getSpigetResourceVersions(parseInt(id));
    }

    @Post(':serverUuid/spiget/install')
    async installSpiget(@CurrentUser() user: any, @Param('serverUuid') uuid: string, @Body('resourceId') resourceId: number) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.installFromSpiget(uuid, resourceId);
    }
}
