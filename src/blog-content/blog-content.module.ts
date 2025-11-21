import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import {
  ArticlesService,
  EngagementService,
  FollowsService,
  NotificationsService,
  TagsService,
  FeedService,
  SearchService,
  AnalyticsService,
  AdminService,
  ProfileService,
} from './services';

// Controllers
import {
  ArticlesController,
  EngagementController,
  StudentsController,
  TagsController,
  NotificationsController,
  FeedController,
  SearchController,
  AdminController,
} from './controllers';

@Module({
  imports: [PrismaModule],
  controllers: [
    ArticlesController,
    EngagementController,
    StudentsController,
    TagsController,
    NotificationsController,
    FeedController,
    SearchController,
    AdminController,
  ],
  providers: [
    ArticlesService,
    EngagementService,
    FollowsService,
    NotificationsService,
    TagsService,
    FeedService,
    SearchService,
    AnalyticsService,
    AdminService,
    ProfileService,
  ],
  exports: [
    ArticlesService,
    EngagementService,
    FollowsService,
    NotificationsService,
    TagsService,
    FeedService,
    SearchService,
    AnalyticsService,
    AdminService,
    ProfileService,
  ],
})
export class BlogContentModule {}
