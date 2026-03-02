import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordService implements OnModuleInit {
    private readonly logger = new Logger(DiscordService.name);
    private client: any = null;
    private logChannelId: string;
    private enabled = false;

    constructor(private config: ConfigService) {
        this.logChannelId = this.config.get('DISCORD_LOG_CHANNEL_ID', '');
    }

    async onModuleInit() {
        const token = this.config.get('DISCORD_BOT_TOKEN');
        if (!token) {
            this.logger.log('Discord bot token not provided, skipping bot initialization');
            return;
        }

        try {
            const { Client, GatewayIntentBits } = require('discord.js');
            this.client = new Client({
                intents: [GatewayIntentBits.Guilds],
            });

            this.client.on('ready', () => {
                this.logger.log(`Discord bot connected as ${this.client.user.tag}`);
                this.enabled = true;
            });

            await this.client.login(token);
        } catch (e) {
            this.logger.error(`Discord bot failed to start: ${e.message}`);
        }
    }

    async sendLog(title: string, description: string, color = 0x00d4ff) {
        if (!this.enabled || !this.logChannelId) return;

        try {
            const channel = await this.client.channels.fetch(this.logChannelId);
            if (channel) {
                await channel.send({
                    embeds: [{
                        title,
                        description,
                        color,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'GameHost Platform' },
                    }],
                });
            }
        } catch (e) {
            this.logger.error(`Failed to send Discord log: ${e.message}`);
        }
    }

    async logPayment(userName: string, amount: number, gateway: string) {
        await this.sendLog('💰 Payment Received', `**User:** ${userName}\n**Amount:** ₹${amount}\n**Gateway:** ${gateway}`, 0x00ff00);
    }

    async logNewUser(userName: string, email: string) {
        await this.sendLog('👤 New User', `**Name:** ${userName}\n**Email:** ${email}`, 0x00d4ff);
    }

    async logServerCreation(userName: string, serverName: string) {
        await this.sendLog('🖥️ Server Created', `**User:** ${userName}\n**Server:** ${serverName}`, 0x5865F2);
    }

    async logUtrRequest(userName: string, utr: string, amount: number) {
        await this.sendLog('📋 UTR Payment Request', `**User:** ${userName}\n**UTR:** ${utr}\n**Amount:** ₹${amount}`, 0xffa500);
    }

    async logError(context: string, error: string) {
        await this.sendLog('❌ Error', `**Context:** ${context}\n**Error:** ${error}`, 0xff0000);
    }
}
