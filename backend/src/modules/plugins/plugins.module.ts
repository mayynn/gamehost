import { Module } from '@nestjs/common';
import { PluginsController } from './plugins.controller';
import { PluginsService } from './plugins.service';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';
import { ServersModule } from '../servers/servers.module';

@Module({
    imports: [PterodactylModule, ServersModule],
    controllers: [PluginsController],
    providers: [PluginsService],
    exports: [PluginsService],
})
export class PluginsModule { }
