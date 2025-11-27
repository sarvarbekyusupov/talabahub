import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UniversitiesModule } from './universities/universities.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { DiscountsModule } from './discounts/discounts.module';
import { CompaniesModule } from './companies/companies.module';
import { JobsModule } from './jobs/jobs.module';
import { EducationPartnersModule } from './education-partners/education-partners.module';
import { CoursesModule } from './courses/courses.module';
import { ReviewsModule } from './reviews/reviews.module';
// import { BlogPostsModule } from './blog-posts/blog-posts.module'; // Disabled temporarily
import { EventsModule } from './events/events.module';
import { MailModule } from './mail/mail.module';
import { UploadModule } from './upload/upload.module';
import { PaymentModule } from './payment/payment.module';
import { LoggerModule } from './logger/logger.module';
import { HealthModule } from './health/health.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { AuditModule } from './audit/audit.module';
import { SearchModule } from './search/search.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BlogContentModule } from './blog-content/blog-content.module'; // Rebuilt with proper database schema
import { ResumesModule } from './resumes/resumes.module'; // Rebuilt with proper database schema
import { VerificationModule } from './verification/verification.module'; // Rebuilt with proper database schema
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL') || 60000, // 60 seconds
          limit: config.get('THROTTLE_LIMIT') || 10, // 10 requests
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UniversitiesModule,
    UsersModule,
    CategoriesModule,
    BrandsModule,
    DiscountsModule,
    CompaniesModule,
    JobsModule,
    EducationPartnersModule,
    CoursesModule,
    ReviewsModule,
    // BlogPostsModule, // Disabled temporarily
    EventsModule,
    MailModule,
    UploadModule,
    PaymentModule,
    LoggerModule,
    HealthModule,
    CacheModule,
    QueueModule,
    AuditModule,
    SearchModule,
    SavedSearchesModule,
    NotificationsModule,
    AnalyticsModule,
    BlogContentModule, // Rebuilt with proper database schema
    ResumesModule, // Rebuilt with proper database schema
    VerificationModule, // Rebuilt with proper database schema
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
