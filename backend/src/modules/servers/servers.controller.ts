import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException,
} from '@nestjs/common';
import { ServersService } from './servers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateServerDto } from './dto/create-server.dto';
import { PowerActionDto } from './dto/power-action.dto';

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServersController {
    constructor(private serversService: ServersService) { }

    @Get()
    getMyServers(@CurrentUser() user: any) {
        return this.serversService.getUserServers(user.id);
    }

    @Get(':id')
    getServer(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.getServer(user.id, id);
    }

    @Post()
    createServer(@CurrentUser() user: any, @Body() body: CreateServerDto) {
        return this.serversService.provisionServer(user.id, body);
    }

    @Delete(':id')
    async deleteServer(@CurrentUser() user: any, @Param('id') id: string) {
        // Verify ownership before deleting
        await this.serversService.getServer(user.id, id);
        return this.serversService.deleteServer(id);
    }

    @Post(':id/power')
    powerAction(@CurrentUser() user: any, @Param('id') id: string, @Body() body: PowerActionDto) {
        return this.serversService.powerAction(user.id, id, body.signal);
    }

    @Get(':id/console')
    getConsole(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.getConsoleWebsocket(user.id, id);
    }

    @Post(':id/command')
    sendCommand(@CurrentUser() user: any, @Param('id') id: string, @Body('command') command: string) {
        if (!command || typeof command !== 'string') throw new BadRequestException('Command is required');
        return this.serversService.sendConsoleCommand(user.id, id, command);
    }

    @Get(':id/files')
    listFiles(@CurrentUser() user: any, @Param('id') id: string, @Query('dir') dir = '/') {
        return this.serversService.listFiles(user.id, id, dir);
    }

    @Get(':id/files/contents')
    getFileContents(@CurrentUser() user: any, @Param('id') id: string, @Query('file') file: string) {
        return this.serversService.getFileContents(user.id, id, file);
    }

    @Post(':id/files/write')
    writeFile(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { file: string; content: string }) {
        return this.serversService.writeFile(user.id, id, body.file, body.content);
    }

    @Post(':id/files/delete')
    deleteFiles(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { root: string; files: string[] }) {
        return this.serversService.deleteFiles(user.id, id, body.root, body.files);
    }

    @Get(':id/files/upload')
    getUploadUrl(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.getUploadUrl(user.id, id);
    }

    @Get(':id/backups')
    listBackups(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.listBackups(user.id, id);
    }

    @Post(':id/backups')
    createBackup(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.createBackup(user.id, id);
    }

    @Get(':id/databases')
    listDatabases(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.listDatabases(user.id, id);
    }

    @Post(':id/databases')
    createDatabase(@CurrentUser() user: any, @Param('id') id: string, @Body('name') name: string) {
        return this.serversService.createDatabase(user.id, id, name);
    }

    @Get(':id/network')
    getNetwork(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.getNetwork(user.id, id);
    }

    @Get(':id/startup')
    getStartup(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.getStartup(user.id, id);
    }

    @Post(':id/startup')
    updateStartup(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { key: string; value: string }) {
        return this.serversService.updateStartupVariable(user.id, id, body.key, body.value);
    }

    @Delete(':id/backups/:backupId')
    deleteBackup(@CurrentUser() user: any, @Param('id') id: string, @Param('backupId') backupId: string) {
        return this.serversService.deleteBackup(user.id, id, backupId);
    }

    @Get(':id/backups/:backupId/download')
    downloadBackup(@CurrentUser() user: any, @Param('id') id: string, @Param('backupId') backupId: string) {
        return this.serversService.downloadBackup(user.id, id, backupId);
    }

    @Delete(':id/databases/:dbId')
    deleteDatabase(@CurrentUser() user: any, @Param('id') id: string, @Param('dbId') dbId: string) {
        return this.serversService.deleteDatabase2(user.id, id, dbId);
    }

    @Put(':id/files/rename')
    renameFile(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { root: string; from: string; to: string }) {
        return this.serversService.renameFile(user.id, id, body.root, body.from, body.to);
    }

    @Post(':id/files/folder')
    createDirectory(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { root: string; name: string }) {
        return this.serversService.createDirectory(user.id, id, body.root, body.name);
    }

    @Post(':id/reinstall')
    reinstall(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.reinstallServer(user.id, id);
    }
}
