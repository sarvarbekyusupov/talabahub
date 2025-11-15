import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../logger/logger.service';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private readonly METRICS_REPORT_INTERVAL = 300000; // 5 minutes

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('Performance');
    this.startMetricsReporting();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const endpoint = `${method} ${url}`;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.recordMetric(endpoint, method, duration, false);
        },
        error: () => {
          const duration = Date.now() - startTime;
          this.recordMetric(endpoint, method, duration, true);
        },
      }),
    );
  }

  private recordMetric(endpoint: string, method: string, duration: number, isError: boolean) {
    const existing = this.metrics.get(endpoint);

    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
      if (isError) {
        existing.errors++;
      }
    } else {
      this.metrics.set(endpoint, {
        endpoint,
        method,
        count: 1,
        totalTime: duration,
        avgTime: duration,
        minTime: duration,
        maxTime: duration,
        errors: isError ? 1 : 0,
      });
    }
  }

  private startMetricsReporting() {
    setInterval(() => {
      this.reportMetrics();
    }, this.METRICS_REPORT_INTERVAL);
  }

  private reportMetrics() {
    if (this.metrics.size === 0) {
      return;
    }

    this.logger.log('📊 Performance Metrics Report');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Sort by average time (slowest first)
    const sortedMetrics = Array.from(this.metrics.values()).sort(
      (a, b) => b.avgTime - a.avgTime,
    );

    // Report top 10 slowest endpoints
    const topSlowest = sortedMetrics.slice(0, 10);
    this.logger.log('🐌 Top 10 Slowest Endpoints:');
    topSlowest.forEach((metric, index) => {
      this.logger.log(
        `  ${index + 1}. ${metric.endpoint} - Avg: ${metric.avgTime.toFixed(2)}ms | Count: ${metric.count} | Min: ${metric.minTime}ms | Max: ${metric.maxTime}ms | Errors: ${metric.errors}`,
      );
    });

    // Report endpoints with most errors
    const withErrors = sortedMetrics.filter((m) => m.errors > 0);
    if (withErrors.length > 0) {
      this.logger.log('\n❌ Endpoints with Errors:');
      withErrors.forEach((metric) => {
        const errorRate = ((metric.errors / metric.count) * 100).toFixed(2);
        this.logger.log(
          `  ${metric.endpoint} - Errors: ${metric.errors}/${metric.count} (${errorRate}%)`,
        );
      });
    }

    // Report total statistics
    const totalRequests = sortedMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalErrors = sortedMetrics.reduce((sum, m) => sum + m.errors, 0);
    const avgResponseTime =
      sortedMetrics.reduce((sum, m) => sum + m.avgTime, 0) / sortedMetrics.length;

    this.logger.log('\n📈 Overall Statistics:');
    this.logger.log(`  Total Requests: ${totalRequests}`);
    this.logger.log(`  Total Errors: ${totalErrors}`);
    this.logger.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    this.logger.log(`  Unique Endpoints: ${this.metrics.size}`);
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  public getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  public resetMetrics() {
    this.metrics.clear();
    this.logger.log('Performance metrics reset');
  }
}
