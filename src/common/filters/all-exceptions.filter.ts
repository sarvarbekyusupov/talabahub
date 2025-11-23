import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      } else {
        message = exceptionResponse;
      }
    }
    // Handle Prisma errors (using type guard for compatibility)
    else if (this.isPrismaKnownRequestError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';

      switch (exception.code) {
        case 'P2002':
          message = `Duplicate entry: ${(exception.meta as any)?.target} already exists`;
          status = HttpStatus.CONFLICT;
          break;
        case 'P2025':
          message = 'Record not found';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          message = 'Foreign key constraint failed';
          break;
        case 'P2014':
          message = 'The change you are trying to make would violate a required relation';
          break;
        default:
          message = 'Database operation failed';
      }
    }
    // Handle Prisma validation errors
    else if (this.isPrismaValidationError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = 'Invalid data provided';
    }
    // Handle other errors
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    });
  }

  private isPrismaKnownRequestError(error: unknown): error is { code: string; meta?: unknown } {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as any).code === 'string' &&
      (error as any).code.startsWith('P')
    );
  }

  private isPrismaValidationError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      error.constructor?.name === 'PrismaClientValidationError'
    );
  }
}
