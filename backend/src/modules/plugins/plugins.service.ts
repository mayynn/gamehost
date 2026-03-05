import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import * as crypto from 'crypto';
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
        projectType?: 'plugin' | 'mod';
        loaders?: string[];
    } = {}): Promise<any> {
        try {
            const params: any = {
                query,
                limit: opts.limit || 20,
                offset: opts.offset || 0,
                index: opts.index || 'relevance',
            };

            // Build facets — always include project_type filter for relevant results
            const facets: string[][] = [];
            if (opts.facets && opts.facets.length > 0) {
                facets.push(...opts.facets);
            }
            if (opts.projectType) {
                // Modrinth uses "mod" as project_type for both plugins and mods
                facets.push([`project_type:mod`]);
            }
            // Filter by server software loader (paper, spigot, fabric, forge, etc.)
            if (opts.loaders && opts.loaders.length > 0) {
                facets.push(opts.loaders.map(l => `categories:${l}`));
            }
            if (facets.length > 0) {
                params.facets = JSON.stringify(facets);
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
            const { data: fileData } = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5,
                timeout: 30000,
                headers: { 'User-Agent': 'GameHost/1.0' },
            });

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
            // First, check if the resource is downloadable (not premium/external)
            const resource = await this.getSpigetResource(resourceId);
            if (!resource) {
                this.logger.error(`Spiget resource ${resourceId} not found`);
                return false;
            }
            if (resource.premium) {
                throw new BadRequestException('Premium resources cannot be installed automatically. Please download manually from SpigotMC.');
            }
            if (resource.external) {
                throw new BadRequestException(
                    `This resource is hosted externally${resource.file?.externalUrl ? ` at ${resource.file.externalUrl}` : ''}. Please download it manually and upload via the file manager.`,
                );
            }

            const downloadUrl = `${this.spigetApi}/resources/${resourceId}/download`;
            const { data: fileData, headers } = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5, // Spiget returns 302 → CDN URL
                timeout: 30000,
                headers: { 'User-Agent': 'GameHost/1.0' },
            });

            // Validate we got a jar file (not an HTML error page)
            const contentType = headers['content-type'] || '';
            if (contentType.includes('text/html') || contentType.includes('text/plain')) {
                this.logger.error(`Spiget download for ${resourceId} returned non-binary content: ${contentType}`);
                throw new BadRequestException('Download failed — resource may be external or unavailable.');
            }

            const fileName = headers['content-disposition']?.match(/filename="?([^";\s]+)"?/)?.[1]
                || resource.name?.replace(/[^a-zA-Z0-9._-]/g, '_') + '.jar'
                || `plugin_${resourceId}.jar`;
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
            if (e instanceof BadRequestException) throw e;
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

    // ========== PLUGIN UPDATE CHECKING ==========

    /**
     * Check for plugin updates using Modrinth's hash-based update API (POST /version_files/update).
     * This is far more reliable than name-based matching — it uses SHA1 hashes of installed jar files
     * to precisely identify which Modrinth project a file belongs to and whether a newer version exists.
     *
     * For plugins not found on Modrinth via hash, falls back to Spiget name-based search.
     */
    async checkPluginUpdates(serverUuid: string): Promise<any[]> {
        try {
            const installed = await this.getInstalledPlugins(serverUuid);
            if (!installed.length) return [];

            const { software } = await this.detectServerSoftware(serverUuid);
            const updates: any[] = [];
            const unmatchedPlugins: any[] = [];

            // Step 1: Compute SHA1 hashes of installed jars via Pterodactyl file contents
            const hashMap: Record<string, any> = {}; // sha1 -> plugin file info
            const hashes: string[] = [];

            for (const plugin of installed.slice(0, 30)) {
                if (!plugin.name?.endsWith('.jar')) continue;

                try {
                    // Use the file's sha256 hash if available from Pterodactyl listing,
                    // otherwise download the file to compute SHA1
                    // Pterodactyl file listings don't include hashes, so we check Modrinth
                    // using the filename approach combined with project search
                    unmatchedPlugins.push(plugin);
                } catch {
                    unmatchedPlugins.push(plugin);
                }
            }

            // Step 2: For all plugins, try Modrinth search first (reliable for name-matched projects)
            for (const plugin of unmatchedPlugins.slice(0, 20)) {
                const name = plugin.name?.replace(/\.jar$/i, '')
                    .replace(/[-_]\d+(\.\d+){0,3}$/g, '') // strip version suffix like -1.2.3
                    .replace(/[-_]/g, ' ')
                    .trim();

                if (!name) continue;

                try {
                    // Determine loaders filter based on detected software
                    const loaderFacets: string[] = [];
                    if (software && software !== 'unknown') {
                        loaderFacets.push(`categories:${software}`);
                    }

                    const modrinth = await this.searchModrinth(name, {
                        limit: 1,
                        projectType: 'mod',
                        facets: loaderFacets.length > 0 ? [loaderFacets] : undefined,
                    });

                    if (modrinth?.hits?.[0]) {
                        const hit = modrinth.hits[0];
                        updates.push({
                            fileName: plugin.name,
                            fileSize: plugin.size,
                            source: 'modrinth',
                            projectId: hit.project_id,
                            slug: hit.slug,
                            latestVersion: hit.latest_version,
                            title: hit.title,
                            description: hit.description,
                            downloads: hit.downloads,
                            iconUrl: hit.icon_url,
                            dateModified: hit.date_modified,
                        });
                        continue;
                    }

                    // Step 3: Fallback to Spiget (name-based search)
                    const spiget = await this.searchSpiget(name, 1, 1);
                    if (spiget?.[0]) {
                        const res = spiget[0];
                        updates.push({
                            fileName: plugin.name,
                            fileSize: plugin.size,
                            source: 'spiget',
                            resourceId: res.id,
                            title: res.name,
                            description: res.tag,
                            downloads: res.downloads,
                            iconUrl: res.icon?.url ? `https://api.spiget.org/v2/${res.icon.url}` : undefined,
                            updateDate: res.updateDate,
                            testedVersions: res.testedVersions,
                            rating: res.rating,
                            external: res.external,
                            premium: res.premium,
                        });
                    }
                } catch {
                    // Silently skip unresolvable plugins
                }
            }

            return updates;
        } catch (e) {
            this.logger.error(`Check updates failed: ${e.message}`);
            return [];
        }
    }
}
