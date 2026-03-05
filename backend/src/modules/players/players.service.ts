import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';

@Injectable()
export class PlayersService {
    private readonly logger = new Logger(PlayersService.name);

    constructor(private pterodactylClient: PterodactylClientService) { }

    /**
     * Validate Minecraft player name to prevent command injection.
     * Java Edition: 3-16 chars, [a-zA-Z0-9_]
     * Bedrock (Geyser): May start with ".", allow spaces, up to 32 chars
     */
    private validatePlayerName(name: string): string {
        const trimmed = name?.trim();
        if (!trimmed) {
            throw new BadRequestException('Player name is required');
        }
        if (trimmed.length > 32) {
            throw new BadRequestException('Player name too long (max 32 characters)');
        }
        // Allow: letters, digits, underscore, dot (Bedrock prefix), space (Bedrock names)
        // Block: newlines, semicolons, slashes, and other injection characters
        if (!/^[\w. ]{1,32}$/.test(trimmed)) {
            throw new BadRequestException('Invalid player name. Only letters, numbers, underscores, dots, and spaces are allowed.');
        }
        return trimmed;
    }

    /**
     * Sanitize reason text to prevent command injection.
     * Strips newlines/tabs and limits to 200 characters.
     */
    private sanitizeReason(reason?: string): string | undefined {
        if (!reason) return undefined;
        return reason.replace(/[\r\n\t]+/g, ' ').substring(0, 200).trim() || undefined;
    }

    /**
     * Read and parse a Minecraft JSON file (whitelist.json, banned-players.json, ops.json).
     * Returns empty array on failure with proper logging.
     */
    private async readJsonFile(serverUuid: string, filePath: string): Promise<any[]> {
        try {
            const content = await this.pterodactylClient.getFileContents(serverUuid, filePath);
            if (!content) return [];
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            this.logger.warn(`Failed to read ${filePath} on server ${serverUuid}: ${e.message}`);
            return [];
        }
    }

    /** Small delay to let Minecraft flush JSON files after a command */
    private delay(ms = 500): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ========== DETECTION ==========

    async isMinecraftServer(serverUuid: string): Promise<boolean> {
        try {
            const files = await this.pterodactylClient.listFiles(serverUuid, '/');
            const names = files.map((f: any) => f.name?.toLowerCase());
            return names.includes('server.properties') || names.includes('plugins') || names.includes('mods');
        } catch (e) {
            this.logger.error(`Failed to detect Minecraft server ${serverUuid}: ${e.message}`);
            return false;
        }
    }

    // ========== ONLINE PLAYERS ==========

    /**
     * Get online players by sending 'list' command and parsing latest.log.
     * Note: This reads the full log file which can be large on busy servers.
     * Falls back gracefully if the log is unreadable or too large.
     */
    async getOnlinePlayers(serverUuid: string): Promise<{ count: number; max: number; players: string[] }> {
        const empty = { count: 0, max: 0, players: [] };
        try {
            const sent = await this.pterodactylClient.sendCommand(serverUuid, 'list');
            if (!sent) return empty;

            // Wait for the command to execute and the log to be written
            await this.delay(1500);

            const logContent = await this.pterodactylClient.getFileContents(serverUuid, '/logs/latest.log');
            if (!logContent) return empty;

            // Parse last 50 lines for the list response
            const lines = logContent.split('\n').slice(-50);
            for (let i = lines.length - 1; i >= 0; i--) {
                // Vanilla: "There are X of a max of Y players online: Player1, Player2"
                const match = lines[i].match(/There are (\d+) of a max of (\d+) players online:\s*(.*)/i);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const max = parseInt(match[2], 10);
                    const playersStr = match[3]?.trim();
                    const players = playersStr
                        ? playersStr.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
                        : [];
                    return { count, max, players };
                }
                // Paper/Spigot variant: "There are X/Y players"
                const altMatch = lines[i].match(/There are (\d+)\/(\d+) players/i);
                if (altMatch) {
                    return { count: parseInt(altMatch[1], 10), max: parseInt(altMatch[2], 10), players: [] };
                }
            }

            return empty;
        } catch (e) {
            this.logger.error(`Failed to get online players for ${serverUuid}: ${e.message}`);
            return empty;
        }
    }

    // ========== WHITELIST ==========

    async getWhitelist(serverUuid: string): Promise<any[]> {
        return this.readJsonFile(serverUuid, '/whitelist.json');
    }

    async addToWhitelist(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `whitelist add ${name}`);
        if (result) await this.delay();
        return result;
    }

    async removeFromWhitelist(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `whitelist remove ${name}`);
        if (result) {
            // Some servers need an explicit reload to update the JSON
            await this.pterodactylClient.sendCommand(serverUuid, 'whitelist reload');
            await this.delay();
        }
        return result;
    }

    // ========== BAN / UNBAN ==========

    async getBannedPlayers(serverUuid: string): Promise<any[]> {
        return this.readJsonFile(serverUuid, '/banned-players.json');
    }

    async banPlayer(serverUuid: string, player: string, reason?: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const safeReason = this.sanitizeReason(reason);
        const cmd = safeReason ? `ban ${name} ${safeReason}` : `ban ${name}`;
        const result = await this.pterodactylClient.sendCommand(serverUuid, cmd);
        if (result) await this.delay();
        return result;
    }

    async unbanPlayer(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `pardon ${name}`);
        if (result) await this.delay();
        return result;
    }

    // ========== OPS ==========

    async getOps(serverUuid: string): Promise<any[]> {
        return this.readJsonFile(serverUuid, '/ops.json');
    }

    async opPlayer(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `op ${name}`);
        if (result) await this.delay();
        return result;
    }

    async deopPlayer(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `deop ${name}`);
        if (result) await this.delay();
        return result;
    }

    // ========== KICK ==========

    async kickPlayer(serverUuid: string, player: string, reason?: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const safeReason = this.sanitizeReason(reason);
        const cmd = safeReason ? `kick ${name} ${safeReason}` : `kick ${name}`;
        return this.pterodactylClient.sendCommand(serverUuid, cmd);
    }
}
