import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProfileService, FollowsService, AnalyticsService } from '../services';
import { UpdateStudentProfileDto, FollowersFilterDto } from '../dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly followsService: FollowsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // Profile endpoints
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getCurrentProfile(@CurrentUser() user: any) {
    return this.profileService.getCurrentProfile(user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile' })
  updateProfile(@Body() dto: UpdateStudentProfileDto, @CurrentUser() user: any) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Get('me/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personal analytics' })
  getAnalytics(@CurrentUser() user: any) {
    return this.analyticsService.getStudentAnalytics(user.id);
  }

  @Get(':username')
  @Public()
  @ApiOperation({ summary: 'Get student profile' })
  getProfile(@Param('username') username: string) {
    return this.profileService.getProfile(username);
  }

  @Get(':username/stats')
  @Public()
  @ApiOperation({ summary: 'Get student stats' })
  getStats(@Param('username') username: string) {
    return this.profileService.getStats(username);
  }

  // Follow endpoints
  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow student' })
  follow(@Param('username') username: string, @CurrentUser() user: any) {
    return this.followsService.follow(username, user.id);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow student' })
  unfollow(@Param('username') username: string, @CurrentUser() user: any) {
    return this.followsService.unfollow(username, user.id);
  }

  @Get(':username/followers')
  @Public()
  @ApiOperation({ summary: 'Get followers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFollowers(
    @Param('username') username: string,
    @Query() filters: FollowersFilterDto,
  ) {
    return this.followsService.getFollowers(username, filters.page, filters.limit);
  }

  @Get(':username/following')
  @Public()
  @ApiOperation({ summary: 'Get following' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFollowing(
    @Param('username') username: string,
    @Query() filters: FollowersFilterDto,
  ) {
    return this.followsService.getFollowing(username, filters.page, filters.limit);
  }
}
