import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class AuthController {
    constructor(
        private authService: AuthService,
        private config: ConfigService,
    ) { }

    // ---------- Google ----------
    @Get('google')
    googleLogin(@Res() res: Response) {
        res.redirect(this.authService.getGoogleAuthUrl());
    }

    @Get('google/callback')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async googleCallback(@Query('code') code: string, @Res() res: Response) {
        try {
            const { token } = await this.authService.handleGoogleCallback(code);
            this.setTokenCookie(res, token);
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/dashboard');
        } catch (error) {
            res.redirect(this.config.get('APP_URL') + '/login?error=oauth_failed');
        }
    }

    // ---------- Discord ----------
    @Get('discord')
    discordLogin(@Res() res: Response) {
        res.redirect(this.authService.getDiscordAuthUrl());
    }

    @Get('discord/callback')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async discordCallback(@Query('code') code: string, @Res() res: Response) {
        try {
            const { token } = await this.authService.handleDiscordCallback(code);
            this.setTokenCookie(res, token);
            res.redirect(this.config.get('APP_URL', 'http://localhost:3000') + '/dashboard');
        } catch (error) {
            res.redirect(this.config.get('APP_URL') + '/login?error=oauth_failed');
        }
    }

    // ---------- Session ----------
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@CurrentUser() user: any) {
        return { user: this.authService.sanitizeUser(user) };
    }

    @Get('logout')
    logout(@Res() res: Response) {
        res.clearCookie('token');
        res.json({ message: 'Logged out' });
    }

    // ---------- Helpers ----------
    private setTokenCookie(res: Response, token: string) {
        res.cookie('token', token, {
            httpOnly: true,
            secure: this.config.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }
}
