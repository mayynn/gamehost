import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Public settings controller — exposes only whitelisted,
 * non-sensitive settings to unauthenticated users.
 */
const PUBLIC_KEYS = [
    'DISCORD_INVITE_URL',
    'SUPPORT_EMAIL',
    'SITE_NAME',
    'SITE_DESCRIPTION',
];

@Controller('settings')
export class SettingsController {
    constructor(private prisma: PrismaService) {}

    @Get('public')
    async getPublicSettings() {
        const settings = await this.prisma.adminSetting.findMany({
            where: { key: { in: PUBLIC_KEYS } },
        });
        return settings.reduce(
            (acc, s) => ({ ...acc, [s.key]: s.value }),
            {} as Record<string, string>,
        );
    }
}
