import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { AuthProvider, Role } from '@prisma/client';

interface OAuthProfile {
    email: string;
    name: string;
    avatar?: string;
    providerId: string;
    provider: AuthProvider;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private pterodactyl: PterodactylService,
    ) { }

    // ---------- Google OAuth ----------
    getGoogleAuthUrl(): string {
        const clientId = this.config.get('GOOGLE_CLIENT_ID');
        const callbackUrl = this.config.get('GOOGLE_CALLBACK_URL');
        const scopes = encodeURIComponent('openid email profile');
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scopes}&access_type=offline`;
    }

    async handleGoogleCallback(code: string): Promise<{ token: string; user: any }> {
        const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: this.config.get('GOOGLE_CLIENT_ID'),
            client_secret: this.config.get('GOOGLE_CLIENT_SECRET'),
            redirect_uri: this.config.get('GOOGLE_CALLBACK_URL'),
            grant_type: 'authorization_code',
        });

        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        return this.processOAuthLogin({
            email: profile.email,
            name: profile.name,
            avatar: profile.picture,
            providerId: profile.id,
            provider: AuthProvider.GOOGLE,
        });
    }

    // ---------- Discord OAuth ----------
    getDiscordAuthUrl(): string {
        const clientId = this.config.get('DISCORD_CLIENT_ID');
        const callbackUrl = this.config.get('DISCORD_CALLBACK_URL');
        const scopes = encodeURIComponent('identify email');
        return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scopes}`;
    }

    async handleDiscordCallback(code: string): Promise<{ token: string; user: any }> {
        const { data: tokens } = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                code,
                client_id: this.config.get('DISCORD_CLIENT_ID'),
                client_secret: this.config.get('DISCORD_CLIENT_SECRET'),
                redirect_uri: this.config.get('DISCORD_CALLBACK_URL'),
                grant_type: 'authorization_code',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );

        const { data: profile } = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const avatar = profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null;

        return this.processOAuthLogin({
            email: profile.email,
            name: profile.global_name || profile.username,
            avatar,
            providerId: profile.id,
            provider: AuthProvider.DISCORD,
        });
    }

    // ---------- Core Login Logic ----------
    private async processOAuthLogin(profile: OAuthProfile): Promise<{ token: string; user: any }> {
        let user = await this.prisma.user.findUnique({
            where: { email: profile.email },
            include: { pterodactylAccount: true, balance: true, credits: true },
        });

        if (!user) {
            // Create new user
            user = await this.prisma.user.create({
                data: {
                    email: profile.email,
                    name: profile.name,
                    avatar: profile.avatar,
                    provider: profile.provider,
                    providerId: profile.providerId,
                    lastLoginAt: new Date(),
                    balance: { create: { amount: 0 } },
                    credits: { create: { amount: 0 } },
                },
                include: { pterodactylAccount: true, balance: true, credits: true },
            });
            this.logger.log(`New user created: ${user.email}`);
        } else {
            // Update login time
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    avatar: profile.avatar || user.avatar,
                    name: profile.name || user.name,
                },
                include: { pterodactylAccount: true, balance: true, credits: true },
            });
        }

        // AUTO-HEAL: Ensure Pterodactyl account exists
        await this.ensurePterodactylAccount(user);

        const token = this.signToken(user);
        return { token, user: this.sanitizeUser(user) };
    }

    // ---------- Auto-Heal System ----------
    async ensurePterodactylAccount(user: any): Promise<void> {
        try {
            // Check if ptero account exists locally
            const pteroAccount = await this.prisma.pterodactylAccount.findUnique({
                where: { userId: user.id },
            });

            if (pteroAccount) {
                // Verify it still exists in Pterodactyl
                const exists = await this.pterodactyl.getUserById(pteroAccount.pteroUserId);
                if (exists) {
                    return; // All good
                }
                // Account missing from Pterodactyl - recreate
                this.logger.warn(`Auto-heal: Pterodactyl account missing for ${user.email}, recreating...`);
                await this.prisma.pterodactylAccount.delete({ where: { userId: user.id } });
            }

            // Check if user exists in Pterodactyl by email
            const existingPtero = await this.pterodactyl.findUserByEmail(user.email);

            if (existingPtero) {
                // Link existing Pterodactyl account
                await this.prisma.pterodactylAccount.create({
                    data: {
                        userId: user.id,
                        pteroUserId: existingPtero.id,
                        pteroUsername: existingPtero.username,
                        pteroEmail: existingPtero.email,
                    },
                });
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { pterodactylId: existingPtero.id },
                });
                this.logger.log(`Linked existing Pterodactyl account for ${user.email}`);
            } else {
                // Create new Pterodactyl account
                const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36);
                const pteroUser = await this.pterodactyl.createUser({
                    email: user.email,
                    username,
                    first_name: user.name.split(' ')[0] || 'User',
                    last_name: user.name.split(' ').slice(1).join(' ') || 'GameHost',
                });

                if (pteroUser) {
                    await this.prisma.pterodactylAccount.create({
                        data: {
                            userId: user.id,
                            pteroUserId: pteroUser.id,
                            pteroUsername: pteroUser.username,
                            pteroEmail: pteroUser.email,
                        },
                    });
                    await this.prisma.user.update({
                        where: { id: user.id },
                        data: { pterodactylId: pteroUser.id },
                    });
                    this.logger.log(`Created Pterodactyl account for ${user.email}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to ensure Pterodactyl account: ${error.message}`);
        }
    }

    // ---------- Helpers ----------
    signToken(user: any): string {
        return jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            this.config.get<string>('JWT_SECRET'),
            { expiresIn: this.config.get('JWT_EXPIRY', '7d') },
        );
    }

    sanitizeUser(user: any) {
        const { pterodactylAccount, ...safe } = user;
        return {
            ...safe,
            pterodactylLinked: !!pterodactylAccount,
        };
    }

    async validateUser(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { balance: true, credits: true },
        });
    }
}
