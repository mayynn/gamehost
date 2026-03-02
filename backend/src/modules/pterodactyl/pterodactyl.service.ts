import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
            const { data } = await this.api.post('/users', userData);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create user: ${e.message}`);
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
            const { data } = await this.api.post('/servers', serverData);
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to create server: ${e.message}`);
            this.logger.error(JSON.stringify(e.response?.data || {}));
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
            const { data } = await this.api.patch(`/servers/${id}/build`, {
                allocation: 0, // keep existing
                ...build,
            });
            return data.attributes;
        } catch (e) {
            this.logger.error(`Failed to update server build ${id}: ${e.message}`);
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
            allEggs.push(...eggs.map((egg) => ({ ...egg, nestId: nest.id, nestName: nest.name })));
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
