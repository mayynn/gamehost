import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { RedisService } from '../../common/redis/redis.service';
import { ServerStatus } from '@prisma/client';
import { FREE_SERVER_RENEWAL_DAYS, CREDITS_CRON_LOCK_TTL } from '../../common/constants';

@Injectable()
export class CreditsService {
    private readonly logger = new Logger(CreditsService.name);

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private pterodactyl: PterodactylService,
        private redis: RedisService,
    ) { }

    async getCredits(userId: string): Promise<number> {
        const credit = await this.prisma.credit.findUnique({ where: { userId } });
        return credit?.amount || 0;
    }

    async addCredits(userId: string, amount: number) {
        return this.prisma.credit.upsert({
            where: { userId },
            update: { amount: { increment: amount } },
            create: { userId, amount },
        });
    }

    async deductCredits(userId: string, amount: number): Promise<boolean> {
        const credit = await this.prisma.credit.findUnique({ where: { userId } });
        if (!credit || credit.amount < amount) return false;
        await this.prisma.credit.update({
            where: { userId },
            data: { amount: { decrement: amount } },
        });
        return true;
    }

    // Earn credits via ad watching
    async earnCredits(userId: string): Promise<any> {
        // Use admin DB settings (same source as getEarnConfig) instead of .env fallbacks
        const config = await this.buildEarnConfig();
        const reward = config.reward;
        const timerSeconds = config.timerSeconds;

        // Check last earn time
        const lastEarn = await this.prisma.creditEarn.findFirst({
            where: { userId },
            orderBy: { earnedAt: 'desc' },
        });

        if (lastEarn) {
            const elapsed = (Date.now() - lastEarn.earnedAt.getTime()) / 1000;
            if (elapsed < timerSeconds) {
                throw new BadRequestException(`Wait ${Math.ceil(timerSeconds - elapsed)} seconds before earning again`);
            }
        }

        // Record earn
        await this.prisma.creditEarn.create({
            data: { userId, amount: reward, verified: true },
        });

        await this.addCredits(userId, reward);
        return { earned: reward, total: await this.getCredits(userId) };
    }

    async getEarnConfig() {
        // Ad settings are managed via Admin Panel (stored in AdminSetting table)
        // and fall back to .env values if not set in DB
        return this.buildEarnConfig();
    }

    private async buildEarnConfig() {
        // Load admin overrides from DB
        const dbSettings = await this.prisma.adminSetting.findMany({
            where: {
                key: {
                    in: [
                        'ads_provider',
                        'ads_adsense_enabled',
                        'ads_adsense_publisher_id',
                        'ads_adsense_slot_id',
                        'ads_adsterra_enabled',
                        'ads_adsterra_urls',
                        'ads_anti_adblock',
                        'ads_timer_seconds',
                        'ads_reward',
                    ],
                },
            },
        });
        const db: Record<string, string> = {};
        for (const s of dbSettings) db[s.key] = s.value;

        // Provider mode: 'both' | 'adsense' | 'adsterra' | 'none'
        const provider = db['ads_provider'] || 'both';

        // AdSense
        const adsenseEnabled = provider === 'both' || provider === 'adsense';
        const adsenseId = adsenseEnabled
            ? (db['ads_adsense_publisher_id'] || this.config.get('ADSENSE_PUBLISHER_ID', ''))
            : '';
        const adsenseSlot = db['ads_adsense_slot_id'] || '';

        // Adsterra (multiple URLs)
        const adsterraEnabled = provider === 'both' || provider === 'adsterra';
        let adsterraUrls: string[] = [];
        if (adsterraEnabled) {
            const dbUrls = db['ads_adsterra_urls'];
            if (dbUrls) {
                adsterraUrls = dbUrls.split(',').map((u: string) => u.trim()).filter(Boolean);
            } else {
                // Fallback to .env
                const envRaw = this.config.get('ADSTERRA_SCRIPT_URLS', '') || this.config.get('ADSTERRA_SCRIPT_URL', '');
                adsterraUrls = envRaw ? envRaw.split(',').map((u: string) => u.trim()).filter(Boolean) : [];
            }
        }

        const antiAdblock = db['ads_anti_adblock'] !== 'false'; // default true

        return {
            timerSeconds: parseInt(db['ads_timer_seconds'] || this.config.get('FREE_CREDITS_TIMER_SECONDS', '60')),
            reward: parseInt(db['ads_reward'] || this.config.get('FREE_CREDITS_REWARD', '10')),
            provider,
            adsenseId,
            adsenseSlot,
            adsterraUrls,
            adsterraUrl: adsterraUrls[0] || '',
            antiAdblock,
        };
    }

    // Auto-suspend free servers whose renewal period has expired AND have no credits
    @Cron(CronExpression.EVERY_30_MINUTES)
    async checkFreeServerCredits() {
        const lockKey = 'lock:credits:checkFreeServerCredits';
        const acquired = await this.redis.acquireLock(lockKey, CREDITS_CRON_LOCK_TTL);
        if (!acquired) {
            this.logger.debug('checkFreeServerCredits: skipped — another instance holds the lock');
            return;
        }
        try {
            await this._checkFreeServerCredits();
        } finally {
            await this.redis.releaseLock(lockKey);
        }
    }

    private async _checkFreeServerCredits() {
        const now = new Date();

        // Only check free servers whose expiresAt has actually passed
        const freeServers = await this.prisma.server.findMany({
            where: {
                isFreeServer: true,
                status: ServerStatus.ACTIVE,
                expiresAt: { lte: now },
            },
            include: { user: { include: { credits: true } } },
        });

        for (const server of freeServers) {
            const credits = server.user.credits?.amount || 0;
            if (credits <= 0) {
                // Suspend in Pterodactyl first
                if (server.pteroServerId) {
                    try {
                        await this.pterodactyl.suspendServer(server.pteroServerId);
                    } catch (e: any) {
                        this.logger.error(`Failed to suspend server ${server.pteroServerId} in Pterodactyl: ${e.message}`);
                    }
                }
                await this.prisma.server.update({
                    where: { id: server.id },
                    data: { status: ServerStatus.SUSPENDED },
                });
                this.logger.warn(`Free server ${server.id} suspended (expired + no credits)`);
            } else {
                // User has credits — auto-renew the free server
                try {
                    await this.prisma.credit.update({
                        where: { userId: server.userId },
                        data: { amount: { decrement: 1 } },
                    });
                    const renewalDays = FREE_SERVER_RENEWAL_DAYS;
                    const newExpiry = new Date(now.getTime() + renewalDays * 24 * 60 * 60 * 1000);
                    await this.prisma.server.update({
                        where: { id: server.id },
                        data: { expiresAt: newExpiry, renewalNotified: false },
                    });
                    this.logger.log(`Free server ${server.id} auto-renewed with credits until ${newExpiry.toISOString()}`);
                } catch (e: any) {
                    this.logger.error(`Failed to auto-renew free server ${server.id}: ${e.message}`);
                }
            }
        }

        // Auto-delete free servers after configured days
        const deleteDays = parseInt(this.config.get('FREE_SERVER_DELETE_DAYS', '7'));
        const deleteThreshold = new Date(Date.now() - deleteDays * 24 * 60 * 60 * 1000);

        const serversToDelete = await this.prisma.server.findMany({
            where: {
                isFreeServer: true,
                status: ServerStatus.SUSPENDED,
                updatedAt: { lte: deleteThreshold },
            },
        });

        for (const server of serversToDelete) {
            // Delete from Pterodactyl first (force=true to ensure cleanup even if daemon is offline)
            if (server.pteroServerId) {
                try {
                    await this.pterodactyl.deleteServer(server.pteroServerId, true);
                } catch (e: any) {
                    this.logger.error(`Failed to delete server ${server.pteroServerId} from Pterodactyl: ${e.message}`);
                }
            }
            await this.prisma.server.update({
                where: { id: server.id },
                data: { status: ServerStatus.DELETED },
            });
            this.logger.warn(`Free server ${server.id} auto-deleted (suspended ${deleteDays}+ days)`);
        }
    }
}
