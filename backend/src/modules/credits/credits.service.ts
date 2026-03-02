import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ServerStatus } from '@prisma/client';

@Injectable()
export class CreditsService {
    private readonly logger = new Logger(CreditsService.name);

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
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
        const reward = parseInt(this.config.get('FREE_CREDITS_REWARD', '10'));
        const timerSeconds = parseInt(this.config.get('FREE_CREDITS_TIMER_SECONDS', '60'));

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

    getEarnConfig() {
        return {
            timerSeconds: parseInt(this.config.get('FREE_CREDITS_TIMER_SECONDS', '60')),
            reward: parseInt(this.config.get('FREE_CREDITS_REWARD', '10')),
            adsenseId: this.config.get('ADSENSE_PUBLISHER_ID', ''),
            adsterraUrl: this.config.get('ADSTERRA_SCRIPT_URL', ''),
        };
    }

    // Auto-suspend free servers with expired credits
    @Cron(CronExpression.EVERY_30_MINUTES)
    async checkFreeServerCredits() {
        const freeServers = await this.prisma.server.findMany({
            where: { isFreeServer: true, status: ServerStatus.ACTIVE },
            include: { user: { include: { credits: true } } },
        });

        for (const server of freeServers) {
            const credits = server.user.credits?.amount || 0;
            if (credits <= 0) {
                await this.prisma.server.update({
                    where: { id: server.id },
                    data: { status: ServerStatus.SUSPENDED },
                });
                this.logger.warn(`Free server ${server.id} suspended (no credits)`);
            }
        }

        // Auto-delete free servers after configured days
        const deleteDays = parseInt(this.config.get('FREE_SERVER_DELETE_DAYS', '7'));
        const deleteThreshold = new Date(Date.now() - deleteDays * 24 * 60 * 60 * 1000);

        await this.prisma.server.updateMany({
            where: {
                isFreeServer: true,
                status: ServerStatus.SUSPENDED,
                updatedAt: { lte: deleteThreshold },
            },
            data: { status: ServerStatus.DELETED },
        });
    }
}
