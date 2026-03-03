import { Module } from '@nestjs/common';
import { HealthController, RootController } from './health.controller';
import { SettingsController } from './settings.controller';

@Module({
    controllers: [HealthController, RootController, SettingsController],
})
export class HealthModule { }
