import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';

@Module({
    imports: [ConfigModule, PterodactylModule],
    controllers: [AuthController],
    providers: [AuthService, EmailService],
    exports: [AuthService],
})
export class AuthModule { }
