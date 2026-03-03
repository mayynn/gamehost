import { Controller, Get, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController implements OnModuleInit, OnModuleDestroy {
    private redis: any = null;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) { }

    async onModuleInit() {
        const redisUrl = this.config.get('REDIS_URL');
        if (redisUrl) {
            try {
                const Redis = require('ioredis');
                this.redis = new Redis(redisUrl, {
                    connectTimeout: 3000,
                    lazyConnect: true,
                    maxRetriesPerRequest: 1,
                });
                await this.redis.connect();
            } catch {
                this.redis = null;
            }
        }
    }

    async onModuleDestroy() {
        if (this.redis) {
            try { this.redis.disconnect(); } catch { }
        }
    }

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

        // Redis check (uses singleton connection, no leak)
        if (this.redis) {
            try {
                await this.redis.ping();
                checks.redis = 'connected';
            } catch {
                checks.redis = 'disconnected';
            }
        } else {
            checks.redis = 'not_configured';
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

/**
 * Root controller — responds at GET / (outside the /api prefix)
 * so users don't see a confusing 404 when visiting the backend URL directly.
 */
@Controller()
export class RootController {
    @Get()
    root() {
        return {
            name: 'GameHost Platform API',
            status: 'running',
            version: process.env.npm_package_version || '1.0.0',
            endpoints: {
                health: '/api/health',
                auth: '/api/auth/google',
                docs: '/api',
            },
        };
    }
}
