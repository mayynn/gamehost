import { Injectable, Logger } from '@nestjs/common';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';

@Injectable()
export class PlayersService {
    private readonly logger = new Logger(PlayersService.name);

    constructor(private pterodactylClient: PterodactylClientService) { }

    // Detect if server is a Minecraft server
    async isMinecraftServer(serverUuid: string): Promise<boolean> {
        try {
            const files = await this.pterodactylClient.listFiles(serverUuid, '/');
            const names = files.map((f: any) => f.name?.toLowerCase());
            return names.includes('server.properties') || names.includes('plugins') || names.includes('mods');
        } catch {
            return false;
        }
    }

    // Get online players from server
    async getOnlinePlayers(serverUuid: string): Promise<string[]> {
        try {
            // Send list command and parse output
            await this.pterodactylClient.sendCommand(serverUuid, 'list');
            // Note: In a real implementation, you'd parse WebSocket output
            // For now, return from ops/whitelist files
            return [];
        } catch {
            return [];
        }
    }

    // Get whitelist
    async getWhitelist(serverUuid: string): Promise<any[]> {
        try {
            const content = await this.pterodactylClient.getFileContents(serverUuid, '/whitelist.json');
            return content ? JSON.parse(content) : [];
        } catch {
            return [];
        }
    }

    // Add to whitelist
    async addToWhitelist(serverUuid: string, player: string): Promise<boolean> {
        return this.pterodactylClient.sendCommand(serverUuid, `whitelist add ${player}`);
    }

    // Remove from whitelist
    async removeFromWhitelist(serverUuid: string, player: string): Promise<boolean> {
        return this.pterodactylClient.sendCommand(serverUuid, `whitelist remove ${player}`);
    }

    // Get banned players
    async getBannedPlayers(serverUuid: string): Promise<any[]> {
        try {
            const content = await this.pterodactylClient.getFileContents(serverUuid, '/banned-players.json');
            return content ? JSON.parse(content) : [];
        } catch {
            return [];
        }
    }

    // Ban player
    async banPlayer(serverUuid: string, player: string, reason?: string): Promise<boolean> {
        const cmd = reason ? `ban ${player} ${reason}` : `ban ${player}`;
        return this.pterodactylClient.sendCommand(serverUuid, cmd);
    }

    // Unban player
    async unbanPlayer(serverUuid: string, player: string): Promise<boolean> {
        return this.pterodactylClient.sendCommand(serverUuid, `pardon ${player}`);
    }

    // Get ops
    async getOps(serverUuid: string): Promise<any[]> {
        try {
            const content = await this.pterodactylClient.getFileContents(serverUuid, '/ops.json');
            return content ? JSON.parse(content) : [];
        } catch {
            return [];
        }
    }

    // Op player
    async opPlayer(serverUuid: string, player: string): Promise<boolean> {
        return this.pterodactylClient.sendCommand(serverUuid, `op ${player}`);
    }

    // Deop player
    async deopPlayer(serverUuid: string, player: string): Promise<boolean> {
        return this.pterodactylClient.sendCommand(serverUuid, `deop ${player}`);
    }

    // Kick player
    async kickPlayer(serverUuid: string, player: string, reason?: string): Promise<boolean> {
        const cmd = reason ? `kick ${player} ${reason}` : `kick ${player}`;
        return this.pterodactylClient.sendCommand(serverUuid, cmd);
    }
}
