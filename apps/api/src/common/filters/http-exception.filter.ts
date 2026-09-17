import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const correlationId = String(response.getHeader('x-correlation-id') ?? '');
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const error = exception instanceof Error ? exception : undefined;
      this.logger.error(
        `[${correlationId || 'unknown'}] ${request.method} ${request.originalUrl} ${error?.name ?? 'UnknownException'}: ${error?.message ?? String(exception)}`,
        error?.stack,
      );
    }
    const message =
      typeof body === 'string'
        ? body
        : body && typeof body === 'object' && 'message' in body
          ? body.message
          : status === HttpStatus.INTERNAL_SERVER_ERROR
            ? 'Internal server error'
            : 'Request failed';

    response.status(status).json({
      error: {
        statusCode: status,
        message,
        path: request.originalUrl,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
