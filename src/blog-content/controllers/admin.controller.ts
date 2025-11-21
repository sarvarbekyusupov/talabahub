import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService, AnalyticsService } from '../services';
import {
  ApproveArticleDto,
  RejectArticleDto,
  FeatureArticleDto,
  PendingArticlesFilterDto,
  ReportsFilterDto,
  ResolveReportDto,
  WarnUserDto,
  SuspendUserDto,
} from '../dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Blog Moderation')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // Articles moderation
  @Get('articles/pending')
  @ApiOperation({ summary: 'Get pending articles' })
  getPendingArticles(@Query() filters: PendingArticlesFilterDto) {
    return this.adminService.getPendingArticles(filters);
  }

  @Put('articles/:id/approve')
  @ApiOperation({ summary: 'Approve article' })
  approveArticle(@Param('id') id: string, @Body() dto: ApproveArticleDto) {
    return this.adminService.approveArticle(id, dto);
  }

  @Put('articles/:id/reject')
  @ApiOperation({ summary: 'Reject article' })
  rejectArticle(@Param('id') id: string, @Body() dto: RejectArticleDto) {
    return this.adminService.rejectArticle(id, dto);
  }

  @Post('articles/:id/feature')
  @ApiOperation({ summary: 'Feature article' })
  featureArticle(@Param('id') id: string, @Body() dto: FeatureArticleDto) {
    return this.adminService.featureArticle(id, dto);
  }

  @Delete('articles/:id/feature')
  @ApiOperation({ summary: 'Unfeature article' })
  unfeatureArticle(@Param('id') id: string) {
    return this.adminService.unfeatureArticle(id);
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: 'Delete article (hard delete)' })
  deleteArticle(@Param('id') id: string) {
    return this.adminService.deleteArticle(id);
  }

  // Reports
  @Get('reports')
  @ApiOperation({ summary: 'Get reports' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['article', 'response'] })
  getReports(@Query() filters: ReportsFilterDto) {
    return this.adminService.getReports(filters);
  }

  @Put('reports/:id/resolve')
  @ApiOperation({ summary: 'Resolve report' })
  resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.resolveReport(id, dto, user.id);
  }

  // User management
  @Post('users/:id/warn')
  @ApiOperation({ summary: 'Warn user' })
  warnUser(@Param('id') id: string, @Body() dto: WarnUserDto) {
    return this.adminService.warnUser(id, dto);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  suspendUser(@Param('id') id: string, @Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(id, dto);
  }

  // Platform analytics
  @Get('analytics/platform')
  @ApiOperation({ summary: 'Get platform analytics' })
  getPlatformAnalytics() {
    return this.analyticsService.getPlatformAnalytics();
  }
}
