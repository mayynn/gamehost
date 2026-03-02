import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const secret = this.config.get<string>('JWT_SECRET');
            const payload: any = jwt.verify(token, secret);
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                include: { balance: true, credits: true },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            request.user = user;
            return true;
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
    }

    private extractToken(request: any): string | null {
        // Check cookie first, then Authorization header
        if (request.cookies?.token) {
            return request.cookies.token;
        }
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
}
