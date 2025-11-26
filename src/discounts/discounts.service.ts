import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDiscountDto: CreateDiscountDto) {
    const { brandId, categoryId, promoCode, ...discountData } = createDiscountDto;

    // Verify brand exists
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    // Check if promo code is already in use (if provided)
    if (promoCode) {
      const existingPromoCode = await this.prisma.discount.findFirst({
        where: { promoCode },
      });

      if (existingPromoCode) {
        throw new ConflictException('Promo code already exists');
      }
    }

    // Verify category exists if provided
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const discount = await this.prisma.discount.create({
      data: {
        brandId,
        categoryId,
        promoCode,
        ...discountData,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
          },
        },
      },
    });

    return discount;
  }

  async findAll(
    page = 1,
    limit = 20,
    brandId?: number,
    categoryId?: number,
    universityId?: number,
    isActive?: boolean,
    isFeatured?: boolean,
  ) {
    // Ensure page and limit are numbers
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (brandId !== undefined) where.brandId = brandId;
    if (categoryId !== undefined) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    // Filter by university if provided
    if (universityId !== undefined) {
      where.universityIds = {
        has: universityId,
      };
    }

    // Filter by active date range
    where.AND = [
      { startDate: { lte: new Date() } },
      { endDate: { gte: new Date() } },
    ];

    const [discounts, total] = await Promise.all([
      this.prisma.discount.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              website: true,
            },
          },
          category: {
            select: {
              id: true,
              nameUz: true,
              slug: true,
            },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.discount.count({ where }),
    ]);

    return {
      data: discounts,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            bannerUrl: true,
            description: true,
            website: true,
            contactEmail: true,
            contactPhone: true,
            rating: true,
            reviewCount: true,
            totalDiscounts: true,
            totalSales: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            slug: true,
          },
        },
        _count: {
          select: {
            usages: true,
          },
        },
      },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    return discount;
  }

  async update(id: string, updateDiscountDto: UpdateDiscountDto) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    // Verify brand if being updated
    if (updateDiscountDto.brandId && updateDiscountDto.brandId !== discount.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: updateDiscountDto.brandId },
      });

      if (!brand) {
        throw new NotFoundException('Brand not found');
      }
    }

    // Verify category if being updated
    if (updateDiscountDto.categoryId && updateDiscountDto.categoryId !== discount.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateDiscountDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Check if promo code is already in use (if being updated)
    if (
      updateDiscountDto.promoCode &&
      updateDiscountDto.promoCode !== discount.promoCode
    ) {
      const existingPromoCode = await this.prisma.discount.findFirst({
        where: { promoCode: updateDiscountDto.promoCode },
      });

      if (existingPromoCode) {
        throw new ConflictException('Promo code already exists');
      }
    }

    const { categoryId, brandId, ...updateData } = updateDiscountDto;

    const updatedDiscount = await this.prisma.discount.update({
      where: { id },
      data: updateData,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
          },
        },
      },
    });

    return updatedDiscount;
  }

  async remove(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    // Soft delete
    await this.prisma.discount.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return { message: 'Discount deleted successfully' };
  }

  async recordUsage(
    discountId: string,
    userId: string,
    transactionAmount?: number,
  ) {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (!discount.isActive) {
      throw new BadRequestException('Discount is not active');
    }

    // Check if discount has expired
    const now = new Date();
    if (discount.startDate > now || discount.endDate < now) {
      throw new BadRequestException('Discount is not valid for the current date');
    }

    // Check usage limits
    const userUsageCount = await this.prisma.discountUsage.count({
      where: {
        discountId,
        userId,
      },
    });

    if (userUsageCount >= discount.usageLimitPerUser) {
      throw new BadRequestException(
        `You have reached the usage limit for this discount (${discount.usageLimitPerUser})`,
      );
    }

    if (discount.totalUsageLimit && discount.currentUsageCount >= discount.totalUsageLimit) {
      throw new BadRequestException('This discount has reached its total usage limit');
    }

    // Create usage record
    const usage = await this.prisma.discountUsage.create({
      data: {
        discountId,
        userId,
        transactionAmount: transactionAmount ? String(transactionAmount) : undefined,
      },
    });

    // Update discount usage count
    await this.prisma.discount.update({
      where: { id: discountId },
      data: {
        currentUsageCount: {
          increment: 1,
        },
      },
    });

    return usage;
  }

  async incrementViewCount(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    const updated = await this.prisma.discount.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
        viewCount: true,
        clickCount: true,
      },
    });

    return updated;
  }

  async incrementClickCount(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    const updated = await this.prisma.discount.update({
      where: { id },
      data: {
        clickCount: {
          increment: 1,
        },
      },
      select: {
        id: true,
        viewCount: true,
        clickCount: true,
      },
    });

    return updated;
  }

  async canUserUseDiscount(discountId: string, userId: string): Promise<boolean> {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (!discount.isActive) {
      return false;
    }

    // Check date validity
    const now = new Date();
    if (discount.startDate > now || discount.endDate < now) {
      return false;
    }

    // Check user usage count
    const userUsageCount = await this.prisma.discountUsage.count({
      where: {
        discountId,
        userId,
      },
    });

    if (userUsageCount >= discount.usageLimitPerUser) {
      return false;
    }

    // Check total usage limit
    if (discount.totalUsageLimit && discount.currentUsageCount >= discount.totalUsageLimit) {
      return false;
    }

    return true;
  }

  async getDiscountStats(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            usages: true,
          },
        },
      },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    const conversionRate = discount.viewCount > 0
      ? ((discount.clickCount / discount.viewCount) * 100).toFixed(2)
      : 0;

    return {
      discountId: discount.id,
      title: discount.title,
      viewCount: discount.viewCount,
      clickCount: discount.clickCount,
      conversionRate,
      totalUsages: discount._count.usages,
      currentUsageCount: discount.currentUsageCount,
      totalUsageLimit: discount.totalUsageLimit,
      usageLimitPerUser: discount.usageLimitPerUser,
      remainingGlobalUsage: discount.totalUsageLimit
        ? discount.totalUsageLimit - discount.currentUsageCount
        : null,
    };
  }

  // ================================
  // PARTNER METHODS
  // ================================

  async getPartnerDiscounts(brandId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [discounts, total] = await Promise.all([
      this.prisma.discount.findMany({
        where: { brandId },
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              nameUz: true,
            },
          },
          _count: {
            select: {
              usages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.discount.count({ where: { brandId } }),
    ]);

    return {
      data: discounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async pauseDiscount(discountId: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (!discount.isActive) {
      throw new BadRequestException('Discount is already paused/inactive');
    }

    const updated = await this.prisma.discount.update({
      where: { id: discountId },
      data: {
        isActive: false,
      },
    });

    return {
      discount: updated,
      message: 'Discount paused successfully',
    };
  }

  async resumeDiscount(discountId: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (discount.isActive) {
      throw new BadRequestException('Discount is already active');
    }

    // Check if discount is still valid
    const now = new Date();
    if (discount.endDate < now) {
      throw new BadRequestException('Cannot resume expired discount');
    }

    const updated = await this.prisma.discount.update({
      where: { id: discountId },
      data: {
        isActive: true,
      },
    });

    return {
      discount: updated,
      message: 'Discount resumed successfully',
    };
  }

  // ================================
  // STUDENT ANALYTICS METHODS
  // ================================

  async getStudentSavings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalDiscountsUsed: true,
        totalSavings: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const usages = await this.prisma.discountUsage.findMany({
      where: { userId },
      include: {
        discount: {
          select: {
            category: {
              select: {
                id: true,
                nameUz: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Calculate savings by category
    const categoryStats: Record<string, number> = {};
    const brandStats: Record<string, number> = {};

    usages.forEach((usage) => {
      const savings = Number(usage.discountAmount || 0);

      if (usage.discount.category) {
        const catName = usage.discount.category.nameUz;
        categoryStats[catName] = (categoryStats[catName] || 0) + savings;
      }

      const brandName = usage.discount.brand.name;
      brandStats[brandName] = (brandStats[brandName] || 0) + savings;
    });

    return {
      totalDiscountsUsed: user.totalDiscountsUsed,
      totalSavings: user.totalSavings,
      savingsByCategory: categoryStats,
      savingsByBrand: brandStats,
    };
  }

  // ================================
  // RECOMMENDATION ENGINE
  // ================================

  async getRecommendedDiscounts(
    userId: string,
    limit = 20,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        universityId: true,
        courseYear: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's previous usages to understand preferences
    const previousUsages = await this.prisma.discountUsage.findMany({
      where: { userId },
      include: {
        discount: {
          select: {
            categoryId: true,
            brandId: true,
          },
        },
      },
      take: 50,
    });

    const preferredCategories = [...new Set(previousUsages.map((u) => u.discount.categoryId).filter(Boolean))];
    const preferredBrands = [...new Set(previousUsages.map((u) => u.discount.brandId))];

    // Build query for active discounts
    const now = new Date();
    const baseWhere: any = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    };

    // Add university filter if applicable
    if (user.universityId) {
      baseWhere.OR = [
        { universityIds: { isEmpty: true } },
        { universityIds: { has: user.universityId } },
      ];
    }

    const discounts = await this.prisma.discount.findMany({
      where: baseWhere,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            rating: true,
          },
        },
        category: {
          select: {
            id: true,
            nameUz: true,
          },
        },
      },
      take: limit * 2, // Get more to score and sort
    });

    // Score and sort discounts
    const scoredDiscounts = discounts.map((discount) => {
      let score = 0;

      // Discount value weight (0.3)
      score += Number(discount.discountValue) * 0.3;

      // Brand popularity weight (0.2)
      score += Number(discount.brand.rating) * 20;

      // Time remaining weight (0.15)
      const timeRemaining = discount.endDate.getTime() - now.getTime();
      const daysRemaining = timeRemaining / (1000 * 60 * 60 * 24);
      if (daysRemaining < 7) score += 15; // Expiring soon bonus

      // User interest weight (0.15)
      if (preferredCategories.includes(discount.categoryId)) score += 15;
      if (preferredBrands.includes(discount.brandId)) score += 10;

      // Featured bonus
      if (discount.isFeatured) score += 10;

      return { ...discount, score };
    });

    // Sort by score and return top results
    scoredDiscounts.sort((a, b) => b.score - a.score);

    return scoredDiscounts.slice(0, limit).map(({ score, ...discount }) => discount);
  }

  // ================================
  // EXPIRATION HANDLING
  // ================================

  async deactivateExpiredDiscounts() {
    const result = await this.prisma.discount.updateMany({
      where: {
        isActive: true,
        endDate: { lt: new Date() },
      },
      data: {
        isActive: false,
      },
    });

    return { deactivatedCount: result.count };
  }
}