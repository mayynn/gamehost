import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';
import { ServersModule } from '../servers/servers.module';

@Module({
    imports: [PterodactylModule, ServersModule],
    controllers: [PlayersController],
    providers: [PlayersService],
    exports: [PlayersService],
})
export class PlayersModule { }
