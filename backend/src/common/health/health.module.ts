import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RootController } from './root.controller';
import { StatsController } from './stats.controller';
import { SettingsController } from './settings.controller';

@Module({
    controllers: [HealthController, RootController, StatsController, SettingsController],
})
export class HealthModule { }
