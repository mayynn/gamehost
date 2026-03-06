import {
    Injectable,
    Logger,
    BadGatewayException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';

/**
 * Pterodactyl Client API Service (User-level)
 * Used for power controls, console, file manager, backups, databases
 */
@Injectable()
export class PterodactylClientService {
    private readonly logger = new Logger(PterodactylClientService.name);
    private api: AxiosInstance;

    private formatApiError(error: any): string {
        const axiosError = error as AxiosError<any>;
        const responseData = axiosError?.response?.data;
        const firstError = responseData?.errors?.[0];
        if (firstError?.detail) return firstError.detail;
        if (firstError?.code) return firstError.code;
        if (typeof responseData?.message === 'string') return responseData.message;
        return axiosError?.message || 'Unknown Pterodactyl API error';
    }

    private throwApiError(action: string, error: any): never {
        const axiosError = error as AxiosError<any>;
        const status = axiosError?.response?.status;
        const message = this.formatApiError(error);

        this.logger.error(`${action} failed: ${message}`);

        if (!status) {
            throw new ServiceUnavailableException(`Pterodactyl is unreachable: ${message}`);
        }

        if (status === 400 || status === 422) throw new BadRequestException(message);
        if (status === 401) throw new UnauthorizedException(message);
        if (status === 403) throw new ForbiddenException(message);
        if (status === 404) throw new NotFoundException(message);
        if (status === 409) throw new ConflictException(message);
        if (status === 429) throw new HttpException(message, 429);
        if (status >= 500) throw new BadGatewayException(`Pterodactyl server error: ${message}`);

        throw new BadGatewayException(`Pterodactyl API error: ${message}`);
    }

    constructor(private config: ConfigService) {
        const baseURL = config.get('PTERODACTYL_URL', 'http://localhost');
        const apiKey = config.get('PTERODACTYL_CLIENT_KEY', '');

        this.api = axios.create({
            baseURL: `${baseURL}/api/client`,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/vnd.pterodactyl.v1+json',
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
    }

    // ========== SERVERS ==========

    async getServers(): Promise<any[]> {
        try {
            const { data } = await this.api.get('/');
            return data.data.map((s: any) => s.attributes);
        } catch (e) {
            this.logger.error(`Failed to list servers: ${e.message}`);
            return [];
        }
    }

    async getServer(uuid: string): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}`);
            return data.attributes;
        } catch (e) {
            this.throwApiError(`Get server ${uuid}`, e);
        }
    }

    async getServerResources(uuid: string): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/resources`);
            return data.attributes;
        } catch (e) {
            this.throwApiError(`Get resources for ${uuid}`, e);
        }
    }

    // ========== POWER ==========

    async sendPowerAction(uuid: string, signal: 'start' | 'stop' | 'restart' | 'kill'): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/power`, { signal });
            return true;
        } catch (e) {
            this.throwApiError(`Power ${signal} for ${uuid}`, e);
        }
    }

    // ========== CONSOLE ==========

    async getWebsocketCredentials(uuid: string): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/websocket`);
            return data.data;
        } catch (e) {
            this.throwApiError(`Get websocket credentials for ${uuid}`, e);
        }
    }

    async sendCommand(uuid: string, command: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/command`, { command });
            return true;
        } catch (e) {
            this.throwApiError(`Send command on ${uuid}`, e);
        }
    }

    // ========== FILE MANAGER ==========

    async listFiles(uuid: string, directory = '/'): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/files/list?directory=${encodeURIComponent(directory)}`);
            return data.data.map((f: any) => f.attributes);
        } catch (e) {
            this.logger.error(`Failed to list files for ${uuid}: ${e.message}`);
            return [];
        }
    }

    async getFileContents(uuid: string, file: string): Promise<string | null> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/files/contents?file=${encodeURIComponent(file)}`);
            return data;
        } catch (e) {
            this.logger.error(`Failed to read file ${file} on ${uuid}: ${e.message}`);
            return null;
        }
    }

    async writeFile(uuid: string, file: string, content: string): Promise<boolean> {
        try {
            await this.api.post(
                `/servers/${uuid}/files/write?file=${encodeURIComponent(file)}`,
                content,
                { headers: { 'Content-Type': 'text/plain' } },
            );
            return true;
        } catch (e) {
            this.logger.error(`Failed to write file ${file} on ${uuid}: ${e.message}`);
            return false;
        }
    }

    async deleteFiles(uuid: string, root: string, files: string[]): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/files/delete`, { root, files });
            return true;
        } catch (e) {
            this.logger.error(`Failed to delete files on ${uuid}: ${e.message}`);
            return false;
        }
    }

    async renameFile(uuid: string, root: string, from: string, to: string): Promise<boolean> {
        try {
            await this.api.put(`/servers/${uuid}/files/rename`, {
                root,
                files: [{ from, to }],
            });
            return true;
        } catch (e) {
            this.logger.error(`Failed to rename file on ${uuid}: ${e.message}`);
            return false;
        }
    }

    async uploadFileUrl(uuid: string, directory = '/'): Promise<string | null> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/files/upload`);
            const url = data.attributes.url;
            // Append directory param so files land in the correct folder
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}directory=${encodeURIComponent(directory)}`;
        } catch (e) {
            this.logger.error(`Failed to get upload URL for ${uuid}: ${e.message}`);
            return null;
        }
    }

    async reinstall(uuid: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/settings/reinstall`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to reinstall ${uuid}: ${e.message}`);
            return false;
        }
    }

    async createDirectory(uuid: string, root: string, name: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/files/create-folder`, { root, name });
            return true;
        } catch (e) {
            this.logger.error(`Failed to create directory on ${uuid}: ${e.message}`);
            return false;
        }
    }

    async downloadBackup(uuid: string, backupId: string): Promise<string | null> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/backups/${backupId}/download`);
            return data.attributes?.url || null;
        } catch (e) {
            this.logger.error(`Failed to get backup download URL: ${e.message}`);
            return null;
        }
    }

    // ========== BACKUPS ==========

    async listBackups(uuid: string): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/backups`);
            return data.data.map((b: any) => b.attributes);
        } catch (e) {
            this.logger.error(`Failed to list backups for ${uuid}: ${e.message}`);
            return [];
        }
    }

    async createBackup(uuid: string, name?: string): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/backups`, { name: name || 'Auto Backup' });
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create backup for ${uuid}: ${e.message}`);
            return null;
        }
    }

    async deleteBackup(uuid: string, backupId: string): Promise<boolean> {
        try {
            await this.api.delete(`/servers/${uuid}/backups/${backupId}`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to delete backup ${backupId}: ${e.message}`);
            return false;
        }
    }

    // ========== DATABASES ==========

    async listDatabases(uuid: string): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/databases?include=password`);
            return data.data.map((d: any) => d.attributes);
        } catch (e) {
            this.logger.error(`Failed to list databases for ${uuid}: ${e.message}`);
            return [];
        }
    }

    async createDatabase(uuid: string, database: string, remote: string): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/databases`, { database, remote });
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create database for ${uuid}: ${e.message}`);
            return null;
        }
    }

    async deleteDatabase(uuid: string, databaseId: string): Promise<boolean> {
        try {
            await this.api.delete(`/servers/${uuid}/databases/${databaseId}`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to delete database ${databaseId}: ${e.message}`);
            return false;
        }
    }

    // ========== NETWORK ==========

    async listAllocations(uuid: string): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/network/allocations`);
            return data.data.map((a: any) => a.attributes);
        } catch (e) {
            this.logger.error(`Failed to list allocations for ${uuid}: ${e.message}`);
            return [];
        }
    }

    // ========== STARTUP ==========

    async getStartup(uuid: string): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/startup`);
            // Normalize: return array of variable attributes like all other list methods
            if (data?.data && Array.isArray(data.data)) {
                return data.data.map((v: any) => v.attributes);
            }
            return data?.data || [];
        } catch (e) {
            this.logger.error(`Failed to get startup for ${uuid}: ${e.message}`);
            return [];
        }
    }

    async updateStartupVariable(uuid: string, key: string, value: string): Promise<any> {
        try {
            const { data } = await this.api.put(`/servers/${uuid}/startup/variable`, { key, value });
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to update variable ${key} on ${uuid}: ${e.message}`);
            return null;
        }
    }

    // ========== FILE OPERATIONS (MISSING) ==========

    async compressFiles(uuid: string, root: string, files: string[]): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/files/compress`, { root, files });
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to compress files on ${uuid}: ${e.message}`);
            return null;
        }
    }

    async decompressFile(uuid: string, root: string, file: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/files/decompress`, { root, file });
            return true;
        } catch (e) {
            this.logger.error(`Failed to decompress file on ${uuid}: ${e.message}`);
            return false;
        }
    }

    async getFileDownloadUrl(uuid: string, file: string): Promise<string | null> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/files/download?file=${encodeURIComponent(file)}`);
            return data.attributes?.url || null;
        } catch (e) {
            this.logger.error(`Failed to get download URL for ${file} on ${uuid}: ${e.message}`);
            return null;
        }
    }

    async chmodFiles(uuid: string, root: string, files: { file: string; mode: string }[]): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/files/chmod`, { root, files });
            return true;
        } catch (e) {
            this.logger.error(`Failed to chmod files on ${uuid}: ${e.message}`);
            return false;
        }
    }

    async copyFile(uuid: string, location: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/files/copy`, { location });
            return true;
        } catch (e) {
            this.logger.error(`Failed to copy file on ${uuid}: ${e.message}`);
            return false;
        }
    }

    async pullFile(uuid: string, url: string, directory = '/', filename?: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/files/pull`, { url, directory, filename });
            return true;
        } catch (e) {
            this.logger.error(`Failed to pull file on ${uuid}: ${e.message}`);
            return false;
        }
    }

    // ========== BACKUP OPERATIONS (MISSING) ==========

    async restoreBackup(uuid: string, backupId: string, truncate = false): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/backups/${backupId}/restore`, { truncate });
            return true;
        } catch (e) {
            this.logger.error(`Failed to restore backup ${backupId}: ${e.message}`);
            return false;
        }
    }

    async toggleBackupLock(uuid: string, backupId: string): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/backups/${backupId}/lock`);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to toggle lock for backup ${backupId}: ${e.message}`);
            return null;
        }
    }

    // ========== DATABASE OPERATIONS (MISSING) ==========

    async rotateDatabasePassword(uuid: string, databaseId: string): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/databases/${databaseId}/rotate-password`);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to rotate password for database ${databaseId}: ${e.message}`);
            return null;
        }
    }

    // ========== SERVER SETTINGS (MISSING) ==========

    async renameServer(uuid: string, name: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/settings/rename`, { name });
            return true;
        } catch (e) {
            this.logger.error(`Failed to rename server ${uuid}: ${e.message}`);
            return false;
        }
    }

    async changeDockerImage(uuid: string, docker_image: string): Promise<boolean> {
        try {
            await this.api.put(`/servers/${uuid}/settings/docker-image`, { docker_image });
            return true;
        } catch (e) {
            this.logger.error(`Failed to change docker image for ${uuid}: ${e.message}`);
            return false;
        }
    }

    // ========== SCHEDULES (MISSING — TASK AUTOMATION) ==========

    async listSchedules(uuid: string): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/schedules`);
            return data.data.map((s: any) => s.attributes);
        } catch (e) {
            this.logger.error(`Failed to list schedules for ${uuid}: ${e.message}`);
            return [];
        }
    }

    async getSchedule(uuid: string, scheduleId: number): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/schedules/${scheduleId}`);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to get schedule ${scheduleId}: ${e.message}`);
            return null;
        }
    }

    async createSchedule(uuid: string, schedule: {
        name: string;
        is_active: boolean;
        minute: string;
        hour: string;
        day_of_week: string;
        day_of_month: string;
        month: string;
    }): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/schedules`, schedule);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create schedule on ${uuid}: ${e.message}`);
            return null;
        }
    }

    async updateSchedule(uuid: string, scheduleId: number, schedule: {
        name: string;
        is_active: boolean;
        minute: string;
        hour: string;
        day_of_week: string;
        day_of_month: string;
        month: string;
    }): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/schedules/${scheduleId}`, schedule);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to update schedule ${scheduleId}: ${e.message}`);
            return null;
        }
    }

    async deleteSchedule(uuid: string, scheduleId: number): Promise<boolean> {
        try {
            await this.api.delete(`/servers/${uuid}/schedules/${scheduleId}`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to delete schedule ${scheduleId}: ${e.message}`);
            return false;
        }
    }

    async executeSchedule(uuid: string, scheduleId: number): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/schedules/${scheduleId}/execute`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to execute schedule ${scheduleId}: ${e.message}`);
            return false;
        }
    }

    async createScheduleTask(uuid: string, scheduleId: number, task: {
        action: 'command' | 'power' | 'backup';
        payload: string;
        time_offset: number;
        continue_on_failure?: boolean;
    }): Promise<any> {
        try {
            const { data } = await this.api.post(`/servers/${uuid}/schedules/${scheduleId}/tasks`, task);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create task for schedule ${scheduleId}: ${e.message}`);
            return null;
        }
    }

    async updateScheduleTask(uuid: string, scheduleId: number, taskId: number, task: {
        action: 'command' | 'power' | 'backup';
        payload: string;
        time_offset: number;
        continue_on_failure?: boolean;
    }): Promise<any> {
        try {
            const { data } = await this.api.patch(`/servers/${uuid}/schedules/${scheduleId}/tasks/${taskId}`, task);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to update task ${taskId}: ${e.message}`);
            return null;
        }
    }

    async deleteScheduleTask(uuid: string, scheduleId: number, taskId: number): Promise<boolean> {
        try {
            await this.api.delete(`/servers/${uuid}/schedules/${scheduleId}/tasks/${taskId}`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to delete task ${taskId}: ${e.message}`);
            return false;
        }
    }

    // ========== ACTIVITY LOG (MISSING) ==========

    async getActivityLog(uuid: string): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/activity`);
            return data.data.map((a: any) => a.attributes);
        } catch (e) {
            this.logger.error(`Failed to get activity log for ${uuid}: ${e.message}`);
            return [];
        }
    }
}
