import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PterodactylService } from './pterodactyl.service';
import { PterodactylClientService } from './pterodactyl-client.service';

@Module({
    imports: [ConfigModule],
    providers: [PterodactylService, PterodactylClientService],
    exports: [PterodactylService, PterodactylClientService],
})
export class PterodactylModule { }
