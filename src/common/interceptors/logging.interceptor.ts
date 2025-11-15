import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip, body, query, params } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Get user ID if authenticated
    const user = (request as any).user;
    const userId = user?.id || 'anonymous';

    // Log request
    this.logger.http(`➡️  Incoming Request: ${method} ${url}`, {
      method,
      url,
      ip,
      userAgent,
      userId,
      body: this.sanitizeBody(body),
      query,
      params,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Log successful response
          this.logger.logRequest(method, url, statusCode, responseTime, userId);

          // Log slow requests (> 1000ms)
          if (responseTime > 1000) {
            this.logger.warn(`⚠️  Slow request detected: ${method} ${url} took ${responseTime}ms`);
          }
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log error response
          this.logger.error(
            `❌ Request failed: ${method} ${url} - ${statusCode} - ${error.message}`,
            error.stack,
          );
          this.logger.logRequest(method, url, statusCode, responseTime, userId);
        },
      }),
    );
  }

  /**
   * Sanitize request body - remove sensitive fields
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'refreshToken', 'secret', 'apiKey'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
