import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Cloudflare DNS API Service
 * Used for automated subdomain creation (e.g., servername.play.gamehost.com)
 */
@Injectable()
export class CloudflareService {
    private readonly logger = new Logger(CloudflareService.name);
    private api: AxiosInstance;
    private zoneId: string;
    private enabled: boolean;

    constructor(private config: ConfigService) {
        this.enabled = config.get('CLOUDFLARE_ENABLED') === 'true';
        this.zoneId = config.get('CLOUDFLARE_ZONE_ID', '');

        this.api = axios.create({
            baseURL: 'https://api.cloudflare.com/client/v4',
            headers: {
                Authorization: `Bearer ${config.get('CLOUDFLARE_API_TOKEN', '')}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
    }

    // ---------- DNS Records ----------

    async createARecord(name: string, ip: string, proxied = false): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.post(`/zones/${this.zoneId}/dns_records`, {
                type: 'A',
                name,
                content: ip,
                proxied,
                ttl: proxied ? 1 : 300,
            });
            this.logger.log(`Created A record: ${name} → ${ip}`);
            return data.result;
        } catch (e) {
            this.logger.error(`Failed to create A record: ${e.message}`);
            return null;
        }
    }

    async createSRVRecord(name: string, target: string, port: number, priority = 0, weight = 5): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.post(`/zones/${this.zoneId}/dns_records`, {
                type: 'SRV',
                name: `_minecraft._tcp.${name}`,
                data: {
                    service: '_minecraft',
                    proto: '_tcp',
                    name,
                    priority,
                    weight,
                    port,
                    target,
                },
            });
            this.logger.log(`Created SRV record: ${name} → ${target}:${port}`);
            return data.result;
        } catch (e) {
            this.logger.error(`Failed to create SRV record: ${e.message}`);
            return null;
        }
    }

    async deleteDnsRecord(recordId: string): Promise<boolean> {
        if (!this.enabled) return false;
        try {
            await this.api.delete(`/zones/${this.zoneId}/dns_records/${recordId}`);
            this.logger.log(`Deleted DNS record: ${recordId}`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to delete DNS record: ${e.message}`);
            return false;
        }
    }

    async listDnsRecords(name?: string): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const params: any = { per_page: 100 };
            if (name) params.name = name;
            const { data } = await this.api.get(`/zones/${this.zoneId}/dns_records`, { params });
            return data.result || [];
        } catch (e) {
            this.logger.error(`Failed to list DNS records: ${e.message}`);
            return [];
        }
    }

    async updateDnsRecord(recordId: string, ip: string): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.patch(`/zones/${this.zoneId}/dns_records/${recordId}`, {
                content: ip,
            });
            return data.result;
        } catch (e) {
            this.logger.error(`Failed to update DNS record: ${e.message}`);
            return null;
        }
    }

    // ---------- Auto-Subdomain for Game Servers ----------

    async createServerSubdomain(serverName: string, nodeIp: string, port: number): Promise<{ a?: any; srv?: any } | null> {
        if (!this.enabled) return null;
        const baseDomain = this.config.get('CLOUDFLARE_BASE_DOMAIN', 'play.gamehost.com');
        const subdomain = serverName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const fullDomain = `${subdomain}.${baseDomain}`;

        const aRecord = await this.createARecord(fullDomain, nodeIp);
        const srvRecord = await this.createSRVRecord(fullDomain, fullDomain, port);

        return { a: aRecord, srv: srvRecord };
    }

    async deleteServerSubdomain(serverName: string): Promise<void> {
        if (!this.enabled) return;
        const baseDomain = this.config.get('CLOUDFLARE_BASE_DOMAIN', 'play.gamehost.com');
        const subdomain = serverName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const fullDomain = `${subdomain}.${baseDomain}`;

        const records = await this.listDnsRecords(fullDomain);
        for (const record of records) {
            await this.deleteDnsRecord(record.id);
        }
    }
}
