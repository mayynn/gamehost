import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Pterodactyl Client API Service (User-level)
 * Used for power controls, console, file manager, backups, databases
 */
@Injectable()
export class PterodactylClientService {
    private readonly logger = new Logger(PterodactylClientService.name);
    private api: AxiosInstance;

    constructor(private config: ConfigService) {
        const baseURL = config.get('PTERODACTYL_URL', 'http://localhost');
        const apiKey = config.get('PTERODACTYL_CLIENT_KEY', '');

        this.api = axios.create({
            baseURL: `${baseURL}/api/client`,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
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
            this.logger.error(`Failed to get server ${uuid}: ${e.message}`);
            return null;
        }
    }

    async getServerResources(uuid: string): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/resources`);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to get resources for ${uuid}: ${e.message}`);
            return null;
        }
    }

    // ========== POWER ==========

    async sendPowerAction(uuid: string, signal: 'start' | 'stop' | 'restart' | 'kill'): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/power`, { signal });
            return true;
        } catch (e) {
            this.logger.error(`Failed to send power ${signal} to ${uuid}: ${e.message}`);
            return false;
        }
    }

    // ========== CONSOLE ==========

    async getWebsocketCredentials(uuid: string): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/websocket`);
            return data.data;
        } catch (e) {
            this.logger.error(`Failed to get websocket for ${uuid}: ${e.message}`);
            return null;
        }
    }

    async sendCommand(uuid: string, command: string): Promise<boolean> {
        try {
            await this.api.post(`/servers/${uuid}/command`, { command });
            return true;
        } catch (e) {
            this.logger.error(`Failed to send command to ${uuid}: ${e.message}`);
            return false;
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

    async getStartup(uuid: string): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${uuid}/startup`);
            return data;
        } catch (e) {
            this.logger.error(`Failed to get startup for ${uuid}: ${e.message}`);
            return null;
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
}
