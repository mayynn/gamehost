import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudflareService } from './cloudflare.service';

@Module({
    imports: [ConfigModule],
    providers: [CloudflareService],
    exports: [CloudflareService],
})
export class CloudflareModule { }
