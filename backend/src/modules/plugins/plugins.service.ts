import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';

type ServerSoftware = 'paper' | 'spigot' | 'bukkit' | 'velocity' | 'bungeecord' | 'fabric' | 'forge' | 'unknown';
type ModType = 'plugin' | 'mod';
type PluginSource = 'modrinth' | 'spiget';

interface PluginRegistryEntry {
    fileName: string;
    source: PluginSource;
    type: ModType;
    projectId?: string;
    resourceId?: number;
    versionId?: string;
    versionName?: string;
    title?: string;
    installedAt: string;
}

export interface PluginUpdateInfo {
    fileName: string;
    source: PluginSource;
    managed: boolean;
    title?: string;
    currentVersion?: string | null;
    latestVersion?: string | null;
    latestVersionId?: string;
    projectId?: string;
    resourceId?: number;
    compatible?: boolean;
    compatibilityNote?: string;
}

@Injectable()
export class PluginsService {
    private readonly logger = new Logger(PluginsService.name);
    private readonly modrinthApi = 'https://api.modrinth.com/v2';
    private readonly spigetApi = 'https://api.spiget.org/v2';
    private readonly registryPath = '/.gamehost-plugin-registry.json';

    constructor(private pterodactylClient: PterodactylClientService) { }

    private parseVersionFromText(text?: string | null): string | null {
        if (!text) return null;
        const match = text.match(/\b\d+\.\d+(?:\.\d+)?\b/);
        return match?.[0] || null;
    }

    private parseVersionFromFileName(fileName: string): string | null {
        const clean = fileName.replace(/\.jar$/i, '');
        const match = clean.match(/(?:[-_]|^)(\d+\.\d+(?:\.\d+)?(?:[-+a-z0-9.]*)?)$/i);
        return match?.[1] || null;
    }

    private normalizeMcVersion(version?: string | null): string | null {
        if (!version) return null;
        const parsed = this.parseVersionFromText(version);
        return parsed || null;
    }

    private isVersionCompatible(testedVersions: string[] | undefined, mcVersion?: string | null): boolean {
        if (!mcVersion) return true;
        if (!testedVersions?.length) return true;
        const normalized = this.normalizeMcVersion(mcVersion);
        if (!normalized) return true;
        return testedVersions.some((v) => {
            const n = this.normalizeMcVersion(v);
            return !!n && (normalized.startsWith(n) || n.startsWith(normalized));
        });
    }

    private getLoaderCandidates(software: ServerSoftware, type: ModType): string[] {
        if (type === 'mod') {
            if (software === 'fabric') return ['fabric', 'quilt'];
            if (software === 'forge') return ['forge', 'neoforge'];
            return ['fabric', 'forge', 'quilt', 'neoforge'];
        }
        if (software === 'paper') return ['paper', 'purpur', 'folia', 'spigot', 'bukkit'];
        if (software === 'spigot') return ['spigot', 'paper', 'bukkit'];
        if (software === 'bukkit') return ['bukkit', 'spigot', 'paper'];
        if (software === 'velocity') return ['velocity'];
        if (software === 'bungeecord') return ['bungeecord', 'waterfall'];
        return ['paper', 'spigot', 'bukkit', 'velocity', 'bungeecord'];
    }

    private async getStartupMap(serverUuid: string): Promise<Record<string, string>> {
        const map: Record<string, string> = {};
        try {
            const startup = await this.pterodactylClient.getStartup(serverUuid);
            for (const variable of startup || []) {
                const key = String(variable?.env_variable || variable?.key || '').trim().toUpperCase();
                if (!key) continue;
                const value = String(variable?.server_value ?? variable?.value ?? variable?.default_value ?? '').trim();
                map[key] = value;
            }
        } catch {
            // Best-effort only.
        }
        return map;
    }

    private inferSoftwareFromNames(fileNames: string[], startupMap: Record<string, string>): ServerSoftware {
        const joined = `${(startupMap.SERVER_JARFILE || '')} ${(startupMap.STARTUP || '')}`.toLowerCase();
        const hasName = (word: string) => fileNames.some((f) => f.includes(word)) || joined.includes(word);

        if (hasName('fabric') || hasName('quilt')) return 'fabric';
        if (hasName('forge') || hasName('neoforge')) return 'forge';
        if (hasName('paper') || hasName('purpur') || hasName('folia')) return 'paper';
        if (hasName('spigot')) return 'spigot';
        if (hasName('bukkit')) return 'bukkit';
        if (hasName('velocity')) return 'velocity';
        if (hasName('bungeecord') || hasName('waterfall') || hasName('bungee')) return 'bungeecord';
        return 'unknown';
    }

    private async readRegistry(serverUuid: string): Promise<PluginRegistryEntry[]> {
        try {
            const raw = await this.pterodactylClient.getFileContents(serverUuid, this.registryPath);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : parsed?.items;
            if (!Array.isArray(items)) return [];
            return items
                .filter((item) => item?.fileName && item?.source)
                .map((item) => ({
                    fileName: String(item.fileName),
                    source: item.source as PluginSource,
                    type: item.type as ModType || 'plugin',
                    projectId: item.projectId ? String(item.projectId) : undefined,
                    resourceId: item.resourceId ? Number(item.resourceId) : undefined,
                    versionId: item.versionId ? String(item.versionId) : undefined,
                    versionName: item.versionName ? String(item.versionName) : undefined,
                    title: item.title ? String(item.title) : undefined,
                    installedAt: item.installedAt ? String(item.installedAt) : new Date().toISOString(),
                }));
        } catch (e) {
            this.logger.warn(`Failed to read plugin registry on ${serverUuid}: ${e.message}`);
            return [];
        }
    }

    private async writeRegistry(serverUuid: string, items: PluginRegistryEntry[]): Promise<void> {
        try {
            const payload = JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2);
            await this.pterodactylClient.writeFile(serverUuid, this.registryPath, payload);
        } catch (e) {
            this.logger.warn(`Failed to write plugin registry on ${serverUuid}: ${e.message}`);
        }
    }

    private async upsertRegistryEntry(serverUuid: string, entry: PluginRegistryEntry): Promise<void> {
        const current = await this.readRegistry(serverUuid);
        const filtered = current.filter((item) => {
            if (item.fileName === entry.fileName) return false;
            if (entry.source === 'modrinth' && entry.projectId && item.source === 'modrinth' && item.projectId === entry.projectId) return false;
            if (entry.source === 'spiget' && entry.resourceId && item.source === 'spiget' && item.resourceId === entry.resourceId) return false;
            return true;
        });
        filtered.push(entry);
        await this.writeRegistry(serverUuid, filtered);
    }

    private async removeRegistryFile(serverUuid: string, fileName: string): Promise<void> {
        const current = await this.readRegistry(serverUuid);
        const filtered = current.filter((item) => item.fileName !== fileName);
        if (filtered.length !== current.length) {
            await this.writeRegistry(serverUuid, filtered);
        }
    }

    // ========== SERVER SOFTWARE DETECTION ==========

    async detectServerSoftware(serverUuid: string): Promise<{
        isMinecraft: boolean;
        software: ServerSoftware;
        type: ModType;
        label: 'Plugins' | 'Mods';
        installDir: '/plugins' | '/mods';
        minecraftVersion: string | null;
        loaders: string[];
        allowedSources: PluginSource[];
    }> {
        try {
            const files = await this.pterodactylClient.listFiles(serverUuid, '/');
            const fileNames = files.map((f: any) => String(f.name || '').toLowerCase());
            const startupMap = await this.getStartupMap(serverUuid);

            const hasPlugins = fileNames.includes('plugins');
            const hasMods = fileNames.includes('mods');
            const hasServerProperties = fileNames.includes('server.properties');

            let software = this.inferSoftwareFromNames(fileNames, startupMap);
            let type: ModType = 'plugin';

            if (hasMods && !hasPlugins) type = 'mod';
            if (software === 'fabric' || software === 'forge') type = 'mod';
            if (software === 'paper' || software === 'spigot' || software === 'bukkit' || software === 'velocity' || software === 'bungeecord') type = 'plugin';

            const minecraftVersion = this.normalizeMcVersion(
                startupMap.MINECRAFT_VERSION
                || startupMap.MC_VERSION
                || startupMap.SERVER_VERSION
                || startupMap.VERSION
                || startupMap.PAPER_VERSION
                || startupMap.PURPUR_VERSION
                || startupMap.FABRIC_LOADER_VERSION
                || null,
            );

            const startupHint = `${startupMap.SERVER_JARFILE || ''} ${startupMap.STARTUP || ''}`.toLowerCase();
            const isMinecraft = (
                hasServerProperties
                || hasPlugins
                || hasMods
                || !!minecraftVersion
                || startupHint.includes('minecraft')
                || startupHint.includes('paper')
                || startupHint.includes('spigot')
                || startupHint.includes('fabric')
                || startupHint.includes('forge')
                || software !== 'unknown'
            );

            if (!isMinecraft) {
                return {
                    isMinecraft: false,
                    software: 'unknown',
                    type: 'plugin',
                    label: 'Plugins',
                    installDir: '/plugins',
                    minecraftVersion: null,
                    loaders: [],
                    allowedSources: ['modrinth', 'spiget'],
                };
            }

            const label = type === 'mod' ? 'Mods' : 'Plugins';
            const installDir = type === 'mod' ? '/mods' : '/plugins';
            const loaders = this.getLoaderCandidates(software, type);
            const allowedSources: PluginSource[] = type === 'mod' ? ['modrinth'] : ['modrinth', 'spiget'];

            return {
                isMinecraft: true,
                software,
                type,
                label,
                installDir,
                minecraftVersion,
                loaders,
                allowedSources,
            };
        } catch (e) {
            this.logger.error(`Failed to detect server software: ${e.message}`);
            return {
                isMinecraft: false,
                software: 'unknown',
                type: 'plugin',
                label: 'Plugins',
                installDir: '/plugins',
                minecraftVersion: null,
                loaders: [],
                allowedSources: ['modrinth', 'spiget'],
            };
        }
    }

    // ========== MODRINTH API ==========

    async getModrinthTags(): Promise<{ categories: any[]; loaders: any[]; gameVersions: any[] }> {
        try {
            const headers = { 'User-Agent': 'GameHost/1.0 (support@gamehost.com)' };
            const [categories, loaders, gameVersions] = await Promise.all([
                axios.get(`${this.modrinthApi}/tag/category`, { headers }),
                axios.get(`${this.modrinthApi}/tag/loader`, { headers }),
                axios.get(`${this.modrinthApi}/tag/game_version`, { headers }),
            ]);
            return {
                categories: categories.data || [],
                loaders: loaders.data || [],
                gameVersions: gameVersions.data || [],
            };
        } catch (e) {
            this.logger.error(`Failed to fetch Modrinth tags: ${e.message}`);
            return { categories: [], loaders: [], gameVersions: [] };
        }
    }

    async searchModrinth(query: string, opts: {
        facets?: string[][];
        limit?: number;
        offset?: number;
        index?: string;
        projectType?: string;
        loaders?: string[];
        categories?: string[];
        gameVersions?: string[];
    } = {}): Promise<any> {
        try {
            const params: any = {
                query: query?.trim() || 'minecraft',
                limit: opts.limit || 20,
                offset: opts.offset || 0,
                index: opts.index || 'relevance',
            };

            const facets: string[][] = [];
            if (opts.facets?.length) facets.push(...opts.facets);
            if (opts.projectType) facets.push([`project_type:${opts.projectType}`]);
            if (opts.loaders?.length) facets.push(opts.loaders.map((l) => `categories:${l}`));
            if (opts.categories?.length) facets.push(opts.categories.map((c) => `categories:${c}`));
            if (opts.gameVersions?.length) facets.push(opts.gameVersions.map((v) => `versions:${v}`));
            if (facets.length > 0) params.facets = JSON.stringify(facets);

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
            if (loaders?.length) params.loaders = JSON.stringify(loaders);
            if (gameVersions?.length) params.game_versions = JSON.stringify(gameVersions);

            const { data } = await axios.get(`${this.modrinthApi}/project/${projectId}/version`, {
                params,
                headers: { 'User-Agent': 'GameHost/1.0' },
            });
            return Array.isArray(data) ? data : [];
        } catch (e) {
            this.logger.error(`Modrinth versions failed: ${e.message}`);
            return [];
        }
    }

    // ========== SPIGET (SpigotMC) API ==========

    async getSpigetCategories(): Promise<any[]> {
        try {
            const { data } = await axios.get(`${this.spigetApi}/categories`);
            return Array.isArray(data) ? data : [];
        } catch (e) {
            this.logger.error(`Failed to fetch Spiget categories: ${e.message}`);
            return [];
        }
    }

    async getSpigetCategoryResources(categoryId: number, page = 1, size = 20): Promise<any[]> {
        try {
            const { data } = await axios.get(`${this.spigetApi}/categories/${categoryId}/resources`, {
                params: { page, size, sort: '-downloads' },
            });
            return Array.isArray(data) ? data : [];
        } catch (e) {
            this.logger.error(`Failed to fetch Spiget category resources: ${e.message}`);
            return [];
        }
    }

    async searchSpiget(query: string, page = 1, size = 20, categoryId?: number): Promise<any[]> {
        try {
            const trimmed = query?.trim() || '';

            if (categoryId) {
                const resources = await this.getSpigetCategoryResources(categoryId, page, size);
                if (!trimmed) return resources;
                const needle = trimmed.toLowerCase();
                return resources.filter((item: any) => {
                    const name = String(item?.name || '').toLowerCase();
                    const tag = String(item?.tag || '').toLowerCase();
                    return name.includes(needle) || tag.includes(needle);
                });
            }

            const { data } = await axios.get(`${this.spigetApi}/search/resources/${encodeURIComponent(trimmed || 'plugin')}`, {
                params: { page, size, sort: '-downloads', field: 'name' },
            });
            return Array.isArray(data) ? data : [];
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
                params: { size: 20, sort: '-releaseDate' },
            });
            return Array.isArray(data) ? data : [];
        } catch (e) {
            this.logger.error(`Spiget versions failed: ${e.message}`);
            return [];
        }
    }

    async getSpigetLatestVersion(resourceId: number): Promise<any | null> {
        try {
            const { data } = await axios.get(`${this.spigetApi}/resources/${resourceId}/versions/latest`);
            return data || null;
        } catch {
            const versions = await this.getSpigetResourceVersions(resourceId);
            return versions[0] || null;
        }
    }

    // ========== INSTALL (One-Click) ==========

    async installFromModrinth(serverUuid: string, projectId: string, versionId: string): Promise<any> {
        const profile = await this.detectServerSoftware(serverUuid);
        if (!profile.isMinecraft) throw new BadRequestException('Plugin system is only available for Minecraft servers');

        try {
            const { data: version } = await axios.get(`${this.modrinthApi}/version/${versionId}`, {
                headers: { 'User-Agent': 'GameHost/1.0' },
            });

            if (!version?.files?.length) {
                throw new BadRequestException('No files found in selected Modrinth version');
            }

            const file = version.files.find((f: any) => f.primary) || version.files[0];
            const downloadUrl = file.url;
            const fileName = file.filename;

            const { data: fileData } = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5,
                timeout: 30000,
                headers: { 'User-Agent': 'GameHost/1.0' },
            });

            const uploadUrl = await this.pterodactylClient.uploadFileUrl(serverUuid, profile.installDir);
            if (!uploadUrl) throw new BadRequestException('Failed to get upload URL from panel');

            const form = new FormData();
            form.append('files', Buffer.from(fileData), { filename: fileName });
            await axios.post(uploadUrl, form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            await this.upsertRegistryEntry(serverUuid, {
                fileName,
                source: 'modrinth',
                type: profile.type,
                projectId: String(version.project_id || projectId),
                versionId: String(version.id || versionId),
                versionName: String(version.version_number || version.name || ''),
                title: String(version.name || version.project_id || projectId),
                installedAt: new Date().toISOString(),
            });

            this.logger.log(`Installed ${fileName} from Modrinth to ${profile.installDir}`);
            return { success: true, fileName, versionId: String(version.id || versionId), versionName: version.version_number || null };
        } catch (e) {
            if (e instanceof BadRequestException) throw e;
            this.logger.error(`Install from Modrinth failed: ${e.message}`);
            return { success: false };
        }
    }

    async installFromSpiget(serverUuid: string, resourceId: number): Promise<any> {
        const profile = await this.detectServerSoftware(serverUuid);
        if (!profile.isMinecraft) throw new BadRequestException('Plugin system is only available for Minecraft servers');
        if (profile.type === 'mod') {
            throw new BadRequestException('SpigotMC source is for plugin servers. Use Modrinth for mods.');
        }

        try {
            const resource = await this.getSpigetResource(resourceId);
            if (!resource) throw new BadRequestException('Spigot resource not found');

            if (resource.premium) {
                throw new BadRequestException('Premium resources cannot be installed automatically. Please download manually from SpigotMC.');
            }
            if (resource.external) {
                throw new BadRequestException(
                    `This resource is hosted externally${resource.file?.externalUrl ? ` at ${resource.file.externalUrl}` : ''}. Please download it manually and upload via the file manager.`,
                );
            }

            if (!this.isVersionCompatible(resource.testedVersions, profile.minecraftVersion)) {
                throw new BadRequestException(
                    `This plugin is not marked compatible with Minecraft ${profile.minecraftVersion}. Tested versions: ${resource.testedVersions?.join(', ') || 'unknown'}.`,
                );
            }

            const latestVersion = await this.getSpigetLatestVersion(resourceId);
            const downloadUrl = `${this.spigetApi}/resources/${resourceId}/download`;
            const { data: fileData, headers } = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5,
                timeout: 30000,
                headers: { 'User-Agent': 'GameHost/1.0' },
            });

            const contentType = headers['content-type'] || '';
            if (String(contentType).includes('text/html') || String(contentType).includes('text/plain')) {
                throw new BadRequestException('Download failed — resource may be external or unavailable.');
            }

            const fileName = headers['content-disposition']?.match(/filename="?([^";\s]+)"?/)?.[1]
                || `${String(resource.name || `plugin_${resourceId}`).replace(/[^a-zA-Z0-9._-]/g, '_')}.jar`;

            const uploadUrl = await this.pterodactylClient.uploadFileUrl(serverUuid, '/plugins');
            if (!uploadUrl) throw new BadRequestException('Failed to get upload URL from panel');

            const form = new FormData();
            form.append('files', Buffer.from(fileData), { filename: fileName });
            await axios.post(uploadUrl, form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            await this.upsertRegistryEntry(serverUuid, {
                fileName,
                source: 'spiget',
                type: 'plugin',
                resourceId,
                versionId: latestVersion?.id ? String(latestVersion.id) : undefined,
                versionName: latestVersion?.name ? String(latestVersion.name) : undefined,
                title: String(resource.name || `Spiget ${resourceId}`),
                installedAt: new Date().toISOString(),
            });

            this.logger.log(`Installed ${fileName} from Spiget`);
            return { success: true, fileName, versionId: latestVersion?.id ? String(latestVersion.id) : null, versionName: latestVersion?.name || null };
        } catch (e) {
            if (e instanceof BadRequestException) throw e;
            this.logger.error(`Install from Spiget failed: ${e.message}`);
            return { success: false };
        }
    }

    // ========== INSTALLED PLUGINS/MODS ==========

    async getInstalledPlugins(serverUuid: string): Promise<any[]> {
        const profile = await this.detectServerSoftware(serverUuid);
        if (!profile.isMinecraft) return [];

        const files = await this.pterodactylClient.listFiles(serverUuid, profile.installDir);
        const registry = await this.readRegistry(serverUuid);

        return files
            .filter((f: any) => f.name?.toLowerCase().endsWith('.jar'))
            .map((f: any) => {
                const fileName = String(f.name);
                const tracked = registry.find((item) => item.fileName === fileName);
                return {
                    ...f,
                    file: fileName,
                    fileName,
                    source: tracked?.source || null,
                    projectId: tracked?.projectId || null,
                    resourceId: tracked?.resourceId || null,
                    installedViaPanel: !!tracked,
                    currentVersion: tracked?.versionName || this.parseVersionFromFileName(fileName),
                    installedAt: tracked?.installedAt || null,
                };
            });
    }

    async removePlugin(serverUuid: string, fileName: string): Promise<boolean> {
        const profile = await this.detectServerSoftware(serverUuid);
        if (!profile.isMinecraft) throw new BadRequestException('Plugin system is only available for Minecraft servers');

        const removed = await this.pterodactylClient.deleteFiles(serverUuid, profile.installDir, [fileName]);
        if (removed) await this.removeRegistryFile(serverUuid, fileName);
        return removed;
    }

    // ========== UPDATE CHECKING ==========

    async checkPluginUpdates(serverUuid: string): Promise<PluginUpdateInfo[]> {
        const profile = await this.detectServerSoftware(serverUuid);
        if (!profile.isMinecraft) return [];

        try {
            const installed = await this.getInstalledPlugins(serverUuid);
            if (!installed.length) return [];
            const registry = await this.readRegistry(serverUuid);
            const updates: PluginUpdateInfo[] = [];

            for (const plugin of installed) {
                const fileName = String(plugin.fileName || plugin.name || '');
                const tracked = registry.find((item) => item.fileName === fileName);
                if (!tracked) continue;

                if (tracked.source === 'modrinth' && tracked.projectId) {
                    const versions = await this.getModrinthVersions(
                        tracked.projectId,
                        profile.loaders,
                        profile.minecraftVersion ? [profile.minecraftVersion] : undefined,
                    );
                    const latest = versions[0];
                    if (latest && String(latest.id) !== String(tracked.versionId || '')) {
                        updates.push({
                            fileName,
                            source: 'modrinth',
                            managed: true,
                            title: tracked.title || latest.name || tracked.projectId,
                            projectId: tracked.projectId,
                            currentVersion: tracked.versionName || plugin.currentVersion || null,
                            latestVersion: latest.version_number || latest.name || null,
                            latestVersionId: String(latest.id),
                            compatible: true,
                        });
                    }
                }

                if (tracked.source === 'spiget' && tracked.resourceId) {
                    const resource = await this.getSpigetResource(tracked.resourceId);
                    const latest = await this.getSpigetLatestVersion(tracked.resourceId);
                    if (!latest) continue;
                    const compatible = this.isVersionCompatible(resource?.testedVersions, profile.minecraftVersion);

                    if (String(latest.id) !== String(tracked.versionId || '')) {
                        updates.push({
                            fileName,
                            source: 'spiget',
                            managed: true,
                            title: tracked.title || resource?.name || `Spiget ${tracked.resourceId}`,
                            resourceId: tracked.resourceId,
                            currentVersion: tracked.versionName || plugin.currentVersion || null,
                            latestVersion: latest.name ? String(latest.name) : String(latest.id),
                            latestVersionId: String(latest.id),
                            compatible,
                            compatibilityNote: compatible ? undefined : `Not marked compatible with Minecraft ${profile.minecraftVersion || 'current server version'}`,
                        });
                    }
                }
            }

            return updates;
        } catch (e) {
            this.logger.error(`Check updates failed: ${e.message}`);
            return [];
        }
    }

    private async applyUpdate(serverUuid: string, update: PluginUpdateInfo): Promise<{ success: boolean; fileName: string; newFileName?: string; reason?: string }> {
        if (!update.managed) {
            return { success: false, fileName: update.fileName, reason: 'Plugin is not managed by panel installer' };
        }

        if (update.source === 'modrinth' && update.projectId && update.latestVersionId) {
            const result = await this.installFromModrinth(serverUuid, update.projectId, update.latestVersionId);
            const newFileName = result?.fileName as string | undefined;
            if (result?.success && newFileName && newFileName !== update.fileName) {
                const profile = await this.detectServerSoftware(serverUuid);
                await this.pterodactylClient.deleteFiles(serverUuid, profile.installDir, [update.fileName]);
                await this.removeRegistryFile(serverUuid, update.fileName);
            }
            return { success: !!result?.success, fileName: update.fileName, newFileName };
        }

        if (update.source === 'spiget' && update.resourceId) {
            if (update.compatible === false) {
                return { success: false, fileName: update.fileName, reason: update.compatibilityNote || 'Version is not compatible with this server' };
            }
            const result = await this.installFromSpiget(serverUuid, update.resourceId);
            const newFileName = result?.fileName as string | undefined;
            if (result?.success && newFileName && newFileName !== update.fileName) {
                await this.pterodactylClient.deleteFiles(serverUuid, '/plugins', [update.fileName]);
                await this.removeRegistryFile(serverUuid, update.fileName);
            }
            return { success: !!result?.success, fileName: update.fileName, newFileName };
        }

        return { success: false, fileName: update.fileName, reason: 'Invalid update metadata' };
    }

    async updateOnePlugin(serverUuid: string, fileName: string): Promise<any> {
        const updates = await this.checkPluginUpdates(serverUuid);
        const target = updates.find((item) => item.fileName === fileName);
        if (!target) throw new BadRequestException('No available update found for this plugin/mod');
        return this.applyUpdate(serverUuid, target);
    }

    async updateAllPlugins(serverUuid: string, source?: PluginSource): Promise<any> {
        const updates = await this.checkPluginUpdates(serverUuid);
        const candidates = updates.filter((item) => !source || item.source === source);

        const updated: any[] = [];
        const failed: any[] = [];

        for (const update of candidates) {
            try {
                const result = await this.applyUpdate(serverUuid, update);
                if (result.success) updated.push(result);
                else failed.push(result);
            } catch (e) {
                failed.push({ success: false, fileName: update.fileName, reason: e.message });
            }
        }

        return {
            total: candidates.length,
            updated: updated.length,
            failed: failed.length,
            updatedItems: updated,
            failedItems: failed,
        };
    }
}
