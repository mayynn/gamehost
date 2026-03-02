import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PterodactylModule } from './modules/pterodactyl/pterodactyl.module';
import { ServersModule } from './modules/servers/servers.module';
import { PlansModule } from './modules/plans/plans.module';
import { BillingModule } from './modules/billing/billing.module';
import { CreditsModule } from './modules/credits/credits.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { PlayersModule } from './modules/players/players.module';
import { VpsModule } from './modules/vps/vps.module';
import { AdminModule } from './modules/admin/admin.module';
import { DiscordModule } from './modules/discord/discord.module';
import { CloudflareModule } from './modules/cloudflare/cloudflare.module';
import { PaymenterModule } from './modules/paymenter/paymenter.module';
import { HealthModule } from './common/health/health.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        ScheduleModule.forRoot(),
        PrismaModule,
        AuthModule,
        UsersModule,
        PterodactylModule,
        ServersModule,
        PlansModule,
        BillingModule,
        CreditsModule,
        PluginsModule,
        PlayersModule,
        VpsModule,
        AdminModule,
        DiscordModule,
        CloudflareModule,
        PaymenterModule,
        HealthModule,
    ],
})
export class AppModule { }
