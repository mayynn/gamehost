import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) { }

    @Get()
    async check() {
        const checks: Record<string, string> = {};

        // Database check
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            checks.database = 'connected';
        } catch {
            checks.database = 'disconnected';
        }

        // Redis check
        try {
            const Redis = require('ioredis');
            const redisUrl = this.config.get('REDIS_URL');
            if (redisUrl) {
                const redis = new Redis(redisUrl, { connectTimeout: 3000, lazyConnect: true });
                await redis.connect();
                await redis.ping();
                checks.redis = 'connected';
                redis.disconnect();
            } else {
                checks.redis = 'not_configured';
            }
        } catch {
            checks.redis = 'disconnected';
        }

        const allHealthy = Object.values(checks).every(v => v === 'connected' || v === 'not_configured');

        return {
            status: allHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            version: process.env.npm_package_version || '1.0.0',
            node: process.version,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
                heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            },
            checks,
        };
    }
}
