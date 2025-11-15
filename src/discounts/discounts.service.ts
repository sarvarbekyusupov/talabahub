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
    const skip = (page - 1) * limit;

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
        take: limit,
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
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
}
