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
        } else if (exception instanceof Error) {
            message = exception.message;
            this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
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
