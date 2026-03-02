import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { VpsStatus } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class VpsService {
    private readonly logger = new Logger(VpsService.name);
    private api: AxiosInstance;
    private enabled: boolean;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        this.enabled = config.get('DATALIX_ENABLED') === 'true';
        this.api = axios.create({
            baseURL: config.get('DATALIX_API_URL', 'https://api.datalix.de/v1'),
            headers: {
                Authorization: `Bearer ${config.get('DATALIX_API_KEY', '')}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    async getPlans(): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const { data } = await this.api.get('/plans');
            return data.data || data;
        } catch (e) {
            this.logger.error(`Failed to get VPS plans: ${e.message}`);
            return [];
        }
    }

    async getUserVps(userId: string) {
        return this.prisma.vps.findMany({
            where: { userId, status: { not: VpsStatus.TERMINATED } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async provisionVps(userId: string, data: {
        planName: string;
        os: string;
        hostname: string;
    }) {
        if (!this.enabled) throw new BadRequestException('VPS hosting is not enabled');

        try {
            const { data: result } = await this.api.post('/servers', {
                plan: data.planName,
                os: data.os,
                hostname: data.hostname,
            });

            const vps = await this.prisma.vps.create({
                data: {
                    userId,
                    datalixId: result.id?.toString(),
                    planName: data.planName,
                    status: VpsStatus.PROVISIONING,
                    hostname: data.hostname,
                    os: data.os,
                    ip: result.ip || null,
                },
            });

            return vps;
        } catch (e) {
            this.logger.error(`VPS provisioning failed: ${e.message}`);
            throw new BadRequestException('VPS provisioning failed');
        }
    }

    async getVpsStatus(vpsId: string) {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) return vps;

        try {
            const { data } = await this.api.get(`/servers/${vps.datalixId}`);
            await this.prisma.vps.update({
                where: { id: vpsId },
                data: {
                    status: data.status === 'running' ? VpsStatus.ACTIVE : VpsStatus.SUSPENDED,
                    ip: data.ip || vps.ip,
                },
            });
            return { ...vps, liveData: data };
        } catch (e) {
            return vps;
        }
    }

    async controlVps(vpsId: string, action: 'start' | 'stop' | 'restart' | 'reinstall') {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) throw new BadRequestException('VPS not found');

        try {
            await this.api.post(`/servers/${vps.datalixId}/${action}`);
            return { success: true };
        } catch (e) {
            throw new BadRequestException(`VPS ${action} failed: ${e.message}`);
        }
    }

    async terminateVps(vpsId: string) {
        const vps = await this.prisma.vps.findUnique({ where: { id: vpsId } });
        if (!vps?.datalixId) throw new BadRequestException('VPS not found');

        try {
            await this.api.delete(`/servers/${vps.datalixId}`);
        } catch (e) {
            this.logger.error(`VPS termination API failed: ${e.message}`);
        }

        return this.prisma.vps.update({
            where: { id: vpsId },
            data: { status: VpsStatus.TERMINATED },
        });
    }
}
