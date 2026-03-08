import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { USER_SESSION_CACHE_TTL } from '../constants';
import { JwtPayload } from '../interfaces';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
        private redis: RedisService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        const secret = this.config.get<string>('JWT_SECRET', '');
        if (!secret) throw new UnauthorizedException('JWT secret not configured');

        let payload: JwtPayload;
        try {
            payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        if (!payload?.sub || typeof payload.sub !== 'string') {
            throw new UnauthorizedException('Malformed token payload');
        }

        // Check Redis cache first to avoid DB hit on every request
        const cacheKey = `user:session:${payload.sub}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            try {
                const user = JSON.parse(cached);
                // Verify user is not deleted/banned while cached
                if (!user || user._deleted) {
                    await this.redis.del(cacheKey);
                    throw new UnauthorizedException('Account no longer exists');
                }
                request.user = user;
                return true;
            } catch (e) {
                if (e instanceof UnauthorizedException) throw e;
                // Cache parse error — fall through to DB
                await this.redis.del(cacheKey);
            }
        }

        // DB lookup — only happens once per USER_CACHE_TTL seconds
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { balance: true, credits: true, linkedAccounts: true },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Cache user data for subsequent requests
        try {
            await this.redis.set(cacheKey, JSON.stringify(user), USER_SESSION_CACHE_TTL);
        } catch {
            // Redis down — non-fatal, just skip caching
        }

        request.user = user;
        return true;
    }

    private extractToken(request: any): string | null {
        // Check cookie first (primary auth), then Authorization header (API clients)
        if (request.cookies?.token) {
            return request.cookies.token;
        }
        const authHeader = request.headers?.authorization;
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
}
