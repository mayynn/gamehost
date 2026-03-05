import { Injectable, Logger, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { EmailService } from './email.service';
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
        private emailService: EmailService,
    ) { }

    // ============================================================
    // EMAIL REGISTRATION
    // ============================================================
    async register(email: string, name: string, password: string): Promise<{ message: string }> {
        // Check if user already exists
        const existing = await this.prisma.user.findUnique({ where: { email } });

        if (existing) {
            if (existing.provider !== AuthProvider.EMAIL) {
                throw new ConflictException(
                    `This email is already registered via ${existing.provider}. Please login with ${existing.provider} and your accounts will be linked.`,
                );
            }
            if (existing.emailVerified) {
                throw new ConflictException('An account with this email already exists. Please login instead.');
            }
            // User exists but not verified — resend verification
            const token = randomBytes(32).toString('hex');
            await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    name,
                    passwordHash: await bcrypt.hash(password, 12),
                    emailVerifyToken: token,
                    emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
            });
            await this.emailService.sendVerificationEmail(email, name, token);
            return { message: 'Verification email resent. Please check your inbox.' };
        }

        // Create new user
        const passwordHash = await bcrypt.hash(password, 12);
        const verifyToken = randomBytes(32).toString('hex');

        const user = await this.prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                provider: AuthProvider.EMAIL,
                providerId: email,
                emailVerified: false,
                emailVerifyToken: verifyToken,
                emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
                balance: { create: { amount: 0 } },
                credits: { create: { amount: 0 } },
                linkedAccounts: {
                    create: {
                        provider: AuthProvider.EMAIL,
                        providerId: email,
                        email,
                    },
                },
            },
        });

        await this.emailService.sendVerificationEmail(email, name, verifyToken);
        this.logger.log(`New email user registered: ${email}`);
        return { message: 'Account created! Please check your email to verify your account.' };
    }

    // ============================================================
    // EMAIL VERIFICATION
    // ============================================================
    async verifyEmail(token: string): Promise<{ token: string; user: any }> {
        const user = await this.prisma.user.findFirst({
            where: {
                emailVerifyToken: token,
                emailVerifyExpiry: { gt: new Date() },
            },
            include: { pterodactylAccount: true, balance: true, credits: true },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired verification link. Please request a new one.');
        }

        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyToken: null,
                emailVerifyExpiry: null,
                lastLoginAt: new Date(),
            },
            include: { pterodactylAccount: true, balance: true, credits: true },
        });

        await this.ensurePterodactylAccount(updated);

        const jwtToken = this.signToken(updated);
        this.logger.log(`Email verified: ${updated.email}`);
        return { token: jwtToken, user: this.sanitizeUser(updated) };
    }

    // ============================================================
    // EMAIL LOGIN
    // ============================================================
    async login(email: string, password: string, ip?: string, userAgent?: string): Promise<{ token: string; user: any }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { pterodactylAccount: true, balance: true, credits: true },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid email or password.');
        }

        // If user registered via OAuth, they don't have a password
        if (!user.passwordHash) {
            throw new UnauthorizedException(
                `This account uses ${user.provider} login. Please sign in with ${user.provider} instead.`,
            );
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException('Invalid email or password.');
        }

        if (!user.emailVerified) {
            // Resend verification
            const token = randomBytes(32).toString('hex');
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerifyToken: token,
                    emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
            });
            await this.emailService.sendVerificationEmail(user.email, user.name, token);
            throw new UnauthorizedException('Email not verified. A new verification email has been sent.');
        }

        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), lastLoginIp: ip || null },
            include: { pterodactylAccount: true, balance: true, credits: true },
        });

        // Track login session for alt detection
        if (ip) {
            await this.trackLoginSession(user.id, ip, userAgent);
        }

        await this.ensurePterodactylAccount(updated);

        const jwtToken = this.signToken(updated);
        return { token: jwtToken, user: this.sanitizeUser(updated) };
    }

    // ============================================================
    // FORGOT PASSWORD
    // ============================================================
    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({ where: { email } });

        // Always return success to prevent email enumeration
        if (!user || !user.passwordHash) {
            return { message: 'If an account with that email exists, a password reset link has been sent.' };
        }

        const resetToken = randomBytes(32).toString('hex');
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            },
        });

        await this.emailService.sendPasswordResetEmail(email, user.name, resetToken);
        return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // ============================================================
    // RESET PASSWORD
    // ============================================================
    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired reset link. Please request a new one.');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });

        this.logger.log(`Password reset for: ${user.email}`);
        return { message: 'Password has been reset successfully. You can now login with your new password.' };
    }

    // ============================================================
    // RESEND VERIFICATION EMAIL
    // ============================================================
    async resendVerification(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user || user.emailVerified || user.provider !== AuthProvider.EMAIL) {
            return { message: 'If your account requires verification, a new email has been sent.' };
        }

        const token = randomBytes(32).toString('hex');
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifyToken: token,
                emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        await this.emailService.sendVerificationEmail(email, user.name, token);
        return { message: 'If your account requires verification, a new email has been sent.' };
    }

    // ============================================================
    // GOOGLE OAUTH
    // ============================================================
    getGoogleAuthUrl(): string {
        const clientId = this.config.get('GOOGLE_CLIENT_ID', '');
        const callbackUrl = this.config.get('GOOGLE_CALLBACK_URL', '');
        const scopes = encodeURIComponent('openid email profile');
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scopes}&access_type=offline`;
    }

    async handleGoogleCallback(code: string, ip?: string, userAgent?: string): Promise<{ token: string; user: any }> {
        const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: this.config.get('GOOGLE_CLIENT_ID', ''),
            client_secret: this.config.get('GOOGLE_CLIENT_SECRET', ''),
            redirect_uri: this.config.get('GOOGLE_CALLBACK_URL', ''),
            grant_type: 'authorization_code',
        });

        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        return this.processOAuthLogin(
            {
                email: profile.email,
                name: profile.name,
                avatar: profile.picture,
                providerId: profile.id,
                provider: AuthProvider.GOOGLE,
            },
            ip,
            userAgent,
        );
    }

    // ============================================================
    // DISCORD OAUTH
    // ============================================================
    getDiscordAuthUrl(): string {
        const clientId = this.config.get('DISCORD_CLIENT_ID', '');
        const callbackUrl = this.config.get('DISCORD_CALLBACK_URL', '');
        const scopes = encodeURIComponent('identify email');
        return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scopes}`;
    }

    async handleDiscordCallback(code: string, ip?: string, userAgent?: string): Promise<{ token: string; user: any }> {
        const { data: tokens } = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                code,
                client_id: this.config.get('DISCORD_CLIENT_ID', ''),
                client_secret: this.config.get('DISCORD_CLIENT_SECRET', ''),
                redirect_uri: this.config.get('DISCORD_CALLBACK_URL', ''),
                grant_type: 'authorization_code',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );

        const { data: profile } = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const avatar = profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : undefined;

        return this.processOAuthLogin(
            {
                email: profile.email,
                name: profile.global_name || profile.username,
                avatar,
                providerId: profile.id,
                provider: AuthProvider.DISCORD,
            },
            ip,
            userAgent,
        );
    }

    // ============================================================
    // CORE OAUTH LOGIN LOGIC (with account linking)
    // ============================================================
    private async processOAuthLogin(
        profile: OAuthProfile,
        ip?: string,
        userAgent?: string,
    ): Promise<{ token: string; user: any }> {
        let user = await this.prisma.user.findUnique({
            where: { email: profile.email },
            include: { pterodactylAccount: true, balance: true, credits: true, linkedAccounts: true },
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
                    emailVerified: true, // OAuth emails are pre-verified
                    lastLoginAt: new Date(),
                    lastLoginIp: ip || null,
                    balance: { create: { amount: 0 } },
                    credits: { create: { amount: 0 } },
                    linkedAccounts: {
                        create: {
                            provider: profile.provider,
                            providerId: profile.providerId,
                            email: profile.email,
                        },
                    },
                },
                include: { pterodactylAccount: true, balance: true, credits: true, linkedAccounts: true },
            });
            this.logger.log(`New user created via ${profile.provider}: ${user.email}`);
        } else {
            // Existing user — link this OAuth provider if not already linked
            const existingLink = user.linkedAccounts?.find(
                (la) => la.provider === profile.provider && la.providerId === profile.providerId,
            );

            if (!existingLink) {
                await this.prisma.linkedAccount.create({
                    data: {
                        userId: user.id,
                        provider: profile.provider,
                        providerId: profile.providerId,
                        email: profile.email,
                    },
                });
                this.logger.log(`Linked ${profile.provider} account to ${user.email}`);
            }

            // Update login time and profile info
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    lastLoginIp: ip || null,
                    avatar: profile.avatar || user.avatar,
                    name: profile.name || user.name,
                    emailVerified: true, // OAuth verifies email
                },
                include: { pterodactylAccount: true, balance: true, credits: true, linkedAccounts: true },
            });
        }

        // Track login session for alt detection
        if (ip) {
            await this.trackLoginSession(user.id, ip, userAgent);
        }

        // AUTO-HEAL: Ensure Pterodactyl account exists
        await this.ensurePterodactylAccount(user);

        const token = this.signToken(user);
        return { token, user: this.sanitizeUser(user) };
    }

    // ============================================================
    // LOGIN SESSION TRACKING (for alt detection)
    // ============================================================
    private async trackLoginSession(userId: string, ip: string, userAgent?: string): Promise<void> {
        try {
            await this.prisma.loginSession.create({
                data: {
                    userId,
                    ipAddress: ip,
                    userAgent: userAgent || null,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to track login session: ${error.message}`);
        }
    }

    // ============================================================
    // AUTO-HEAL PTERODACTYL
    // ============================================================
    async ensurePterodactylAccount(user: any): Promise<void> {
        try {
            const pteroAccount = await this.prisma.pterodactylAccount.findUnique({
                where: { userId: user.id },
            });

            if (pteroAccount) {
                const exists = await this.pterodactyl.getUserById(pteroAccount.pteroUserId);
                if (exists) return;
                this.logger.warn(`Auto-heal: Pterodactyl account missing for ${user.email}, recreating...`);
                await this.prisma.pterodactylAccount.delete({ where: { userId: user.id } });
            }

            const existingPtero = await this.pterodactyl.findUserByEmail(user.email);

            if (existingPtero) {
                // Link existing Pterodactyl account — use upsert to handle race conditions
                await this.prisma.pterodactylAccount.upsert({
                    where: { userId: user.id },
                    update: {
                        pteroUserId: existingPtero.id,
                        pteroUsername: existingPtero.username,
                        pteroEmail: existingPtero.email,
                    },
                    create: {
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
                const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36);
                const pteroUser = await this.pterodactyl.createUser({
                    email: user.email,
                    username,
                    first_name: user.name?.split(' ')[0] || 'User',
                    last_name: user.name?.split(' ').slice(1).join(' ') || 'GameHost',
                });

                if (pteroUser) {
                    // Use upsert to handle race conditions from concurrent logins
                    await this.prisma.pterodactylAccount.upsert({
                        where: { userId: user.id },
                        update: {
                            pteroUserId: pteroUser.id,
                            pteroUsername: pteroUser.username,
                            pteroEmail: pteroUser.email,
                        },
                        create: {
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
                } else {
                    this.logger.error(`Failed to create Pterodactyl user for ${user.email} — panel returned null`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to ensure Pterodactyl account for ${user.email}: ${error.message}`);
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    signToken(user: any): string {
        const secret = this.config.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not configured');
        }
        return jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            secret,
            { expiresIn: this.config.get('JWT_EXPIRY', '7d') },
        );
    }

    sanitizeUser(user: any) {
        const { pterodactylAccount, passwordHash, emailVerifyToken, emailVerifyExpiry,
            passwordResetToken, passwordResetExpiry, linkedAccounts, loginSessions, ...safe } = user;
        return {
            ...safe,
            pterodactylLinked: !!pterodactylAccount,
            linkedProviders: linkedAccounts?.map((la: any) => la.provider) || [],
        };
    }

    async validateUser(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { balance: true, credits: true },
        });
    }
}
