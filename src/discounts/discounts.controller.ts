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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete discount by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Discount deleted successfully' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  remove(@Param('id') id: string) {
    return this.discountsService.remove(id);
  }
}
