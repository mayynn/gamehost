import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException,
} from '@nestjs/common';
import { ServersService } from './servers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { CreateServerDto } from './dto/create-server.dto';
import { PowerActionDto } from './dto/power-action.dto';
import {
    WriteFileDto, DeleteFilesDto, RenameFileDto, CreateDirectoryDto,
    CompressFilesDto, DecompressFileDto, CopyFileDto, PullFileDto, ChmodFilesDto,
    RenameServerDto, ChangeDockerImageDto, UpdateStartupDto, CreateDatabaseDto,
    CreateScheduleDto, CreateScheduleTaskDto, RestoreBackupDto, SendCommandDto,
} from '../../common/dto';
import { validateExternalUrl } from '../../common/utils/ssrf-guard';

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
    sendCommand(@CurrentUser() user: any, @Param('id') id: string, @Body() body: SendCommandDto) {
        return this.serversService.sendConsoleCommand(user.id, id, body.command);
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
    writeFile(@CurrentUser() user: any, @Param('id') id: string, @Body() body: WriteFileDto) {
        return this.serversService.writeFile(user.id, id, body.file, body.content);
    }

    @Post(':id/files/delete')
    deleteFiles(@CurrentUser() user: any, @Param('id') id: string, @Body() body: DeleteFilesDto) {
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
    createDatabase(@CurrentUser() user: any, @Param('id') id: string, @Body() body: CreateDatabaseDto) {
        return this.serversService.createDatabase(user.id, id, body.name);
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
    updateStartup(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateStartupDto) {
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
        return this.serversService.deleteDatabaseById(user.id, id, dbId);
    }

    @Put(':id/files/rename')
    renameFile(@CurrentUser() user: any, @Param('id') id: string, @Body() body: RenameFileDto) {
        return this.serversService.renameFile(user.id, id, body.root, body.from, body.to);
    }

    @Post(':id/files/folder')
    createDirectory(@CurrentUser() user: any, @Param('id') id: string, @Body() body: CreateDirectoryDto) {
        return this.serversService.createDirectory(user.id, id, body.root, body.name);
    }

    @Post(':id/reinstall')
    reinstall(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.reinstallServer(user.id, id);
    }

    @Get(':id/renewal-cost')
    getRenewalCost(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.getServerRenewalCost(user.id, id);
    }

    @Post(':id/renew')
    renewServer(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.renewServer(user.id, id);
    }

    // ========== FILE OPERATIONS (NEW) ==========

    @Post(':id/files/compress')
    compressFiles(@CurrentUser() user: any, @Param('id') id: string, @Body() body: CompressFilesDto) {
        return this.serversService.compressFiles(user.id, id, body.root, body.files);
    }

    @Post(':id/files/decompress')
    decompressFile(@CurrentUser() user: any, @Param('id') id: string, @Body() body: DecompressFileDto) {
        return this.serversService.decompressFile(user.id, id, body.root, body.file);
    }

    @Get(':id/files/download')
    getFileDownloadUrl(@CurrentUser() user: any, @Param('id') id: string, @Query('file') file: string) {
        if (!file) throw new BadRequestException('File path is required');
        return this.serversService.getFileDownloadUrl(user.id, id, file);
    }

    @Post(':id/files/copy')
    copyFile(@CurrentUser() user: any, @Param('id') id: string, @Body() body: CopyFileDto) {
        return this.serversService.copyFile(user.id, id, body.location);
    }

    @Post(':id/files/chmod')
    chmodFiles(@CurrentUser() user: any, @Param('id') id: string, @Body() body: ChmodFilesDto) {
        return this.serversService.chmodFiles(user.id, id, body.root, body.files);
    }

    @Post(':id/files/pull')
    pullFile(@CurrentUser() user: any, @Param('id') id: string, @Body() body: PullFileDto) {
        // SSRF protection — block requests to internal/private IP ranges
        validateExternalUrl(body.url);
        return this.serversService.pullFile(user.id, id, body.url, body.directory, body.filename);
    }

    // ========== BACKUP OPERATIONS (NEW) ==========

    @Post(':id/backups/:backupId/restore')
    restoreBackup(@CurrentUser() user: any, @Param('id') id: string, @Param('backupId') backupId: string, @Body() body: RestoreBackupDto) {
        return this.serversService.restoreBackup(user.id, id, backupId, body?.truncate);
    }

    @Post(':id/backups/:backupId/lock')
    toggleBackupLock(@CurrentUser() user: any, @Param('id') id: string, @Param('backupId') backupId: string) {
        return this.serversService.toggleBackupLock(user.id, id, backupId);
    }

    // ========== DATABASE OPERATIONS (NEW) ==========

    @Post(':id/databases/:dbId/rotate-password')
    rotateDatabasePassword(@CurrentUser() user: any, @Param('id') id: string, @Param('dbId') dbId: string) {
        return this.serversService.rotateDatabasePassword(user.id, id, dbId);
    }

    // ========== SERVER SETTINGS (NEW) ==========

    @Post(':id/settings/rename')
    renameServer(@CurrentUser() user: any, @Param('id') id: string, @Body() body: RenameServerDto) {
        return this.serversService.renameServer(user.id, id, body.name);
    }

    @Put(':id/settings/docker-image')
    changeDockerImage(@CurrentUser() user: any, @Param('id') id: string, @Body() body: ChangeDockerImageDto) {
        return this.serversService.changeDockerImage(user.id, id, body.docker_image);
    }

    // ========== SCHEDULES (NEW) ==========

    @Get(':id/schedules')
    listSchedules(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.listSchedules(user.id, id);
    }

    @Get(':id/schedules/:scheduleId')
    getSchedule(@CurrentUser() user: any, @Param('id') id: string, @Param('scheduleId') scheduleId: string) {
        return this.serversService.getSchedule(user.id, id, parseInt(scheduleId));
    }

    @Post(':id/schedules')
    createSchedule(@CurrentUser() user: any, @Param('id') id: string, @Body() body: CreateScheduleDto) {
        return this.serversService.createSchedule(user.id, id, body);
    }

    @Post(':id/schedules/:scheduleId')
    updateSchedule(@CurrentUser() user: any, @Param('id') id: string, @Param('scheduleId') scheduleId: string, @Body() body: CreateScheduleDto) {
        return this.serversService.updateSchedule(user.id, id, parseInt(scheduleId), body);
    }

    @Delete(':id/schedules/:scheduleId')
    deleteSchedule(@CurrentUser() user: any, @Param('id') id: string, @Param('scheduleId') scheduleId: string) {
        return this.serversService.deleteSchedule(user.id, id, parseInt(scheduleId));
    }

    @Post(':id/schedules/:scheduleId/execute')
    executeSchedule(@CurrentUser() user: any, @Param('id') id: string, @Param('scheduleId') scheduleId: string) {
        return this.serversService.executeSchedule(user.id, id, parseInt(scheduleId));
    }

    @Post(':id/schedules/:scheduleId/tasks')
    createScheduleTask(@CurrentUser() user: any, @Param('id') id: string, @Param('scheduleId') scheduleId: string, @Body() body: CreateScheduleTaskDto) {
        return this.serversService.createScheduleTask(user.id, id, parseInt(scheduleId), body);
    }

    @Post(':id/schedules/:scheduleId/tasks/:taskId')
    updateScheduleTask(@CurrentUser() user: any, @Param('id') id: string, @Param('scheduleId') scheduleId: string, @Param('taskId') taskId: string, @Body() body: CreateScheduleTaskDto) {
        return this.serversService.updateScheduleTask(user.id, id, parseInt(scheduleId), parseInt(taskId), body);
    }

    @Delete(':id/schedules/:scheduleId/tasks/:taskId')
    deleteScheduleTask(@CurrentUser() user: any, @Param('id') id: string, @Param('scheduleId') scheduleId: string, @Param('taskId') taskId: string) {
        return this.serversService.deleteScheduleTask(user.id, id, parseInt(scheduleId), parseInt(taskId));
    }

    // ========== ACTIVITY LOG (NEW) ==========

    @Get(':id/activity')
    getActivityLog(@CurrentUser() user: any, @Param('id') id: string) {
        return this.serversService.getActivityLog(user.id, id);
    }
}
