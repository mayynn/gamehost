import { Module } from '@nestjs/common';
import { HealthController, RootController, StatsController } from './health.controller';
import { SettingsController } from './settings.controller';

@Module({
    controllers: [HealthController, RootController, StatsController, SettingsController],
})
export class HealthModule { }
