import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import axios, { AxiosInstance } from 'axios';

/**
 * Pterodactyl Application API Service (Admin)
 * Used for user management, server provisioning, node/egg management
 */
@Injectable()
export class PterodactylService {
    private readonly logger = new Logger(PterodactylService.name);
    private api: AxiosInstance;

    constructor(private config: ConfigService) {
        const baseURL = config.get('PTERODACTYL_URL', 'http://localhost');
        const apiKey = config.get('PTERODACTYL_APP_KEY', '');

        this.api = axios.create({
            baseURL: `${baseURL}/api/application`,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
    }

    // ========== USERS ==========

    async getUsers(page = 1): Promise<any> {
        try {
            const { data } = await this.api.get(`/users?page=${page}`);
            return data;
        } catch (e) {
            this.logger.error(`Failed to get users: ${e.message}`);
            return null;
        }
    }

    async getUserById(id: number): Promise<any> {
        try {
            const { data } = await this.api.get(`/users/${id}`);
            return data.attributes;
        } catch (e) {
            if (e.response?.status === 404) return null;
            this.logger.error(`Failed to get user ${id}: ${e.message}`);
            return null;
        }
    }

    async findUserByEmail(email: string): Promise<any> {
        try {
            const { data } = await this.api.get(`/users?filter[email]=${encodeURIComponent(email)}`);
            if (data.data?.length > 0) {
                return data.data[0].attributes;
            }
            return null;
        } catch (e) {
            this.logger.error(`Failed to find user by email: ${e.message}`);
            return null;
        }
    }

    async createUser(userData: {
        email: string;
        username: string;
        first_name: string;
        last_name: string;
    }): Promise<any> {
        try {
            // Pterodactyl API requires a password field for user creation.
            // Generate a strong random password — users authenticate through our platform,
            // not directly to Pterodactyl, so this password is never exposed.
            const password = randomBytes(24).toString('base64url');
            const { data } = await this.api.post('/users', { ...userData, password });
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create user: ${e.message}`);
            if (e.response?.data) {
                this.logger.error(`Pterodactyl response: ${JSON.stringify(e.response.data)}`);
            }
            return null;
        }
    }

    async deleteUser(id: number): Promise<boolean> {
        try {
            await this.api.delete(`/users/${id}`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to delete user ${id}: ${e.message}`);
            return false;
        }
    }

    // ========== SERVERS ==========

    async getServers(page = 1): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers?page=${page}`);
            return data;
        } catch (e) {
            this.logger.error(`Failed to get servers: ${e.message}`);
            return null;
        }
    }

    async getServerById(id: number): Promise<any> {
        try {
            const { data } = await this.api.get(`/servers/${id}?include=allocations`);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to get server ${id}: ${e.message}`);
            return null;
        }
    }

    async createServer(serverData: {
        name: string;
        user: number;
        egg: number;
        docker_image: string;
        startup: string;
        environment: Record<string, string>;
        limits: { memory: number; swap: number; disk: number; io: number; cpu: number };
        feature_limits: { databases: number; backups: number; allocations: number };
        allocation?: { default: number };
        deploy?: { locations: number[]; dedicated_ip: boolean; port_range: string[] };
    }): Promise<any> {
        try {
            // Ensure oom_disabled is set (prevents OOM killer from terminating game servers)
            const payload = {
                ...serverData,
                oom_disabled: true,
            };
            const { data } = await this.api.post('/servers', payload);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create server: ${e.message}`);
            if (e.response?.data) {
                this.logger.error(`Pterodactyl response: ${JSON.stringify(e.response.data)}`);
            }
            return null;
        }
    }

    async suspendServer(id: number): Promise<boolean> {
        try {
            await this.api.post(`/servers/${id}/suspend`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to suspend server ${id}: ${e.message}`);
            return false;
        }
    }

    async unsuspendServer(id: number): Promise<boolean> {
        try {
            await this.api.post(`/servers/${id}/unsuspend`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to unsuspend server ${id}: ${e.message}`);
            return false;
        }
    }

    async deleteServer(id: number, force = false): Promise<boolean> {
        try {
            const url = force ? `/servers/${id}/force` : `/servers/${id}`;
            await this.api.delete(url);
            return true;
        } catch (e) {
            // If soft delete fails and we haven't tried force yet, retry with force
            if (!force && e.response?.status && e.response.status >= 500) {
                this.logger.warn(`Soft delete failed for server ${id}, retrying with force delete...`);
                return this.deleteServer(id, true);
            }
            this.logger.error(`Failed to delete server ${id}: ${e.message}`);
            return false;
        }
    }

    async updateServerBuild(id: number, build: {
        memory: number;
        swap: number;
        disk: number;
        io: number;
        cpu: number;
        feature_limits: { databases: number; backups: number; allocations: number };
    }): Promise<any> {
        try {
            // First get the server to find its current default allocation
            // Pterodactyl PATCH /servers/{id}/build requires the `allocation` field (default allocation ID)
            const server = await this.getServerById(id);
            const defaultAllocation = server?.relationships?.allocations?.data?.[0]?.attributes?.id
                || server?.allocation;

            if (!defaultAllocation) {
                this.logger.error(`Cannot update build for server ${id}: no default allocation found`);
                return null;
            }

            const payload = {
                allocation: defaultAllocation,
                memory: build.memory,
                swap: build.swap,
                disk: build.disk,
                io: build.io,
                cpu: build.cpu,
                feature_limits: build.feature_limits,
                oom_disabled: true,
            };

            const { data } = await this.api.patch(`/servers/${id}/build`, payload);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to update server build ${id}: ${e.message}`);
            if (e.response?.data) {
                this.logger.error(`Pterodactyl response: ${JSON.stringify(e.response.data)}`);
            }
            return null;
        }
    }

    // ========== NODES ==========

    async getNodes(): Promise<any[]> {
        try {
            const { data } = await this.api.get('/nodes');
            return data.data.map((n: any) => n.attributes);
        } catch (e) {
            this.logger.error(`Failed to get nodes: ${e.message}`);
            return [];
        }
    }

    async getNode(id: number): Promise<any> {
        try {
            const { data } = await this.api.get(`/nodes/${id}?include=allocations`);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to get node ${id}: ${e.message}`);
            return null;
        }
    }

    async getNodeAllocations(nodeId: number, page = 1): Promise<any> {
        try {
            const { data } = await this.api.get(`/nodes/${nodeId}/allocations?page=${page}`);
            return data;
        } catch (e) {
            this.logger.error(`Failed to get allocations for node ${nodeId}: ${e.message}`);
            return null;
        }
    }

    /**
     * Find a free (unassigned) allocation on a node, paginating through all pages
     */
    async findFreeAllocation(nodeId: number): Promise<{ id: number; ip: string; port: number } | null> {
        let page = 1;
        const maxPages = 50; // safety limit
        while (page <= maxPages) {
            const result = await this.getNodeAllocations(nodeId, page);
            if (!result?.data?.length) return null;

            for (const alloc of result.data) {
                if (!alloc.attributes.assigned) {
                    return {
                        id: alloc.attributes.id,
                        ip: alloc.attributes.ip,
                        port: alloc.attributes.port,
                    };
                }
            }

            // Check if there are more pages
            const meta = result.meta?.pagination;
            if (!meta || page >= meta.total_pages) break;
            page++;
        }
        return null;
    }

    // ========== NESTS & EGGS ==========

    async getNests(): Promise<any[]> {
        try {
            const { data } = await this.api.get('/nests');
            return data.data.map((n: any) => n.attributes);
        } catch (e) {
            this.logger.error(`Failed to get nests: ${e.message}`);
            return [];
        }
    }

    async getEggs(nestId: number): Promise<any[]> {
        try {
            const { data } = await this.api.get(`/nests/${nestId}/eggs?include=variables`);
            return data.data.map((e: any) => e.attributes);
        } catch (e) {
            this.logger.error(`Failed to get eggs for nest ${nestId}: ${e.message}`);
            return [];
        }
    }

    async getEgg(nestId: number, eggId: number): Promise<any> {
        try {
            const { data } = await this.api.get(`/nests/${nestId}/eggs/${eggId}?include=variables`);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to get egg ${eggId}: ${e.message}`);
            return null;
        }
    }

    async getAllEggs(): Promise<any[]> {
        const nests = await this.getNests();
        const allEggs: any[] = [];
        for (const nest of nests) {
            const eggs = await this.getEggs(nest.id);
            allEggs.push(...eggs.map((egg) => ({
                ...egg,
                nestId: nest.id,
                nestName: nest.name,
                // Normalize docker image — Pterodactyl v1 uses docker_image, v1.7+ uses docker_images map
                docker_image: egg.docker_image || (egg.docker_images ? Object.values(egg.docker_images)[0] : null),
            })));
        }
        return allEggs;
    }

    // ========== LOCATIONS ==========

    async getLocations(): Promise<any[]> {
        try {
            const { data } = await this.api.get('/locations');
            return data.data.map((l: any) => l.attributes);
        } catch (e) {
            this.logger.error(`Failed to get locations: ${e.message}`);
            return [];
        }
    }
}
