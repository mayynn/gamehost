import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';

@Module({
    imports: [ConfigModule],
    controllers: [CreditsController],
    providers: [CreditsService],
    exports: [CreditsService],
})
export class CreditsModule { }
