import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    logger.log('╔══════════════════════════════════════╗');
    logger.log('║        GameHost Platform API          ║');
    logger.log('╚══════════════════════════════════════╝');

    const app = await NestFactory.create(AppModule);
    const config = app.get(ConfigService);

    // Global prefix
    app.setGlobalPrefix('api');

    // Security
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cookieParser());

    // CORS
    app.enableCors({
        origin: config.get('APP_URL', 'http://localhost:3000'),
        credentials: true,
    });

    // Global filters & pipes
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Graceful shutdown
    app.enableShutdownHooks();

    const port = config.get('BACKEND_PORT', 4000);
    await app.listen(port);

    logger.log(`✓ API server running on port ${port}`);
    logger.log(`✓ Environment: ${config.get('NODE_ENV', 'development')}`);
    logger.log(`✓ CORS origin: ${config.get('APP_URL', 'http://localhost:3000')}`);
}

bootstrap();
