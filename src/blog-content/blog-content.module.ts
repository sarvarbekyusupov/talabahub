import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArticlesController } from './controllers/articles.controller';
// import { TagsController } from './controllers/tags.controller';
// import { CommentsController } from './controllers/comments.controller';
// import { EngagementController } from './controllers/engagement.controller';
import { ArticlesService } from './services/articles.service';
// import { TagsService } from './services/tags.service';
// import { CommentsService } from './services/comments.service';
// import { EngagementService } from './services/engagement.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ArticlesController,
    // TagsController,
    // CommentsController,
    // EngagementController,
  ],
  providers: [
    ArticlesService,
    // TagsService,
    // CommentsService,
    // EngagementService,
  ],
  exports: [
    ArticlesService,
    // TagsService,
    // CommentsService,
    // EngagementService,
  ],
})
export class BlogContentModule {}