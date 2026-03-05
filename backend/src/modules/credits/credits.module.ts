import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';

@Module({
    imports: [ConfigModule, PterodactylModule],
    controllers: [CreditsController],
    providers: [CreditsService],
    exports: [CreditsService],
})
export class CreditsModule { }
