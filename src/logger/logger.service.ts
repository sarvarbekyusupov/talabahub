import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const env = this.configService.get('NODE_ENV') || 'development';
    const logLevel = this.configService.get('LOG_LEVEL') || 'info';

    // Custom log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]`;

        if (context) {
          log += ` [${context}]`;
        }

        log += ` ${message}`;

        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }

        if (trace) {
          log += `\n${trace}`;
        }

        return log;
      }),
    );

    // Console transport
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          let log = `${timestamp} ${level}`;

          if (context) {
            log += ` \x1b[33m[${context}]\x1b[0m`;
          }

          log += ` ${message}`;

          if (Object.keys(meta).length > 0 && meta.trace === undefined) {
            log += ` ${JSON.stringify(meta)}`;
          }

          return log;
        }),
      ),
    });

    // File transports
    const errorFileTransport: DailyRotateFile = new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: logFormat,
    });

    const combinedFileTransport: DailyRotateFile = new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    });

    const httpFileTransport: DailyRotateFile = new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      level: 'http',
      format: logFormat,
    });

    // Create logger
    const transports: winston.transport[] = [consoleTransport];

    // Add file transports in production
    if (env === 'production') {
      transports.push(errorFileTransport, combinedFileTransport, httpFileTransport);
    }

    this.logger = winston.createLogger({
      level: logLevel,
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
      },
      format: logFormat,
      transports,
      exitOnError: false,
    });

    // Add custom level colors
    winston.addColors({
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      debug: 'blue',
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context: context || this.context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  http(message: string, meta?: any) {
    this.logger.log('http', message, meta);
  }

  logRequest(method: string, url: string, statusCode: number, responseTime: number, userId?: string) {
    this.http(`${method} ${url} ${statusCode} - ${responseTime}ms`, {
      method,
      url,
      statusCode,
      responseTime,
      userId,
    });
  }

  logError(error: Error, context?: string) {
    this.error(error.message, error.stack, context);
  }

  logDatabaseQuery(query: string, duration: number) {
    this.debug(`DB Query [${duration}ms]: ${query}`, 'Database');
  }

  logPayment(action: string, provider: string, amount: number, orderId: string) {
    this.logger.info('Payment activity', {
      context: 'Payment',
      action,
      provider,
      amount,
      orderId,
    });
  }

  logEmailSent(to: string, subject: string, success: boolean) {
    if (success) {
      this.logger.info('Email sent successfully', {
        context: 'Email',
        to,
        subject,
      });
    } else {
      this.logger.error('Email sending failed', {
        context: 'Email',
        to,
        subject,
      });
    }
  }

  logFileUpload(userId: string, fileType: string, size: number, success: boolean) {
    this.logger.info('File upload', {
      context: 'Upload',
      userId,
      fileType,
      size,
      success,
    });
  }
}
