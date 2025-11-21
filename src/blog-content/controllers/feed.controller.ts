import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeedService } from '../services';
import { FeedFilterDto, TrendingFilterDto } from '../dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized feed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPersonalizedFeed(@Query() filters: FeedFilterDto, @CurrentUser() user: any) {
    return this.feedService.getPersonalizedFeed(user.id, filters);
  }

  @Get('trending')
  @Public()
  @ApiOperation({ summary: 'Get trending articles' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['today', 'week', 'month'] })
  getTrending(@Query() filters: TrendingFilterDto) {
    return this.feedService.getTrending(filters);
  }

  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Get latest articles' })
  getLatest(@Query() filters: FeedFilterDto) {
    return this.feedService.getLatest(filters);
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular articles' })
  getPopular(@Query() filters: FeedFilterDto) {
    return this.feedService.getPopular(filters);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured articles' })
  getFeatured(@Query() filters: FeedFilterDto) {
    return this.feedService.getFeatured(filters);
  }

  @Get('following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get articles from followed users' })
  getFollowingFeed(@Query() filters: FeedFilterDto, @CurrentUser() user: any) {
    return this.feedService.getFollowingFeed(user.id, filters);
  }

  @Get('university/:universityId')
  @Public()
  @ApiOperation({ summary: 'Get articles from university' })
  getByUniversity(
    @Param('universityId') universityId: number,
    @Query() filters: FeedFilterDto,
  ) {
    return this.feedService.getByUniversity(universityId, filters);
  }
}
