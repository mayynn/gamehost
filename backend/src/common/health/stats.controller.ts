import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { STATS_CACHE_TTL } from '../constants';

/**
 * Public stats endpoint — no auth required.
 * Powers the landing page real-time stats strip.
 * Cached to avoid DB hammering on every page load.
 */
@Controller('stats')
export class StatsController {
    private cache: { data: any; ts: number } | null = null;

    constructor(private prisma: PrismaService) {}

    @Get()
    async getPublicStats() {
        if (this.cache && Date.now() - this.cache.ts < STATS_CACHE_TTL) {
            return this.cache.data;
        }

        const [activeServers, totalUsers, totalServers] = await Promise.all([
            this.prisma.server.count({ where: { status: 'ACTIVE' } }),
            this.prisma.user.count(),
            this.prisma.server.count(),
        ]);

        const data = {
            activeServers,
            totalUsers,
            totalServers,
            uptime: '99.9',
        };

        this.cache = { data, ts: Date.now() };
        return data;
    }
}
