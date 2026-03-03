import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';

type ServerSoftware = 'paper' | 'spigot' | 'bukkit' | 'velocity' | 'bungeecord' | 'fabric' | 'forge' | 'unknown';
type ModType = 'plugin' | 'mod';

@Injectable()
export class PluginsService {
    private readonly logger = new Logger(PluginsService.name);
    private readonly modrinthApi = 'https://api.modrinth.com/v2';
    private readonly spigetApi = 'https://api.spiget.org/v2';

    constructor(private pterodactylClient: PterodactylClientService) { }

    // ========== SERVER SOFTWARE DETECTION ==========

    async detectServerSoftware(serverUuid: string): Promise<{ software: ServerSoftware; type: ModType }> {
        try {
            const files = await this.pterodactylClient.listFiles(serverUuid, '/');
            const fileNames = files.map((f: any) => f.name?.toLowerCase() || '');

            // Check for known server jars and directories
            const hasPlugins = fileNames.includes('plugins');
            const hasMods = fileNames.includes('mods');

            // Read server.properties or startup for clues
            if (hasMods && !hasPlugins) {
                if (fileNames.some((f: string) => f.includes('forge'))) return { software: 'forge', type: 'mod' };
                return { software: 'fabric', type: 'mod' };
            }

            if (hasPlugins) {
                // Check jar names for software identification
                const jarFiles = fileNames.filter((f: string) => f.endsWith('.jar'));
                for (const jar of jarFiles) {
                    if (jar.includes('paper')) return { software: 'paper', type: 'plugin' };
                    if (jar.includes('spigot')) return { software: 'spigot', type: 'plugin' };
                    if (jar.includes('bukkit')) return { software: 'bukkit', type: 'plugin' };
                    if (jar.includes('velocity')) return { software: 'velocity', type: 'plugin' };
                    if (jar.includes('bungeecord') || jar.includes('bungee')) return { software: 'bungeecord', type: 'plugin' };
                }
                return { software: 'paper', type: 'plugin' }; // default if plugins dir exists
            }

            return { software: 'unknown', type: 'plugin' };
        } catch (e) {
            this.logger.error(`Failed to detect server software: ${e.message}`);
            return { software: 'unknown', type: 'plugin' };
        }
    }

    // ========== MODRINTH API ==========

    async searchModrinth(query: string, opts: {
        facets?: string[][];
        limit?: number;
        offset?: number;
        index?: string;
    } = {}): Promise<any> {
        try {
            const params: any = {
                query,
                limit: opts.limit || 20,
                offset: opts.offset || 0,
                index: opts.index || 'relevance',
            };

            if (opts.facets && opts.facets.length > 0) {
                params.facets = JSON.stringify(opts.facets);
            }

            const { data } = await axios.get(`${this.modrinthApi}/search`, {
                params,
                headers: { 'User-Agent': 'GameHost/1.0 (support@gamehost.com)' },
            });

            return data;
        } catch (e) {
            this.logger.error(`Modrinth search failed: ${e.message}`);
            return { hits: [], total_hits: 0 };
        }
    }

    async getModrinthProject(projectId: string): Promise<any> {
        try {
            const { data } = await axios.get(`${this.modrinthApi}/project/${projectId}`, {
                headers: { 'User-Agent': 'GameHost/1.0' },
            });
            return data;
        } catch (e) {
            this.logger.error(`Modrinth project ${projectId} failed: ${e.message}`);
            return null;
        }
    }

    async getModrinthVersions(projectId: string, loaders?: string[], gameVersions?: string[]): Promise<any[]> {
        try {
            const params: any = {};
            if (loaders) params.loaders = JSON.stringify(loaders);
            if (gameVersions) params.game_versions = JSON.stringify(gameVersions);

            const { data } = await axios.get(`${this.modrinthApi}/project/${projectId}/version`, {
                params,
                headers: { 'User-Agent': 'GameHost/1.0' },
            });
            return data;
        } catch (e) {
            this.logger.error(`Modrinth versions failed: ${e.message}`);
            return [];
        }
    }

    // ========== SPIGET (SpigotMC) API ==========

    async searchSpiget(query: string, page = 1, size = 20): Promise<any[]> {
        try {
            const { data } = await axios.get(`${this.spigetApi}/search/resources/${encodeURIComponent(query)}`, {
                params: { page, size, sort: '-downloads' },
            });
            return data;
        } catch (e) {
            this.logger.error(`Spiget search failed: ${e.message}`);
            return [];
        }
    }

    async getSpigetResource(resourceId: number): Promise<any> {
        try {
            const { data } = await axios.get(`${this.spigetApi}/resources/${resourceId}`);
            return data;
        } catch (e) {
            this.logger.error(`Spiget resource ${resourceId} failed: ${e.message}`);
            return null;
        }
    }

    async getSpigetResourceVersions(resourceId: number): Promise<any[]> {
        try {
            const { data } = await axios.get(`${this.spigetApi}/resources/${resourceId}/versions`, {
                params: { size: 10, sort: '-releaseDate' },
            });
            return data;
        } catch (e) {
            this.logger.error(`Spiget versions failed: ${e.message}`);
            return [];
        }
    }

    // ========== INSTALL (One-Click) ==========

    async installFromModrinth(serverUuid: string, projectId: string, versionId: string): Promise<boolean> {
        try {
            // Get version details
            const { data: version } = await axios.get(`${this.modrinthApi}/version/${versionId}`, {
                headers: { 'User-Agent': 'GameHost/1.0' },
            });

            if (!version.files || version.files.length === 0) {
                this.logger.error('No files in Modrinth version');
                return false;
            }

            const file = version.files.find((f: any) => f.primary) || version.files[0];
            const downloadUrl = file.url;
            const fileName = file.filename;

            // Detect install directory
            const { type } = await this.detectServerSoftware(serverUuid);
            const installDir = type === 'mod' ? '/mods' : '/plugins';

            // Download and upload to server
            const { data: fileData } = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

            // Write to server via Pterodactyl file upload (multipart)
            const uploadUrl = await this.pterodactylClient.uploadFileUrl(serverUuid, installDir);
            if (uploadUrl) {
                const form = new FormData();
                form.append('files', Buffer.from(fileData), { filename: fileName });
                await axios.post(uploadUrl, form, {
                    headers: form.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                });
            }

            this.logger.log(`Installed ${fileName} from Modrinth to ${installDir}`);
            return true;
        } catch (e) {
            this.logger.error(`Install from Modrinth failed: ${e.message}`);
            return false;
        }
    }

    async installFromSpiget(serverUuid: string, resourceId: number): Promise<boolean> {
        try {
            const downloadUrl = `${this.spigetApi}/resources/${resourceId}/download`;
            const { data: fileData, headers } = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

            const fileName = headers['content-disposition']?.match(/filename="?(.+)"?/)?.[1] || `plugin_${resourceId}.jar`;
            const installDir = '/plugins';

            const uploadUrl = await this.pterodactylClient.uploadFileUrl(serverUuid, installDir);
            if (uploadUrl) {
                const form = new FormData();
                form.append('files', Buffer.from(fileData), { filename: fileName });
                await axios.post(uploadUrl, form, {
                    headers: form.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                });
            }

            this.logger.log(`Installed ${fileName} from Spiget to ${installDir}`);
            return true;
        } catch (e) {
            this.logger.error(`Install from Spiget failed: ${e.message}`);
            return false;
        }
    }

    // ========== INSTALLED PLUGINS/MODS ==========

    async getInstalledPlugins(serverUuid: string): Promise<any[]> {
        const { type } = await this.detectServerSoftware(serverUuid);
        const dir = type === 'mod' ? '/mods' : '/plugins';
        const files = await this.pterodactylClient.listFiles(serverUuid, dir);
        return files.filter((f: any) => f.name?.endsWith('.jar'));
    }

    async removePlugin(serverUuid: string, fileName: string): Promise<boolean> {
        const { type } = await this.detectServerSoftware(serverUuid);
        const dir = type === 'mod' ? '/mods' : '/plugins';
        return this.pterodactylClient.deleteFiles(serverUuid, dir, [fileName]);
    }
}
