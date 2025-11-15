import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { Decimal } from '@prisma/client/runtime/library';

interface ReviewFilterQuery {
  reviewableType?: string;
  reviewableId?: string;
  userId?: string;
  rating?: number;
  isVerified?: boolean;
  isApproved?: boolean;
  isAnonymous?: boolean;
}

interface PaginationParams {
  page: number;
  limit: number;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new review with polymorphic support
   * Prevents duplicate reviews (one review per user per item)
   */
  async create(
    userId: string,
    createReviewDto: CreateReviewDto,
  ) {
    const {
      reviewableType,
      reviewableId,
      rating,
      title,
      comment,
      pros,
      cons,
      isAnonymous,
    } = createReviewDto;

    // Validate reviewable type
    const validTypes = ['brand', 'course', 'education-partner', 'company'];
    if (!validTypes.includes(reviewableType)) {
      throw new BadRequestException(
        `Invalid reviewableType. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Check if user already has a review for this item
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_reviewableType_reviewableId: {
          userId,
          reviewableType,
          reviewableId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'You have already reviewed this item. Please update your existing review instead.',
      );
    }

    // Validate that the reviewable item exists
    await this.validateReviewableItem(reviewableType, reviewableId);

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        userId,
        reviewableType,
        reviewableId,
        rating,
        title: title || null,
        comment: comment || null,
        pros: pros || null,
        cons: cons || null,
        isAnonymous: isAnonymous || false,
        isVerified: await this.isVerifiedReviewer(userId, reviewableType, reviewableId),
        isApproved: true, // Default approval
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update the rating for the reviewable item
    await this.updateReviewableItemRating(reviewableType, reviewableId);

    return review;
  }

  /**
   * Get all reviews with advanced filtering and pagination
   */
  async findAll(
    filters: ReviewFilterQuery = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      isApproved: true, // Only return approved reviews
      ...filters,
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get reviews for a specific reviewable item
   */
  async findByReviewable(
    reviewableType: string,
    reviewableId: string,
    pagination: PaginationParams = { page: 1, limit: 20 },
  ) {
    return this.findAll(
      {
        reviewableType,
        reviewableId,
      },
      pagination,
    );
  }

  /**
   * Get a single review by ID
   */
  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  /**
   * Update a review (only by the author or admin)
   */
  async update(
    id: string,
    userId: string,
    updateData: Partial<CreateReviewDto>,
  ) {
    const review = await this.findOne(id);

    // Check authorization
    if (review.userId !== userId) {
      throw new UnauthorizedException(
        'You can only update your own reviews',
      );
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        title: updateData.title ?? review.title,
        comment: updateData.comment ?? review.comment,
        pros: updateData.pros ?? review.pros,
        cons: updateData.cons ?? review.cons,
        rating: updateData.rating ?? review.rating,
        isAnonymous: updateData.isAnonymous ?? review.isAnonymous,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update the rating for the reviewable item
    await this.updateReviewableItemRating(
      review.reviewableType,
      review.reviewableId,
    );

    return updatedReview;
  }

  /**
   * Delete a review (only by the author or admin)
   */
  async remove(id: string, userId: string) {
    const review = await this.findOne(id);

    // Check authorization
    if (review.userId !== userId) {
      throw new UnauthorizedException(
        'You can only delete your own reviews',
      );
    }

    await this.prisma.review.delete({
      where: { id },
    });

    // Update the rating for the reviewable item
    await this.updateReviewableItemRating(
      review.reviewableType,
      review.reviewableId,
    );

    return { message: 'Review deleted successfully' };
  }

  /**
   * Mark a review as helpful
   */
  async markAsHelpful(id: string) {
    const review = await this.findOne(id);

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        helpfulCount: review.helpfulCount + 1,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updatedReview;
  }

  /**
   * Approve or reject a review (admin only)
   */
  async moderateReview(
    id: string,
    moderateData: ModerateReviewDto,
  ) {
    const review = await this.findOne(id);

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        isApproved: moderateData.isApproved,
        moderationNotes: moderateData.moderationNotes || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updatedReview;
  }

  /**
   * Get all reviews (including unapproved) for admin
   */
  async findAllForAdmin(
    filters: ReviewFilterQuery = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: filters,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: filters }),
    ]);

    return {
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calculate average rating for a reviewable item
   */
  async getAverageRating(reviewableType: string, reviewableId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        reviewableType,
        reviewableId,
        isApproved: true,
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = parseFloat((sum / reviews.length).toFixed(2));

    // Calculate rating distribution
    const distribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    return {
      averageRating: average,
      reviewCount: reviews.length,
      ratingDistribution: distribution,
    };
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 20 },
  ) {
    return this.findAll(
      { userId },
      pagination,
    );
  }

  /**
   * Check if a user is a verified reviewer
   * (e.g., has purchased from the reviewable item)
   */
  private async isVerifiedReviewer(
    userId: string,
    reviewableType: string,
    reviewableId: string,
  ): Promise<boolean> {
    switch (reviewableType) {
      case 'course': {
        // Check if user has enrolled in the course
        const enrollment = await this.prisma.courseEnrollment.findFirst({
          where: {
            userId,
            courseId: reviewableId,
          },
        });
        return !!enrollment;
      }

      case 'brand':
      case 'education-partner':
      case 'company':
      default:
        // For other types, default to not verified unless explicitly purchased
        return false;
    }
  }

  /**
   * Validate that the reviewable item exists
   */
  private async validateReviewableItem(
    reviewableType: string,
    reviewableId: string,
  ): Promise<void> {
    switch (reviewableType) {
      case 'brand': {
        const brand = await this.prisma.brand.findUnique({
          where: { id: parseInt(reviewableId) },
        });
        if (!brand) {
          throw new NotFoundException(
            `Brand with ID ${reviewableId} not found`,
          );
        }
        break;
      }

      case 'course': {
        const course = await this.prisma.course.findUnique({
          where: { id: reviewableId },
        });
        if (!course) {
          throw new NotFoundException(
            `Course with ID ${reviewableId} not found`,
          );
        }
        break;
      }

      case 'education-partner': {
        const partner = await this.prisma.educationPartner.findUnique({
          where: { id: parseInt(reviewableId) },
        });
        if (!partner) {
          throw new NotFoundException(
            `Education Partner with ID ${reviewableId} not found`,
          );
        }
        break;
      }

      case 'company': {
        const company = await this.prisma.company.findUnique({
          where: { id: parseInt(reviewableId) },
        });
        if (!company) {
          throw new NotFoundException(
            `Company with ID ${reviewableId} not found`,
          );
        }
        break;
      }

      default:
        throw new BadRequestException(`Invalid reviewable type: ${reviewableType}`);
    }
  }

  /**
   * Update the average rating for a reviewable item
   */
  private async updateReviewableItemRating(
    reviewableType: string,
    reviewableId: string,
  ): Promise<void> {
    const ratingData = await this.getAverageRating(
      reviewableType,
      reviewableId,
    );

    switch (reviewableType) {
      case 'brand': {
        await this.prisma.brand.update({
          where: { id: parseInt(reviewableId) },
          data: {
            rating: new Decimal(ratingData.averageRating),
            reviewCount: ratingData.reviewCount,
          },
        });
        break;
      }

      case 'course': {
        await this.prisma.course.update({
          where: { id: reviewableId },
          data: {
            rating: new Decimal(ratingData.averageRating),
            reviewCount: ratingData.reviewCount,
          },
        });
        break;
      }

      case 'education-partner': {
        await this.prisma.educationPartner.update({
          where: { id: parseInt(reviewableId) },
          data: {
            rating: new Decimal(ratingData.averageRating),
            reviewCount: ratingData.reviewCount,
          },
        });
        break;
      }

      case 'company': {
        await this.prisma.company.update({
          where: { id: parseInt(reviewableId) },
          data: {
            rating: new Decimal(ratingData.averageRating),
          },
        });
        break;
      }
    }
  }
}
