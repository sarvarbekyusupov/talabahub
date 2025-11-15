import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { Review } from './entities/review.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../audit/audit.service';
import { UserRole } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Create a new review (authenticated users only)
   */
  @Post()
  @AuditLog(AuditAction.CREATE, 'Review')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new review',
    description:
      'Create a review for a brand, course, education partner, or company. Users can only have one review per item.',
  })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: Review,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or invalid reviewable type',
  })
  @ApiResponse({
    status: 409,
    description: 'User already has a review for this item',
  })
  @ApiResponse({
    status: 404,
    description: 'Reviewable item not found',
  })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.create(user.id, createReviewDto);
  }

  /**
   * Get all approved reviews with filtering and pagination
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all reviews',
    description:
      'Retrieve all approved reviews with advanced filtering and pagination options',
  })
  @ApiQuery({
    name: 'reviewableType',
    required: false,
    enum: ['brand', 'course', 'education-partner', 'company'],
    description: 'Filter by reviewable type',
  })
  @ApiQuery({
    name: 'reviewableId',
    required: false,
    description: 'Filter by reviewable item ID',
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: Number,
    description: 'Filter by rating (1-5)',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    type: Boolean,
    description: 'Filter by verified status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    default: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 20,
    description: 'Number of results per page',
  })
  @ApiResponse({
    status: 200,
    description: 'List of reviews with pagination info',
  })
  async findAll(
    @Query('reviewableType') reviewableType?: string,
    @Query('reviewableId') reviewableId?: string,
    @Query('rating') rating?: string,
    @Query('isVerified') isVerified?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    const filters: any = {};
    if (reviewableType) filters.reviewableType = reviewableType;
    if (reviewableId) filters.reviewableId = reviewableId;
    if (rating) {
      const parsedRating = parseInt(rating);
      if (parsedRating >= 1 && parsedRating <= 5) {
        filters.rating = parsedRating;
      }
    }
    if (isVerified !== undefined) {
      filters.isVerified = isVerified === 'true';
    }

    return this.reviewsService.findAll(filters, {
      page: pageNum,
      limit: limitNum,
    });
  }

  /**
   * Get reviews for a specific reviewable item
   */
  @Get(':reviewableType/:reviewableId/reviews')
  @Public()
  @ApiOperation({
    summary: 'Get reviews for an item',
    description:
      'Retrieve all approved reviews for a specific brand, course, education partner, or company',
  })
  @ApiParam({
    name: 'reviewableType',
    enum: ['brand', 'course', 'education-partner', 'company'],
    description: 'Type of reviewable item',
  })
  @ApiParam({
    name: 'reviewableId',
    description: 'ID of the reviewable item',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    default: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'List of reviews for the item',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reviewable type',
  })
  async findByReviewable(
    @Param('reviewableType') reviewableType: string,
    @Param('reviewableId') reviewableId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const validTypes = ['brand', 'course', 'education-partner', 'company'];
    if (!validTypes.includes(reviewableType)) {
      throw new BadRequestException(
        `Invalid reviewable type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    return this.reviewsService.findByReviewable(reviewableType, reviewableId, {
      page: pageNum,
      limit: limitNum,
    });
  }

  /**
   * Get average rating and statistics for an item
   */
  @Get(':reviewableType/:reviewableId/rating')
  @Public()
  @ApiOperation({
    summary: 'Get rating statistics for an item',
    description:
      'Retrieve average rating, review count, and rating distribution for a reviewable item',
  })
  @ApiParam({
    name: 'reviewableType',
    enum: ['brand', 'course', 'education-partner', 'company'],
  })
  @ApiParam({
    name: 'reviewableId',
    description: 'ID of the reviewable item',
  })
  @ApiResponse({
    status: 200,
    description: 'Rating statistics',
  })
  async getAverageRating(
    @Param('reviewableType') reviewableType: string,
    @Param('reviewableId') reviewableId: string,
  ) {
    const validTypes = ['brand', 'course', 'education-partner', 'company'];
    if (!validTypes.includes(reviewableType)) {
      throw new BadRequestException(
        `Invalid reviewable type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    return this.reviewsService.getAverageRating(reviewableType, reviewableId);
  }

  /**
   * Get a specific review by ID
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a review by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Review details',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  /**
   * Update a review (authenticated users only)
   */
  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'Review')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a review',
    description: 'Update your own review. Only the review author can update it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    type: Review,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - not the review author',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateReviewDto>,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.update(id, user.id, updateData);
  }

  /**
   * Delete a review (authenticated users only)
   */
  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'Review')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a review',
    description: 'Delete your own review. Only the review author can delete it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - not the review author',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.remove(id, user.id);
  }

  /**
   * Mark a review as helpful
   */
  @Post(':id/helpful')
  @Public()
  @ApiOperation({
    summary: 'Mark a review as helpful',
    description: 'Increment the helpful count for a review',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Review marked as helpful',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async markAsHelpful(@Param('id') id: string) {
    return this.reviewsService.markAsHelpful(id);
  }

  /**
   * Get reviews for the current user
   */
  @Get('my-reviews/all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my reviews',
    description: 'Retrieve all reviews written by the current authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    default: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'List of user reviews',
  })
  async getUserReviews(
    @CurrentUser() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    return this.reviewsService.getUserReviews(user.id, {
      page: pageNum,
      limit: limitNum,
    });
  }

  /**
   * Moderate a review (admin only)
   */
  @Patch('admin/:id/moderate')
  @ApiBearerAuth()
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Moderate a review (admin only)',
    description: 'Approve or reject a review with optional moderation notes',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Review moderated successfully',
    type: Review,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async moderateReview(
    @Param('id') id: string,
    @Body() moderateData: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateReview(id, moderateData);
  }

  /**
   * Get all reviews for admin (including unapproved)
   */
  @Get('admin/all-reviews/list')
  @ApiBearerAuth()
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Get all reviews for admin (admin only)',
    description:
      'Retrieve all reviews including unapproved ones with advanced filtering',
  })
  @ApiQuery({
    name: 'reviewableType',
    required: false,
    enum: ['brand', 'course', 'education-partner', 'company'],
  })
  @ApiQuery({
    name: 'reviewableId',
    required: false,
  })
  @ApiQuery({
    name: 'isApproved',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    default: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all reviews',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getAllReviewsForAdmin(
    @Query('reviewableType') reviewableType?: string,
    @Query('reviewableId') reviewableId?: string,
    @Query('isApproved') isApproved?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    const filters: any = {};
    if (reviewableType) filters.reviewableType = reviewableType;
    if (reviewableId) filters.reviewableId = reviewableId;
    if (isApproved !== undefined) {
      filters.isApproved = isApproved === 'true';
    }

    return this.reviewsService.findAllForAdmin(filters, {
      page: pageNum,
      limit: limitNum,
    });
  }
}
