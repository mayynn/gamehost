import { Controller, Get } from '@nestjs/common';

/**
 * Root controller — responds at GET / (outside the /api prefix)
 * so users don't see a confusing 404 when visiting the backend URL directly.
 */
@Controller()
export class RootController {
    @Get()
    root() {
        return {
            name: 'GameHost Platform API',
            status: 'running',
            version: process.env.npm_package_version || '1.0.0',
            endpoints: {
                health: '/api/health',
                stats: '/api/stats',
                auth: '/api/auth/google',
                docs: '/api',
            },
        };
    }
}
