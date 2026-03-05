import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
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

// ─── Catch fatal errors BEFORE anything else ─────────────
process.on('unhandledRejection', (reason: any) => {
    console.error(`\x1b[31m\x1b[1m   ✘  Unhandled Promise Rejection:\x1b[0m`, reason);
});
process.on('uncaughtException', (err: Error) => {
    console.error(`\x1b[31m\x1b[1m   ✘  Uncaught Exception:\x1b[0m`, err);
    process.exit(1);
});

async function bootstrap() {
    const startTime = Date.now();
    printBanner();

    // ─── Create Application ──────────────────────────────
    logSection('Initializing');

    // Use a console logger so module‑init errors (Prisma, imports, etc.)
    // are ALWAYS visible.  The pretty banner has already been printed,
    // so we only need error/warn/log coming through during init.
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log'],
        rawBody: true, // Required for webhook signature verification
    });
    const config = app.get(ConfigService);
    logDone('NestJS application created');

    // ─── Global Prefix ───────────────────────────────────
    app.setGlobalPrefix('api', {
        exclude: [{ path: '/', method: RequestMethod.GET }],
    });
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

    logSection('Server Online');
    logDone('Status', '🟢 Running');
    logDone('Port', `${port}`);
    logDone('Host', '0.0.0.0');
    logDone('Environment', env);
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
    logDone('SMTP / Email', config.get('SMTP_HOST', '') ? `configured (${config.get('SMTP_HOST')})` : 'disabled (console-only)');
    logDone('Datalix VPS', config.get('DATALIX_ENABLED', 'false') === 'true' ? 'enabled' : 'disabled');
    logSectionEnd();

    // ─── SUCCESS BANNER ──────────────────────────────────
    const bootTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log(`${c.green}${c.bold}   ══════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.green}${c.bold}    ✔  GameHost Platform — Successfully Started!${c.reset}`);
    console.log(`${c.green}${c.bold}   ══════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.gray}       Port ${port} · ${env} · Boot time ${bootTime}s${c.reset}`);
    console.log(`${c.cyan}       API:    http://localhost:${port}/api${c.reset}`);
    console.log(`${c.cyan}       Health: http://localhost:${port}/api/health${c.reset}`);
    console.log(`${c.gray}       Ready to accept connections. Press Ctrl+C to stop.${c.reset}`);
    console.log('');

    // Re-enable NestJS logger for runtime
    const runtimeLogger = new Logger('GameHost');
    runtimeLogger.log(`Server started in ${bootTime}s on port ${port}`);
}

bootstrap().catch((err) => {
    console.error('');
    console.error(`\x1b[31m\x1b[1m   ══════════════════════════════════════════════════════════\x1b[0m`);
    console.error(`\x1b[31m\x1b[1m    ✘  GameHost Platform — Failed to Start!\x1b[0m`);
    console.error(`\x1b[31m\x1b[1m   ══════════════════════════════════════════════════════════\x1b[0m`);
    console.error(`\x1b[31m   ${err.message || err}\x1b[0m`);
    if (err.stack) {
        console.error(`\x1b[90m${err.stack}\x1b[0m`);
    }
    console.error('');
    process.exit(1);
});
