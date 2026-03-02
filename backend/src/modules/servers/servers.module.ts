import { Module } from '@nestjs/common';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PterodactylModule, AuthModule],
    controllers: [ServersController],
    providers: [ServersService],
    exports: [ServersService],
})
export class ServersModule { }
