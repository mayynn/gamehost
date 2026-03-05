import { Controller, Get, Post, Query, Body, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class AuthController {
    constructor(
        private authService: AuthService,
        private config: ConfigService,
    ) { }

    // ============================================================
    // EMAIL AUTH ENDPOINTS
    // ============================================================

    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto.email, dto.name, dto.password);
    }

    @Post('login')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async login(@Body() dto: LoginDto, @Req() req: Request, @Res() res: Response) {
        const ip = (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
        const userAgent = req.headers['user-agent'];
        const { token } = await this.authService.login(dto.email, dto.password, ip, userAgent);
        this.setTokenCookie(res, token);
        res.json({ message: 'Login successful' });
    }

    @Get('verify-email')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async verifyEmail(@Query('token') token: string, @Res() res: Response) {
        try {
            const result = await this.authService.verifyEmail(token);
            this.setTokenCookie(res, result.token);
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/dashboard?verified=true');
        } catch {
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/login?error=verification_failed');
        }
    }

    @Post('forgot-password')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Post('reset-password')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.password);
    }

    @Post('resend-verification')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async resendVerification(@Body('email') email: string) {
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            throw new BadRequestException('Valid email is required');
        }
        return this.authService.resendVerification(email);
    }

    // ============================================================
    // GOOGLE OAUTH
    // ============================================================

    @Get('google')
    googleLogin(@Res() res: Response) {
        res.redirect(this.authService.getGoogleAuthUrl());
    }

    @Get('google/callback')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async googleCallback(@Query('code') code: string, @Req() req: Request, @Res() res: Response) {
        try {
            const ip = (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
            const userAgent = req.headers['user-agent'];
            const { token } = await this.authService.handleGoogleCallback(code, ip, userAgent);
            this.setTokenCookie(res, token);
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/dashboard');
        } catch {
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/login?error=oauth_failed');
        }
    }

    // ============================================================
    // DISCORD OAUTH
    // ============================================================

    @Get('discord')
    discordLogin(@Res() res: Response) {
        res.redirect(this.authService.getDiscordAuthUrl());
    }

    @Get('discord/callback')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async discordCallback(@Query('code') code: string, @Req() req: Request, @Res() res: Response) {
        try {
            const ip = (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
            const userAgent = req.headers['user-agent'];
            const { token } = await this.authService.handleDiscordCallback(code, ip, userAgent);
            this.setTokenCookie(res, token);
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/dashboard');
        } catch {
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/login?error=oauth_failed');
        }
    }

    // ============================================================
    // SESSION
    // ============================================================

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@CurrentUser() user: any) {
        return { user: this.authService.sanitizeUser(user) };
    }

    @Post('logout')
    logout(@Res() res: Response) {
        const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
        const isHttps = appUrl.startsWith('https://');
        res.clearCookie('token', {
            httpOnly: true,
            secure: isHttps,
            sameSite: 'lax',
        });
        res.json({ message: 'Logged out' });
    }

    // ============================================================
    // HELPERS
    // ============================================================
    private setTokenCookie(res: Response, token: string) {
        const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
        const isHttps = appUrl.startsWith('https://');
        res.cookie('token', token, {
            httpOnly: true,
            secure: isHttps,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }
}
