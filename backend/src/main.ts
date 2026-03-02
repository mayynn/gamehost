import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

// ─── Colors ───────────────────────────────────────────────
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bgCyan: '\x1b[46m',
    bgBlue: '\x1b[44m',
};

function printBanner() {
    const banner = `
${c.cyan}${c.bold}
    ██████╗  █████╗ ███╗   ███╗███████╗██╗  ██╗ ██████╗ ███████╗████████╗
   ██╔════╝ ██╔══██╗████╗ ████║██╔════╝██║  ██║██╔═══██╗██╔════╝╚══██╔══╝
   ██║  ███╗███████║██╔████╔██║█████╗  ███████║██║   ██║███████╗   ██║   
   ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██║██║   ██║╚════██║   ██║   
   ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗██║  ██║╚██████╔╝███████║   ██║   
    ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   
${c.reset}
${c.gray}   ─────────────────────────────────────────────────────────────────${c.reset}
${c.white}${c.bold}                   Game Server Hosting Platform${c.reset}
${c.gray}   ─────────────────────────────────────────────────────────────────${c.reset}
`;
    console.log(banner);
}

function logStep(icon: string, label: string, value?: string) {
    const labelStr = `${c.white}${c.bold}${label}${c.reset}`;
    const valueStr = value ? `${c.gray} → ${c.cyan}${value}${c.reset}` : '';
    console.log(`   ${icon}  ${labelStr}${valueStr}`);
}

function logSection(title: string) {
    console.log(`\n${c.gray}   ┌─${c.reset} ${c.blue}${c.bold}${title}${c.reset}`);
}

function logDone(label: string, value?: string) {
    const valueStr = value ? ` ${c.gray}${value}${c.reset}` : '';
    console.log(`${c.gray}   │${c.reset}  ${c.green}✔${c.reset} ${c.white}${label}${c.reset}${valueStr}`);
}

function logSectionEnd() {
    console.log(`${c.gray}   └──────────────────────────────────────────${c.reset}`);
}

async function bootstrap() {
    const startTime = Date.now();
    printBanner();

    // ─── Create Application ──────────────────────────────
    logSection('Initializing');
    const app = await NestFactory.create(AppModule, { logger: false });
    const config = app.get(ConfigService);
    logDone('NestJS application created');

    // ─── Global Prefix ───────────────────────────────────
    app.setGlobalPrefix('api');
    logDone('Global prefix', '/api');

    // ─── Security ────────────────────────────────────────
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cookieParser());
    logDone('Security middleware', 'Helmet + Cookie Parser');

    // ─── CORS ────────────────────────────────────────────
    const corsOrigin = config.get('APP_URL', 'http://localhost:3000');
    app.enableCors({ origin: corsOrigin, credentials: true });
    logDone('CORS enabled', corsOrigin);

    // ─── Validation ──────────────────────────────────────
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    logDone('Validation & error handling');

    // ─── Shutdown Hooks ──────────────────────────────────
    app.enableShutdownHooks();
    logDone('Graceful shutdown hooks');
    logSectionEnd();

    // ─── Start Server ────────────────────────────────────
    const port = config.get('BACKEND_PORT', 4000);
    const env = config.get('NODE_ENV', 'development');
    await app.listen(port, '0.0.0.0');

    const bootTime = ((Date.now() - startTime) / 1000).toFixed(2);

    logSection('Server Online');
    logDone('Status', '🟢 Running');
    logDone('Port', `${port}`);
    logDone('Host', '0.0.0.0');
    logDone('Environment', env);
    logDone('Boot time', `${bootTime}s`);
    logSectionEnd();

    // ─── Endpoints ──────────────────────────────────────
    logSection('Endpoints');
    logDone('API', `http://localhost:${port}/api`);
    logDone('Health', `http://localhost:${port}/api/health`);
    logDone('Auth', `http://localhost:${port}/api/auth/google`);
    logSectionEnd();

    // ─── Config Status ──────────────────────────────────
    logSection('Services');
    logDone('Database', config.get('DATABASE_URL') ? 'configured' : '⚠ not set');
    logDone('Redis', config.get('REDIS_URL') ? 'configured' : '⚠ not set');
    logDone('Pterodactyl', config.get('PTERODACTYL_URL', '') ? config.get('PTERODACTYL_URL') : '⚠ not set');
    logDone('Google OAuth', config.get('GOOGLE_CLIENT_ID', '') ? 'configured' : '⚠ not set');
    logDone('Discord OAuth', config.get('DISCORD_CLIENT_ID', '') ? 'configured' : '⚠ not set');
    logDone('Discord Bot', config.get('DISCORD_BOT_TOKEN', '') ? 'enabled' : 'disabled');
    logDone('Cloudflare DNS', config.get('CLOUDFLARE_ENABLED', 'false') === 'true' ? 'enabled' : 'disabled');
    logSectionEnd();

    console.log(`\n${c.gray}   Ready to accept connections.${c.reset}`);
    console.log(`${c.gray}   Press Ctrl+C to stop.\n${c.reset}`);

    // Re-enable NestJS logger for runtime
    const runtimeLogger = new Logger('GameHost');
    runtimeLogger.log(`Server started in ${bootTime}s on port ${port}`);
}

bootstrap();
