import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errors: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exResponse = exception.getResponse();
            if (typeof exResponse === 'string') {
                message = exResponse;
            } else if (typeof exResponse === 'object') {
                message = (exResponse as any).message || message;
                errors = (exResponse as any).errors;
            }

            // Log client errors (4xx) at warn level, server errors (5xx) at error level
            if (status >= 500) {
                this.logger.error(
                    `${request.method} ${request.url} → ${status} ${message}`,
                    exception.stack,
                );
            } else if (status >= 400) {
                this.logger.warn(
                    `${request.method} ${request.url} → ${status} ${typeof message === 'string' ? message : JSON.stringify(message)}`,
                );
            }
        } else if (exception instanceof Error) {
            // Don't leak internal error details to clients, but ALWAYS log fully
            this.logger.error(
                `${request.method} ${request.url} → 500 Unhandled: ${exception.message}`,
                exception.stack,
            );
        } else {
            // Non-Error exceptions (strings, objects, etc.) — log them too
            this.logger.error(
                `${request.method} ${request.url} → 500 Unknown exception: ${JSON.stringify(exception)}`,
            );
        }

        response.status(status).json({
            statusCode: status,
            message,
            errors,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
}
