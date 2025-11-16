import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get partner analytics dashboard
   */
  @Get('partner/dashboard')
  @Roles(UserRole.partner)
  @ApiOperation({ summary: 'Get partner analytics dashboard (Partner only)' })
  @ApiResponse({
    status: 200,
    description: 'Partner analytics data',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Partner role required' })
  getPartnerDashboard(@CurrentUser() user: any) {
    // Assuming user object has partnerId
    const partnerId = user.partnerId || user.id;
    return this.analyticsService.getPartnerAnalytics(partnerId);
  }

  /**
   * Get admin dashboard analytics
   */
  @Get('admin/dashboard')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get admin dashboard analytics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  getAdminDashboard() {
    return this.analyticsService.getAdminDashboard();
  }

  /**
   * Get system health metrics
   */
  @Get('system/health')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get system health metrics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'System health metrics',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  getSystemHealth() {
    return this.analyticsService.getSystemHealth();
  }

  /**
   * Get job analytics
   */
  @Get('jobs')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get job analytics (Admin/Partner only)' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Job analytics data',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getJobAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getJobAnalytics(start, end);
  }

  /**
   * Get event analytics
   */
  @Get('events')
  @Roles(UserRole.admin, UserRole.partner)
  @ApiOperation({ summary: 'Get event analytics (Admin/Partner only)' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Event analytics data',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getEventAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getEventAnalytics(start, end);
  }
}
