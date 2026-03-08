import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { ServersService } from '../servers/servers.service';
import { InstallModrinthDto, InstallSpigetDto, InstallSpigetVersionDto, UpdatePluginDto, UpdateAllPluginsDto } from '../../common/dto';

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
        @Query('project_type') projectType?: string,
        @Query('loaders') loaders?: string,
        @Query('categories') categories?: string,
        @Query('game_versions') gameVersions?: string,
        @Query('index') index?: string,
    ) {
        const parsedLoaders = loaders ? JSON.parse(loaders) as string[] : undefined;
        const parsedCategories = categories ? JSON.parse(categories) as string[] : undefined;
        const parsedGameVersions = gameVersions ? JSON.parse(gameVersions) as string[] : undefined;
        return this.pluginsService.searchModrinth(query || '', {
            limit: parseInt(limit || '20'),
            offset: parseInt(offset || '0'),
            projectType: projectType || 'plugin',
            loaders: parsedLoaders,
            categories: parsedCategories,
            gameVersions: parsedGameVersions,
            index,
        });
    }

    @Get('modrinth/tags')
    getModrinthTags() {
        return this.pluginsService.getModrinthTags();
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
        @Body() body: InstallModrinthDto,
    ) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.installFromModrinth(uuid, body.projectId, body.versionId);
    }

    // --- Spiget (search is public, no ownership needed) ---
    @Get('spiget/search')
    searchSpiget(
        @Query('query') query: string,
        @Query('page') page?: string,
        @Query('size') size?: string,
        @Query('categoryId') categoryId?: string,
        @Query('sort') sort?: string,
    ) {
        const parsedCategoryId = categoryId ? parseInt(categoryId) : undefined;
        return this.pluginsService.searchSpiget(query, parseInt(page || '1'), parseInt(size || '20'), parsedCategoryId, sort || '-downloads');
    }

    @Get('spiget/popular')
    getSpigetPopular(@Query('page') page?: string, @Query('size') size?: string) {
        return this.pluginsService.listSpigetPopular(parseInt(page || '1'), parseInt(size || '20'));
    }

    @Get('spiget/new')
    getSpigetNew(@Query('page') page?: string, @Query('size') size?: string) {
        return this.pluginsService.listSpigetNew(parseInt(page || '1'), parseInt(size || '20'));
    }

    @Get('spiget/updated')
    getSpigetUpdated(@Query('page') page?: string, @Query('size') size?: string) {
        return this.pluginsService.listSpigetUpdated(parseInt(page || '1'), parseInt(size || '20'));
    }

    @Get('spiget/categories')
    getSpigetCategories() {
        return this.pluginsService.getSpigetCategories();
    }

    @Get('spiget/categories/:id/resources')
    getSpigetCategoryResources(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('size') size?: string,
    ) {
        return this.pluginsService.getSpigetCategoryResources(parseInt(id), parseInt(page || '1'), parseInt(size || '20'));
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
    async installSpiget(@CurrentUser() user: any, @Param('serverUuid') uuid: string, @Body() body: InstallSpigetDto) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.installFromSpiget(uuid, body.resourceId);
    }

    @Post(':serverUuid/spiget/install-version')
    async installSpigetVersion(
        @CurrentUser() user: any,
        @Param('serverUuid') uuid: string,
        @Body() body: InstallSpigetVersionDto,
    ) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.installFromSpigetVersion(uuid, body.resourceId, body.versionId);
    }

    @Post(':serverUuid/update-one')
    async updateOne(
        @CurrentUser() user: any,
        @Param('serverUuid') uuid: string,
        @Body() body: UpdatePluginDto,
    ) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.updateOnePlugin(uuid, body.fileName);
    }

    @Post(':serverUuid/update-all')
    async updateAll(
        @CurrentUser() user: any,
        @Param('serverUuid') uuid: string,
        @Body() body: UpdateAllPluginsDto,
    ) {
        await this.verifyOwnership(user, uuid);
        return this.pluginsService.updateAllPlugins(uuid, body.source);
    }
}
