# Logging & Monitoring Guide

Complete guide for TalabaHub's logging and monitoring infrastructure.

## Table of Contents

- [Overview](#overview)
- [Logger Module](#logger-module)
- [HTTP Request Logging](#http-request-logging)
- [Performance Monitoring](#performance-monitoring)
- [Health Checks](#health-checks)
- [Configuration](#configuration)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

TalabaHub backend uses a comprehensive logging and monitoring system built with:

- **Winston** - Professional logging framework with file rotation
- **NestJS Interceptors** - HTTP request/response logging
- **@nestjs/terminus** - Health checks and monitoring
- **Custom Performance Tracking** - Real-time endpoint metrics

### Key Features

✅ **Structured Logging** - JSON format for easy parsing
✅ **Daily Log Rotation** - Automatic file rotation and archiving
✅ **Multiple Log Levels** - error, warn, info, http, debug
✅ **Sensitive Data Protection** - Automatic redaction of passwords, tokens
✅ **Performance Metrics** - Track response times and errors
✅ **Health Checks** - Kubernetes-ready readiness/liveness probes
✅ **Memory Monitoring** - Automatic heap and RSS tracking

---

## Logger Module

### File Structure

```
src/logger/
├── logger.module.ts      # Global logger module
└── logger.service.ts     # Winston logger service
```

### Log Files

Logs are written to the `logs/` directory (auto-created):

```
logs/
├── error-2025-11-15.log         # Error logs (14-day retention)
├── combined-2025-11-15.log      # All logs (14-day retention)
└── http-2025-11-15.log          # HTTP requests (7-day retention)
```

### Log Rotation

- **Max file size**: 20MB
- **Date pattern**: YYYY-MM-DD
- **Compression**: gzip for archived logs
- **Retention**:
  - Error logs: 14 days
  - Combined logs: 14 days
  - HTTP logs: 7 days

### Log Levels

| Level   | Priority | Use Case                                    |
|---------|----------|---------------------------------------------|
| `error` | 0        | Critical errors, exceptions                 |
| `warn`  | 1        | Warning conditions, deprecated features     |
| `info`  | 2        | General information, startup messages       |
| `http`  | 3        | HTTP requests/responses                     |
| `debug` | 4        | Detailed debugging information              |

### Usage in Code

```typescript
import { LoggerService } from './logger/logger.service';

@Injectable()
export class YourService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('YourService');
  }

  someMethod() {
    // Info log
    this.logger.log('User registered successfully', 'UserService');

    // Error log
    this.logger.error('Failed to send email', error.stack, 'EmailService');

    // Warning
    this.logger.warn('Deprecated API endpoint used');

    // Debug
    this.logger.debug('Processing payment transaction');
  }
}
```

### Specialized Logging Methods

```typescript
// Database query logging
this.logger.logDatabaseQuery('SELECT * FROM users', 45); // 45ms

// Payment logging
this.logger.logPayment('create', 'payme', 50000, 'order-123');

// Email logging
this.logger.logEmailSent('user@example.com', 'Welcome Email', true);

// File upload logging
this.logger.logFileUpload('user-123', 'avatar', 2048000, true);
```

---

## HTTP Request Logging

### File Location

`src/common/interceptors/logging.interceptor.ts`

### What Gets Logged

Every HTTP request logs:

```json
{
  "timestamp": "2025-11-15 12:34:56",
  "level": "HTTP",
  "context": "HTTP",
  "message": "➡️  Incoming Request: POST /api/auth/login",
  "method": "POST",
  "url": "/api/auth/login",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "userId": "user-123-abc",
  "body": {
    "email": "user@example.com",
    "password": "***REDACTED***"
  },
  "query": {},
  "params": {}
}
```

Response log:

```
✅ POST /api/auth/login 200 - 245ms
```

### Sensitive Data Protection

The following fields are automatically redacted:

- `password`
- `token`
- `refreshToken`
- `secret`
- `apiKey`

### Slow Request Detection

Requests taking longer than 1000ms trigger a warning:

```
⚠️  Slow request detected: GET /api/discounts took 1234ms
```

---

## Performance Monitoring

### File Location

`src/common/interceptors/performance.interceptor.ts`

### Automatic Metrics

Tracks for every endpoint:

- **Request count** - Total number of requests
- **Average response time** - Mean time across all requests
- **Min/Max response time** - Fastest and slowest requests
- **Error count** - Number of failed requests
- **Error rate** - Percentage of failed requests

### Metrics Report (Every 5 Minutes)

```
📊 Performance Metrics Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐌 Top 10 Slowest Endpoints:
  1. POST /api/discounts - Avg: 456.23ms | Count: 45 | Min: 120ms | Max: 890ms | Errors: 0
  2. GET /api/jobs?page=1 - Avg: 234.12ms | Count: 120 | Min: 50ms | Max: 678ms | Errors: 2
  3. POST /api/courses/enroll - Avg: 198.45ms | Count: 67 | Min: 80ms | Max: 456ms | Errors: 1

❌ Endpoints with Errors:
  POST /api/auth/login - Errors: 3/150 (2.00%)
  GET /api/users/profile - Errors: 1/89 (1.12%)

📈 Overall Statistics:
  Total Requests: 1,245
  Total Errors: 15
  Average Response Time: 123.45ms
  Unique Endpoints: 35
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Customizing Report Interval

Edit `src/common/interceptors/performance.interceptor.ts`:

```typescript
private readonly METRICS_REPORT_INTERVAL = 300000; // 5 minutes (in ms)
```

---

## Health Checks

### File Location

```
src/health/
├── health.module.ts
└── health.controller.ts
```

### Available Endpoints

#### 1. Comprehensive Health Check

**GET** `/api/health`

Returns overall health status with all checks:

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "disk": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "disk": {
      "status": "up"
    }
  }
}
```

**Checks**:
- Database connection (Prisma ping)
- Memory heap usage (< 150MB)
- Memory RSS usage (< 300MB)
- Disk storage (> 50% free)

#### 2. Readiness Probe (Kubernetes)

**GET** `/api/health/ready`

Checks if app is ready to serve traffic (database connection):

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
```

Use in Kubernetes:

```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

#### 3. Liveness Probe

**GET** `/api/health/live`

Basic liveness check:

```json
{
  "status": "ok",
  "timestamp": "2025-11-15T12:34:56.789Z",
  "uptime": 3600,
  "environment": "production"
}
```

Use in Kubernetes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

#### 4. System Metrics

**GET** `/api/health/metrics`

Returns detailed system metrics:

```json
{
  "timestamp": "2025-11-15T12:34:56.789Z",
  "uptime": 3600,
  "environment": "production",
  "memory": {
    "rss": "75MB",
    "heapTotal": "50MB",
    "heapUsed": "35MB",
    "external": "5MB"
  },
  "cpu": {
    "user": "1234ms",
    "system": "567ms"
  },
  "node": {
    "version": "v20.10.0",
    "platform": "linux",
    "arch": "x64"
  }
}
```

---

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Logging
LOG_LEVEL=info          # Levels: error, warn, info, http, debug
NODE_ENV=development    # production | development
```

### Log Levels by Environment

**Development**:
```
error, warn, info, http, debug
```

**Production**:
```
error, warn, info, http
```

### Customizing Health Check Thresholds

Edit `src/health/health.controller.ts`:

```typescript
@Get()
check() {
  return this.health.check([
    // Database check
    () => this.prisma.pingCheck('database', this.prismaService),

    // Memory heap (change 150MB threshold)
    () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),

    // Memory RSS (change 300MB threshold)
    () => this.memory.checkRSS('memory_rss', 400 * 1024 * 1024),

    // Disk space (change 50% threshold)
    () =>
      this.disk.checkStorage('disk', {
        path: '/',
        thresholdPercent: 0.7, // 70% free space required
      }),
  ]);
}
```

---

## Production Deployment

### 1. Set Environment Variables

```bash
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
```

### 2. Ensure Logs Directory Exists

The `logs/` directory is auto-created, but ensure proper permissions:

```bash
mkdir -p logs
chmod 755 logs
```

### 3. Log Rotation

Logs are automatically rotated daily. Old logs are:
- Compressed with gzip
- Named with date pattern: `error-2025-11-15.log.gz`
- Deleted after retention period

### 4. Monitoring Integration

#### Prometheus (Optional)

For Prometheus metrics, consider adding:

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

#### ELK Stack

Forward logs to Elasticsearch:

```bash
# Use Filebeat to ship logs
filebeat.yml:
  - type: log
    paths:
      - /path/to/talabahub/logs/*.log
    json.keys_under_root: true
```

#### Grafana Dashboard

Use the `/api/health/metrics` endpoint as a data source.

### 5. Alerting

Set up alerts based on:
- High error rate (> 5%)
- Slow response times (> 1000ms average)
- Memory usage (> 80%)
- Disk space (< 20% free)

---

## Troubleshooting

### Logs Not Being Created

**Issue**: No log files in `logs/` directory

**Solution**:
1. Check `NODE_ENV` is set to `production`
2. Verify write permissions on `logs/` directory
3. Check console for Winston errors

```bash
ls -la logs/
# Should show log files
```

### High Memory Usage

**Issue**: Memory exceeds threshold

**Check**:

```bash
curl http://localhost:3000/api/health/metrics
```

**Solutions**:
- Increase memory limit in health check
- Investigate memory leaks with Node.js profiler
- Add memory dump on threshold breach

### Slow Requests Not Being Detected

**Issue**: Slow requests not logging warnings

**Solution**:

Check `src/common/interceptors/logging.interceptor.ts`:

```typescript
// Adjust threshold (default 1000ms)
if (responseTime > 500) { // Changed to 500ms
  this.logger.warn(`⚠️  Slow request detected...`);
}
```

### Performance Metrics Not Appearing

**Issue**: No performance reports in logs

**Check**:
1. Verify interceptor is registered in `main.ts`
2. Ensure `LoggerService` is properly injected
3. Check if 5 minutes have passed (initial report delay)

**Immediate Report**:

```typescript
// In performance.interceptor.ts, reduce interval for testing
private readonly METRICS_REPORT_INTERVAL = 60000; // 1 minute
```

### Health Check Failing

**Issue**: `/api/health` returns 503 error

**Debug**:

```bash
# Check each component
curl http://localhost:3000/api/health/ready  # Database
curl http://localhost:3000/api/health/live   # Basic liveness
curl http://localhost:3000/api/health/metrics # System metrics
```

**Common Causes**:
- Database not connected
- Memory/disk threshold exceeded
- PrismaService not initialized

---

## Best Practices

### 1. Log Contextually

Always set context for your logger:

```typescript
constructor(private logger: LoggerService) {
  this.logger.setContext('PaymentService');
}
```

### 2. Don't Over-Log

Avoid logging in hot paths:

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

### 3. Use Appropriate Log Levels

```typescript
// Error - Something went wrong
this.logger.error('Payment failed', error.stack);

// Warn - Something unusual but handled
this.logger.warn('Payment provider rate limit reached, retrying');

// Info - Business events
this.logger.log('User enrolled in course successfully');

// Http - Automatic via interceptor
// (no need to log manually)

// Debug - Detailed debugging info
this.logger.debug(`Payment request: ${JSON.stringify(paymentData)}`);
```

### 4. Include Relevant Context

```typescript
// ❌ Bad
this.logger.error('Failed to process payment');

// ✅ Good
this.logger.error(
  `Failed to process payment for user ${userId}, order ${orderId}`,
  error.stack,
  'PaymentService'
);
```

### 5. Monitor Health Probes

Set up monitoring alerts:

```bash
# Uptime monitoring
curl -f http://localhost:3000/api/health || echo "Health check failed"

# Prometheus alert
- alert: HighErrorRate
  expr: talabahub_errors_total / talabahub_requests_total > 0.05
  for: 5m
```

---

## Summary

The TalabaHub logging and monitoring system provides:

✅ **Complete visibility** into application behavior
✅ **Production-ready** log management with rotation
✅ **Real-time performance** insights
✅ **Kubernetes-compatible** health checks
✅ **Automatic sensitive data** protection
✅ **Detailed error tracking** and debugging

For questions or issues, check the logs:

```bash
tail -f logs/combined-$(date +%Y-%m-%d).log
```
