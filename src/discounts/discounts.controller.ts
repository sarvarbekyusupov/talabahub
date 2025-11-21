import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import {
  ClaimDiscountDto,
  RedeemClaimDto,
  ApproveDiscountDto,
  RejectDiscountDto,
  FraudAlertActionDto,
} from './dto/claim-discount.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../audit/audit.service';
import { UserRole } from '@prisma/client';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @AuditLog(AuditAction.CREATE, 'Discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new discount (Admin only)' })
  @ApiResponse({ status: 201, description: 'Discount created successfully' })
  @ApiResponse({ status: 404, description: 'Brand or category not found' })
  @ApiResponse({ status: 409, description: 'Promo code already exists' })
  create(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountsService.create(createDiscountDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all discounts with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'brandId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'universityId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of discounts' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('brandId') brandId?: number,
    @Query('categoryId') categoryId?: number,
    @Query('universityId') universityId?: number,
    @Query('isActive') isActive?: boolean,
    @Query('isFeatured') isFeatured?: boolean,
  ) {
    return this.discountsService.findAll(
      page,
      limit,
      brandId,
      categoryId,
      universityId,
      isActive,
      isFeatured,
    );
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get discount by ID' })
  @ApiResponse({ status: 200, description: 'Discount details' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  findOne(@Param('id') id: string) {
    return this.discountsService.findOne(id);
  }

  @Get(':id/can-use')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can use a discount' })
  @ApiResponse({ status: 200, description: 'Can use discount status' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async canUseDiscount(
    @Param('id') discountId: string,
    @CurrentUser() user: any,
  ) {
    const canUse = await this.discountsService.canUserUseDiscount(discountId, user.id);
    return { discountId, userId: user.id, canUse };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get discount statistics' })
  @ApiResponse({ status: 200, description: 'Discount statistics' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async getStats(@Param('id') id: string) {
    return this.discountsService.getDiscountStats(id);
  }

  @Post(':id/use')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record discount usage (Authenticated users only)' })
  @ApiResponse({ status: 201, description: 'Discount usage recorded' })
  @ApiResponse({ status: 400, description: 'Invalid discount usage request' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async useDiscount(
    @Param('id') discountId: string,
    @CurrentUser() user: any,
    @Body() body?: { transactionAmount?: number },
  ) {
    return this.discountsService.recordUsage(
      discountId,
      user.id,
      body?.transactionAmount,
    );
  }

  @Post(':id/view')
  @Public()
  @ApiOperation({ summary: 'Increment discount view count' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async recordView(@Param('id') id: string) {
    return this.discountsService.incrementViewCount(id);
  }

  @Post(':id/click')
  @Public()
  @ApiOperation({ summary: 'Increment discount click count' })
  @ApiResponse({ status: 200, description: 'Click count incremented' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async recordClick(@Param('id') id: string) {
    return this.discountsService.incrementClickCount(id);
  }

  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'Discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update discount by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discount updated successfully' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  @ApiResponse({ status: 409, description: 'Promo code already exists' })
  update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ) {
    return this.discountsService.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'Discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete discount by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discount deleted successfully' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  remove(@Param('id') id: string) {
    return this.discountsService.remove(id);
  }

  // ================================
  // CLAIM ENDPOINTS
  // ================================

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim a discount (get claim code)' })
  @ApiResponse({ status: 201, description: 'Discount claimed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot claim discount' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async claimDiscount(
    @Param('id') discountId: string,
    @CurrentUser() user: any,
    @Body() claimData: ClaimDiscountDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.discountsService.claimDiscount(
      discountId,
      user.id,
      claimData,
      ipAddress,
      userAgent,
    );
  }

  @Post('claims/:code/redeem')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.partner, UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem a claimed discount (Partner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Claim redeemed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot redeem claim' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  async redeemClaim(
    @Param('code') claimCode: string,
    @CurrentUser() user: any,
    @Body() redeemData: RedeemClaimDto,
  ) {
    return this.discountsService.redeemClaim(claimCode, user.id, redeemData);
  }

  @Get('my-claims')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user claims' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of user claims' })
  async getUserClaims(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discountsService.getUserClaims(user.id, status, page, limit);
  }

  @Get(':id/eligibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check user eligibility for a discount' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Eligibility status' })
  async checkEligibility(
    @Param('id') discountId: string,
    @CurrentUser() user: any,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    return this.discountsService.checkUserEligibility(discountId, user.id, lat, lng);
  }

  // ================================
  // ADMIN APPROVAL ENDPOINTS
  // ================================

  @Get('admin/pending-approvals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending discount approvals (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of pending discounts' })
  async getPendingApprovals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discountsService.getPendingApprovals(page, limit);
  }

  @Post(':id/approve')
  @AuditLog(AuditAction.UPDATE, 'Discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a discount (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discount approved' })
  @ApiResponse({ status: 400, description: 'Cannot approve discount' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async approveDiscount(
    @Param('id') discountId: string,
    @CurrentUser() user: any,
    @Body() approveData: ApproveDiscountDto,
  ) {
    return this.discountsService.approveDiscount(discountId, user.id, approveData.notes);
  }

  @Post(':id/reject')
  @AuditLog(AuditAction.UPDATE, 'Discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a discount (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discount rejected' })
  @ApiResponse({ status: 400, description: 'Cannot reject discount' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async rejectDiscount(
    @Param('id') discountId: string,
    @CurrentUser() user: any,
    @Body() rejectData: RejectDiscountDto,
  ) {
    return this.discountsService.rejectDiscount(discountId, user.id, rejectData.reason);
  }

  // ================================
  // PARTNER ENDPOINTS
  // ================================

  @Get('partner/my-discounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get partner discounts (Partner only)' })
  @ApiQuery({ name: 'brandId', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of partner discounts' })
  async getPartnerDiscounts(
    @Query('brandId') brandId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discountsService.getPartnerDiscounts(brandId, page, limit);
  }

  @Get('partner/pending-verifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending claim verifications (Partner only)' })
  @ApiQuery({ name: 'brandId', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of pending verifications' })
  async getPartnerPendingVerifications(
    @Query('brandId') brandId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discountsService.getPartnerPendingVerifications(brandId, page, limit);
  }

  @Get('partner/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get partner analytics (Partner only)' })
  @ApiQuery({ name: 'brandId', required: true, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Partner analytics' })
  async getPartnerAnalytics(
    @Query('brandId') brandId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.discountsService.getPartnerAnalytics(brandId, startDate, endDate);
  }

  // ================================
  // STUDENT ANALYTICS ENDPOINTS
  // ================================

  @Get('analytics/my-savings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user savings analytics' })
  @ApiResponse({ status: 200, description: 'User savings analytics' })
  async getStudentSavings(@CurrentUser() user: any) {
    return this.discountsService.getStudentSavings(user.id);
  }

  // ================================
  // RECOMMENDATION ENDPOINT
  // ================================

  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recommended discounts for user' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of recommended discounts' })
  async getRecommendedDiscounts(
    @CurrentUser() user: any,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discountsService.getRecommendedDiscounts(user.id, lat, lng, limit);
  }

  // ================================
  // FRAUD ALERT ENDPOINTS (Admin)
  // ================================

  @Get('admin/fraud-alerts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get fraud alerts (Admin only)' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of fraud alerts' })
  async getFraudAlerts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.discountsService.getFraudAlerts(page, limit, status);
  }

  // ================================
  // MAINTENANCE ENDPOINTS (Admin)
  // ================================

  @Post('admin/expire-claims')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Expire old claims (Admin only)' })
  @ApiResponse({ status: 200, description: 'Claims expired' })
  async expireOldClaims() {
    return this.discountsService.expireOldClaims();
  }

  @Post('admin/deactivate-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate expired discounts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discounts deactivated' })
  async deactivateExpiredDiscounts() {
    return this.discountsService.deactivateExpiredDiscounts();
  }
}
