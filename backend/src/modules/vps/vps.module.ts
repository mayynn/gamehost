import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VpsController } from './vps.controller';
import { VpsService } from './vps.service';

@Module({
    imports: [ConfigModule],
    controllers: [VpsController],
    providers: [VpsService],
    exports: [VpsService],
})
export class VpsModule { }
