import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
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
import { BlogPostsModule } from './blog-posts/blog-posts.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [PrismaModule, UniversitiesModule, UsersModule, CategoriesModule, BrandsModule, DiscountsModule, CompaniesModule, JobsModule, EducationPartnersModule, CoursesModule, ReviewsModule, BlogPostsModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
