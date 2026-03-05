import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DiscordService.name);
    private client: any = null;
    private logChannelId: string;
    private alertChannelId: string;
    private enabled = false;

    constructor(private config: ConfigService) {
        this.logChannelId = this.config.get('DISCORD_LOG_CHANNEL_ID', '');
        this.alertChannelId = this.config.get('DISCORD_ALERT_CHANNEL_ID', '') || this.logChannelId;
    }

    async onModuleInit() {
        const token = this.config.get('DISCORD_BOT_TOKEN');
        if (!token) {
            this.logger.log('Discord bot token not provided, skipping bot initialization');
            return;
        }

        try {
            const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
            this.client = new Client({
                intents: [GatewayIntentBits.Guilds],
            });

            this.client.on('ready', async () => {
                this.logger.log(`Discord bot connected as ${this.client.user.tag}`);
                this.enabled = true;

                // Register slash commands
                try {
                    await this.registerSlashCommands(REST, Routes, SlashCommandBuilder, token);
                } catch (e: any) {
                    this.logger.error(`Failed to register slash commands: ${e.message}`);
                }
            });

            // Handle slash command interactions
            this.client.on('interactionCreate', async (interaction: any) => {
                if (!interaction.isChatInputCommand()) return;
                try {
                    await this.handleSlashCommand(interaction);
                } catch (e: any) {
                    this.logger.error(`Slash command error: ${e.message}`);
                    try {
                        const reply = interaction.replied || interaction.deferred
                            ? interaction.editReply.bind(interaction)
                            : interaction.reply.bind(interaction);
                        await reply({ content: '❌ An error occurred.', ephemeral: true });
                    } catch { /* ignore reply error */ }
                }
            });

            // Reconnection handling
            this.client.on('error', (error: any) => {
                this.logger.error(`Discord client error: ${error.message}`);
            });

            this.client.on('shardDisconnect', () => {
                this.logger.warn('Discord bot disconnected, will attempt to reconnect...');
                this.enabled = false;
            });

            this.client.on('shardReconnecting', () => {
                this.logger.log('Discord bot reconnecting...');
            });

            this.client.on('shardResume', () => {
                this.logger.log('Discord bot reconnected');
                this.enabled = true;
            });

            await this.client.login(token);
        } catch (e: any) {
            this.logger.error(`Discord bot failed to start: ${e.message}`);
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            this.logger.log('Shutting down Discord bot...');
            try {
                this.client.destroy();
            } catch { /* ignore */ }
            this.client = null;
            this.enabled = false;
        }
    }

    // ========== SLASH COMMANDS REGISTRATION ==========

    private async registerSlashCommands(REST: any, Routes: any, SlashCommandBuilder: any, token: string) {
        const commands = [
            new SlashCommandBuilder()
                .setName('status')
                .setDescription('Check the platform status'),
            new SlashCommandBuilder()
                .setName('stats')
                .setDescription('View platform statistics'),
            new SlashCommandBuilder()
                .setName('help')
                .setDescription('Show available commands'),
        ];

        const rest = new REST({ version: '10' }).setToken(token);
        const clientId = this.client.user.id;

        const guildId = this.config.get('DISCORD_GUILD_ID', '');
        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
                body: commands.map((c: any) => c.toJSON()),
            });
            this.logger.log(`Registered ${commands.length} slash commands for guild ${guildId}`);
        } else {
            await rest.put(Routes.applicationCommands(clientId), {
                body: commands.map((c: any) => c.toJSON()),
            });
            this.logger.log(`Registered ${commands.length} global slash commands`);
        }
    }

    // ========== SLASH COMMAND HANDLER ==========

    private async handleSlashCommand(interaction: any) {
        switch (interaction.commandName) {
            case 'status': {
                const appName = this.config.get('APP_NAME', 'GameHost');
                const appUrl = this.config.get('APP_URL', 'https://example.com');
                await interaction.reply({
                    embeds: [{
                        title: `⚡ ${appName} Status`,
                        description: `🟢 Platform is **online** and operational.\n\n🌐 [Open Dashboard](${appUrl}/dashboard)`,
                        color: 0x00ff00,
                        timestamp: new Date().toISOString(),
                        footer: { text: appName },
                    }],
                });
                break;
            }

            case 'stats': {
                const uptime = process.uptime();
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const memUsage = process.memoryUsage();
                await interaction.reply({
                    embeds: [{
                        title: '📊 Platform Stats',
                        fields: [
                            { name: 'Uptime', value: `${hours}h ${minutes}m`, inline: true },
                            { name: 'Memory', value: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`, inline: true },
                            { name: 'Bot Ping', value: `${Math.round(this.client.ws.ping)}ms`, inline: true },
                        ],
                        color: 0x00d4ff,
                        timestamp: new Date().toISOString(),
                    }],
                    ephemeral: true,
                });
                break;
            }

            case 'help': {
                await interaction.reply({
                    embeds: [{
                        title: '📖 Available Commands',
                        description: [
                            '`/status` — Check platform status',
                            '`/stats` — View platform statistics',
                            '`/help` — Show this help message',
                        ].join('\n'),
                        color: 0x5865F2,
                        timestamp: new Date().toISOString(),
                    }],
                    ephemeral: true,
                });
                break;
            }
        }
    }

    // ========== LOG CHANNEL METHODS ==========

    async sendLog(title: string, description: string, color = 0x00d4ff) {
        if (!this.enabled || !this.logChannelId) return;

        try {
            const channel = await this.client.channels.fetch(this.logChannelId);
            if (channel) {
                const appName = this.config.get('APP_NAME', 'GameHost');
                await channel.send({
                    embeds: [{
                        title,
                        description,
                        color,
                        timestamp: new Date().toISOString(),
                        footer: { text: appName },
                    }],
                });
            }
        } catch (e: any) {
            this.logger.error(`Failed to send Discord log: ${e.message}`);
        }
    }

    private async sendAlert(title: string, description: string, color = 0xff0000) {
        if (!this.enabled || !this.alertChannelId) return;

        try {
            const channel = await this.client.channels.fetch(this.alertChannelId);
            if (channel) {
                const appName = this.config.get('APP_NAME', 'GameHost');
                await channel.send({
                    embeds: [{
                        title,
                        description,
                        color,
                        timestamp: new Date().toISOString(),
                        footer: { text: appName },
                    }],
                });
            }
        } catch (e: any) {
            this.logger.error(`Failed to send Discord alert: ${e.message}`);
        }
    }

    // ========== PAYMENT EVENTS ==========

    async logPayment(userName: string, amount: number, gateway: string) {
        const currency = this.config.get('CURRENCY_SYMBOL', '₹');
        await this.sendLog('💰 Payment Received', `**User:** ${userName}\n**Amount:** ${currency}${amount}\n**Gateway:** ${gateway}`, 0x00ff00);
    }

    // ========== USER EVENTS ==========

    async logNewUser(userName: string, email: string) {
        await this.sendLog('👤 New User Registered', `**Name:** ${userName}\n**Email:** ${email}`, 0x00d4ff);
    }

    // ========== SERVER EVENTS ==========

    async logServerCreation(userName: string, serverName: string) {
        await this.sendLog('🖥️ Server Created', `**User:** ${userName}\n**Server:** ${serverName}`, 0x5865F2);
    }

    async logServerRenewal(userName: string, serverName: string, newExpiry: Date) {
        await this.sendLog(
            '🔄 Server Renewed',
            `**User:** ${userName}\n**Server:** ${serverName}\n**New Expiry:** ${newExpiry.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}`,
            0x00ff00,
        );
    }

    async logServerSuspend(userName: string, serverName: string, reason: string) {
        await this.sendAlert(
            '⚠️ Server Suspended',
            `**User:** ${userName}\n**Server:** ${serverName}\n**Reason:** ${reason}`,
            0xffa500,
        );
    }

    async logServerDelete(userName: string, serverName: string, reason: string) {
        await this.sendAlert(
            '🗑️ Server Deleted',
            `**User:** ${userName}\n**Server:** ${serverName}\n**Reason:** ${reason}`,
            0xff0000,
        );
    }

    // ========== RENEWAL REMINDER ==========

    async sendRenewalReminder(userName: string, serverName: string, daysLeft: number, renewalCost: number) {
        const currency = this.config.get('CURRENCY_SYMBOL', '₹');
        await this.sendAlert(
            '⏰ Server Expiring Soon',
            `**User:** ${userName}\n**Server:** ${serverName}\n**Expires in:** ${daysLeft} day${daysLeft !== 1 ? 's' : ''}\n**Renewal Cost:** ${currency}${renewalCost}\n\n_The server will auto-renew from balance if sufficient funds are available. Otherwise it will be suspended._`,
            0xffa500,
        );
    }

    // ========== UPI EVENTS ==========

    async logUtrRequest(userName: string, utr: string, amount: number) {
        const currency = this.config.get('CURRENCY_SYMBOL', '₹');
        await this.sendLog('📋 UTR Payment Request', `**User:** ${userName}\n**UTR:** ${utr}\n**Amount:** ${currency}${amount}`, 0xffa500);
    }

    // ========== ERROR EVENTS ==========

    async logError(context: string, error: string) {
        await this.sendAlert('❌ Error', `**Context:** ${context}\n**Error:** ${error}`, 0xff0000);
    }
}
