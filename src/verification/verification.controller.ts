import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  SubmitVerificationDto,
  ResendVerificationEmailDto,
} from './dto/submit-verification.dto';
import {
  ReviewVerificationDto,
  BulkReviewVerificationDto,
  VerificationListQueryDto,
} from './dto/review-verification.dto';
import {
  UpdateVerificationStatusDto,
  TriggerReverificationDto,
} from './dto/update-verification-status.dto';
import {
  VerificationStatusResponse,
  VerificationRequestResponse,
  VerificationListResponse,
  VerificationStatsResponse,
} from './dto/verification-response.dto';
import {
  EnterGracePeriodDto,
  ExtendGracePeriodDto,
  UniversityDomainDto,
  UpdateFraudScoreDto,
  GracePeriodEligibilityResponse,
  ExpiringGracePeriodResponse,
  SuspiciousEmailResponse,
} from './dto/grace-period.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly prisma: PrismaService,
  ) {}

  // =============================================
  // PUBLIC ENDPOINTS
  // =============================================

  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiParam({ name: 'token', description: 'Email verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  async verifyEmail(@Param('token') token: string) {
    return this.verificationService.verifyEmail(token);
  }

  // =============================================
  // USER ENDPOINTS
  // =============================================

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user verification status' })
  @ApiResponse({ status: 200, type: VerificationStatusResponse })
  async getVerificationStatus(@Request() req): Promise<VerificationStatusResponse> {
    return this.verificationService.getVerificationStatus(req.user.id);
  }

  @Post('resend-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  async resendVerificationEmail(
    @Request() req,
    @Body() dto: ResendVerificationEmailDto,
  ) {
    return this.verificationService.sendVerificationEmail(req.user.id);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit student verification request' })
  @ApiResponse({ status: 201, type: VerificationRequestResponse })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 409, description: 'Pending request exists' })
  async submitVerification(
    @Request() req,
    @Body() dto: SubmitVerificationDto,
  ): Promise<VerificationRequestResponse> {
    return this.verificationService.submitVerificationRequest(req.user.id, dto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user verification history' })
  @ApiResponse({ status: 200, type: [VerificationRequestResponse] })
  async getVerificationHistory(@Request() req): Promise<VerificationRequestResponse[]> {
    return this.verificationService.getUserVerificationHistory(req.user.id);
  }

  // =============================================
  // ADMIN ENDPOINTS
  // =============================================

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending verification requests (Admin)' })
  @ApiResponse({ status: 200, type: VerificationListResponse })
  async getPendingVerifications(
    @Query() query: VerificationListQueryDto,
  ): Promise<VerificationListResponse> {
    return this.verificationService.getPendingVerifications(query);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification statistics (Admin)' })
  @ApiResponse({ status: 200, type: VerificationStatsResponse })
  async getVerificationStats(): Promise<VerificationStatsResponse> {
    return this.verificationService.getVerificationStats();
  }

  @Get('admin/request/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification request details (Admin)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({ status: 200, type: VerificationRequestResponse })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getVerificationRequest(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VerificationRequestResponse> {
    return this.verificationService.getVerificationRequest(id);
  }

  @Post('admin/review/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review verification request (Admin)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({ status: 200, type: VerificationRequestResponse })
  @ApiResponse({ status: 400, description: 'Invalid decision' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async reviewVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: ReviewVerificationDto,
  ): Promise<VerificationRequestResponse> {
    return this.verificationService.reviewVerification(id, req.user.id, dto);
  }

  @Patch('admin/user/:userId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually update user verification status (Admin)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req,
    @Body() dto: UpdateVerificationStatusDto,
  ) {
    return this.verificationService.updateUserVerificationStatus(
      userId,
      req.user.id,
      dto,
    );
  }

  @Post('admin/user/:userId/reverify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger re-verification for user (Admin)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Re-verification triggered' })
  async triggerReverification(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req,
    @Body() dto: TriggerReverificationDto,
  ) {
    return this.verificationService.triggerReverification(
      userId,
      req.user.id,
      dto,
    );
  }

  @Get('admin/user/:userId/duplicates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check for duplicate accounts (Admin)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Duplicate check results' })
  async checkDuplicates(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.verificationService.checkForDuplicates(userId);
  }

  // =============================================
  // GRACE PERIOD ENDPOINTS
  // =============================================

  @Post('grace-period/enter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enter grace period for user (Admin)' })
  @ApiResponse({ status: 200, description: 'Grace period granted successfully' })
  async enterGracePeriod(
    @Body() dto: EnterGracePeriodDto,
    @Request() req,
  ) {
    try {
      await this.verificationService.enterGracePeriod(
        dto.userId,
        dto.gracePeriodDays,
        dto.reason,
      );
      return { message: 'Grace period granted successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('grace-period/eligibility/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check grace period eligibility' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, type: GracePeriodEligibilityResponse, description: 'Grace period eligibility check' })
  async checkGracePeriodEligibility(@Param('userId', ParseUUIDPipe) userId: string): Promise<GracePeriodEligibilityResponse> {
    try {
      return await this.verificationService.checkGracePeriodEligibility(userId);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post('grace-period/extend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extend grace period for user (Admin)' })
  @ApiResponse({ status: 200, description: 'Grace period extended successfully' })
  async extendGracePeriod(
    @Body() dto: ExtendGracePeriodDto,
    @Request() req,
  ) {
    try {
      await this.verificationService.extendGracePeriod(
        dto.userId,
        dto.additionalDays,
        req.user.id,
        dto.reason,
      );
      return { message: 'Grace period extended successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('grace-period/expiring')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users with expiring grace periods (Admin)' })
  @ApiResponse({ status: 200, type: [ExpiringGracePeriodResponse], description: 'List of users with expiring grace periods' })
  async getExpiringGracePeriods(): Promise<ExpiringGracePeriodResponse[]> {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      return await this.prisma.user.findMany({
        where: {
          verificationStatus: 'grace_period',
          nextVerificationDue: {
            gte: now,
            lte: threeDaysFromNow,
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          nextVerificationDue: true,
          verificationNotes: true,
        },
        orderBy: { nextVerificationDue: 'asc' },
      });
    } catch (error) {
      throw new BadRequestException('Failed to fetch expiring grace periods');
    }
  }

  // =============================================
  // UNIVERSITY DOMAIN ENDPOINTS
  // =============================================

  @Get('university-domains')
  @ApiOperation({ summary: 'Get supported university domains' })
  @ApiResponse({ status: 200, description: 'List of supported university domains' })
  async getSupportedUniversityDomains() {
    return this.verificationService.getSupportedDomains();
  }

  @Post('admin/university-domains')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add university domain (Admin)' })
  @ApiResponse({ status: 200, description: 'University domain added successfully' })
  async addUniversityDomain(@Body() dto: UniversityDomainDto) {
    try {
      await this.verificationService.addUniversityDomain(dto);
      return { message: 'University domain added successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // =============================================
  // FRAUD DETECTION ENDPOINTS
  // =============================================

  @Post('admin/fraud-score/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user fraud score (Admin)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Fraud score updated successfully' })
  async updateFraudScore(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateFraudScoreDto,
  ) {
    try {
      await this.verificationService.updateFraudScore(userId, dto.scoreChange, dto.reason);
      return { message: 'Fraud score updated successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('admin/suspicious-emails')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get suspicious emails for review (Admin)' })
  @ApiResponse({ status: 200, type: [SuspiciousEmailResponse], description: 'List of suspicious emails' })
  async getSuspiciousEmails(): Promise<SuspiciousEmailResponse[]> {
    try {
      return await this.prisma.user.findMany({
        where: {
          fraudScore: { gte: 50 },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          fraudScore: true,
          verificationStatus: true,
          createdAt: true,
        },
        orderBy: { fraudScore: 'desc' },
        take: 100,
      });
    } catch (error) {
      throw new BadRequestException('Failed to fetch suspicious emails');
    }
  }
}
