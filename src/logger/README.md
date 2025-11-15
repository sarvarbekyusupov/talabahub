# Logger Module

Professional logging system built with Winston for TalabaHub backend.

## Overview

The Logger module provides comprehensive logging capabilities with file rotation, multiple log levels, and production-ready features.

### Features

✅ Winston logging framework
✅ Daily log rotation with compression
✅ Multiple log levels (error, warn, info, http, debug)
✅ Separate log files for different purposes
✅ Context-aware logging
✅ Specialized logging methods
✅ Production-optimized configuration

## Installation

Already included in the project. Dependencies:
- `winston` - Logging framework
- `winston-daily-rotate-file` - Log rotation

## Usage

### Basic Usage

```typescript
import { LoggerService } from './logger/logger.service';

@Injectable()
export class YourService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('YourService');
  }

  async yourMethod() {
    // Info log
    this.logger.log('Operation completed successfully');

    // Error log
    this.logger.error('Operation failed', error.stack);

    // Warning
    this.logger.warn('Deprecated API endpoint used');

    // Debug
    this.logger.debug('Processing data: ' + JSON.stringify(data));
  }
}
```

### Specialized Logging Methods

#### Database Query Logging

```typescript
this.logger.logDatabaseQuery('SELECT * FROM users WHERE id = ?', 45); // 45ms
```

#### Payment Logging

```typescript
this.logger.logPayment('create', 'payme', 50000, 'order-123');
// Logs: Payment activity - create via payme, 50000 UZS, order-123
```

#### Email Logging

```typescript
this.logger.logEmailSent('user@example.com', 'Welcome Email', true);
// Logs: Email sent successfully to user@example.com
```

#### File Upload Logging

```typescript
this.logger.logFileUpload('user-123', 'avatar', 2048000, true);
// Logs: File upload - user-123, avatar, 2MB, success
```

## Log Levels

| Level | Priority | Use Case | Environment |
|-------|----------|----------|-------------|
| error | 0 | Critical errors, exceptions | All |
| warn | 1 | Warning conditions, deprecated features | All |
| info | 2 | General information, important events | All |
| http | 3 | HTTP requests/responses | All |
| debug | 4 | Detailed debugging information | Development |

## Log Files

### Production Mode

Logs are written to `logs/` directory:

```
logs/
├── error-2025-11-15.log         # Error logs (14-day retention)
├── combined-2025-11-15.log      # All logs (14-day retention)
└── http-2025-11-15.log          # HTTP requests (7-day retention)
```

### Development Mode

Logs are primarily written to console with color coding.

## Configuration

### Environment Variables

```bash
# Set log level (error, warn, info, http, debug)
LOG_LEVEL=info

# Set environment
NODE_ENV=production
```

### Log Rotation Settings

In `logger.service.ts`:

```typescript
// Error logs
maxSize: '20m',        // Max file size before rotation
maxFiles: '14d',       // Keep logs for 14 days
zippedArchive: true,   // Compress old logs

// Combined logs
maxSize: '20m',
maxFiles: '14d',
zippedArchive: true,

// HTTP logs
maxSize: '20m',
maxFiles: '7d',        // Keep for 7 days
zippedArchive: true,
```

## Examples

### Service with Logger

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('PaymentService');
  }

  async processPayment(orderId: string, amount: number) {
    try {
      this.logger.log(`Processing payment for order ${orderId}`);

      // Process payment...

      this.logger.logPayment('complete', 'click', amount, orderId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Payment failed for order ${orderId}`,
        error.stack,
        'PaymentService'
      );
      throw error;
    }
  }
}
```

### Controller with Logger

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

@Controller('users')
export class UsersController {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UsersController');
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    this.logger.log('Creating new user');

    // Create user...

    this.logger.log(`User created: ${user.id}`);
    return user;
  }
}
```

## Log Format

### Console (Development)

```
2025-11-15 12:34:56 INFO [PaymentService] Processing payment for order order-123
2025-11-15 12:34:57 ERROR [PaymentService] Payment failed: Insufficient funds
```

### File (Production)

```json
{
  "timestamp": "2025-11-15 12:34:56",
  "level": "INFO",
  "context": "PaymentService",
  "message": "Processing payment for order order-123",
  "orderId": "order-123"
}
```

## Best Practices

### 1. Set Context

Always set context for your logger:

```typescript
constructor(private logger: LoggerService) {
  this.logger.setContext('YourServiceName');
}
```

### 2. Use Appropriate Levels

- **error**: System errors, exceptions
- **warn**: Warnings, deprecations
- **info**: Important business events
- **http**: HTTP requests (automatic)
- **debug**: Detailed debugging info

### 3. Include Relevant Information

```typescript
// ❌ Bad
this.logger.error('Payment failed');

// ✅ Good
this.logger.error(
  `Payment failed for user ${userId}, order ${orderId}`,
  error.stack,
  'PaymentService'
);
```

### 4. Don't Over-Log

Avoid logging in loops:

```typescript
// ❌ Bad
for (let i = 0; i < 10000; i++) {
  this.logger.debug(`Processing item ${i}`);
}

// ✅ Good
this.logger.debug(`Processing ${items.length} items`);
// ... process items ...
this.logger.log('Items processed successfully');
```

### 5. Structured Logging

Use objects for structured data:

```typescript
this.logger.log('Payment processed', {
  orderId,
  amount,
  provider,
  userId
});
```

## Monitoring

### Viewing Logs

```bash
# View all logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# View errors only
tail -f logs/error-$(date +%Y-%m-%d).log

# View HTTP requests
tail -f logs/http-$(date +%Y-%m-%d).log

# Search for specific term
grep "payment" logs/combined-$(date +%Y-%m-%d).log
```

### Log Analysis

Use tools like:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **CloudWatch** (AWS)
- **Datadog**

## Troubleshooting

### Logs Not Being Created

**Issue**: No log files in `logs/` directory

**Solution**:
1. Check `NODE_ENV` is set to `production`
2. Verify write permissions:
   ```bash
   mkdir -p logs
   chmod 755 logs
   ```
3. Check console for Winston errors

### Log Files Too Large

**Issue**: Log files growing too large

**Solution**:
1. Reduce retention period in `logger.service.ts`
2. Lower log level in production (info instead of debug)
3. Implement log filtering

### Logs Missing Context

**Issue**: Can't identify log source

**Solution**:
Always set context:
```typescript
this.logger.setContext('ServiceName');
```

## API Reference

### LoggerService Methods

#### `log(message: string, context?: string)`
Log info level message

#### `error(message: string, trace?: string, context?: string)`
Log error with stack trace

#### `warn(message: string, context?: string)`
Log warning

#### `debug(message: string, context?: string)`
Log debug information

#### `http(message: string, meta?: any)`
Log HTTP request (usually automatic via interceptor)

#### `logRequest(method, url, statusCode, responseTime, userId?)`
Log HTTP request details

#### `logError(error: Error, context?: string)`
Log error object

#### `logDatabaseQuery(query: string, duration: number)`
Log database query with duration

#### `logPayment(action, provider, amount, orderId)`
Log payment activity

#### `logEmailSent(to: string, subject: string, success: boolean)`
Log email operation

#### `logFileUpload(userId, fileType, size, success)`
Log file upload operation

## Related Documentation

- [LOGGING_MONITORING_GUIDE.md](../../docs/LOGGING_MONITORING_GUIDE.md) - Complete guide
- [Performance Monitoring](../common/interceptors/README.md) - HTTP logging
- [Health Checks](../health/README.md) - System monitoring

---

**Module**: Logger
**Version**: 1.0.0
**Last Updated**: November 15, 2025
