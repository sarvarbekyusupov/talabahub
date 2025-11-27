import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ArticlesService } from '../services/articles.service';
import { Public } from '../../common/decorators/public.decorator';
import { ArticleStatus } from '../dto/article.dto';

@ApiTags('Blog Feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Get latest articles' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'Latest articles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getLatest(@Query('page') page: number = 1, @Query('limit') limit: number = 12) {
    return this.articlesService.findAll({
      page,
      limit,
      status: ArticleStatus.PUBLISHED,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular articles' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'Popular articles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getPopular(@Query('page') page: number = 1, @Query('limit') limit: number = 12) {
    return this.articlesService.findAll({
      page,
      limit,
      status: ArticleStatus.PUBLISHED,
      sortBy: 'viewCount',
      sortOrder: 'desc',
    });
  }

  @Get('trending')
  @Public()
  @ApiOperation({ summary: 'Get trending articles' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'Trending articles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getTrending(@Query('page') page: number = 1, @Query('limit') limit: number = 12) {
    return this.articlesService.findAll({
      page,
      limit,
      status: ArticleStatus.PUBLISHED,
      sortBy: 'engagementScore',
      sortOrder: 'desc',
    });
  }
}