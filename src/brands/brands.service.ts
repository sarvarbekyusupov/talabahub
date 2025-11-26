import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto) {
    const { slug, categoryId, ...brandData } = createBrandDto;

    // Check if slug already exists
    const existingBrand = await this.prisma.brand.findUnique({
      where: { slug },
    });

    if (existingBrand) {
      throw new ConflictException('Brand slug already exists');
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

    const brand = await this.prisma.brand.create({
      data: {
        slug,
        categoryId,
        ...brandData,
      },
      include: {
        category: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            slug: true,
          },
        },
      },
    });

    return brand;
  }

  async findAll(
    page = 1,
    limit = 20,
    categoryId?: number,
    isActive?: boolean,
    isFeatured?: boolean,
  ) {
    // Ensure parameters are proper numbers
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (categoryId !== undefined) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) {
      if (isFeatured) {
        where.AND = [
          { isFeatured: true },
          { featuredUntil: { gte: new Date() } },
        ];
      } else {
        where.isFeatured = false;
      }
    }

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limitNum,
        include: {
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
              discounts: true,
            },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      data: brands.map((brand) => ({
        ...brand,
        discountCount: brand._count.discounts,
        _count: undefined,
      })),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            nameRu: true,
            slug: true,
            icon: true,
          },
        },
        discounts: {
          select: {
            id: true,
            title: true,
            discountType: true,
            discountValue: true,
            startDate: true,
            endDate: true,
            isActive: true,
            isFeatured: true,
          },
          where: {
            isActive: true,
            endDate: { gte: new Date() },
          },
        },
        _count: {
          select: {
            discounts: true,
          },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return {
      ...brand,
      discountCount: brand._count.discounts,
      _count: undefined,
    };
  }

  async update(id: number, updateBrandDto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    // Check if slug is being updated and already exists
    if (updateBrandDto.slug && updateBrandDto.slug !== brand.slug) {
      const existingBrand = await this.prisma.brand.findUnique({
        where: { slug: updateBrandDto.slug },
      });

      if (existingBrand) {
        throw new ConflictException('Brand slug already exists');
      }
    }

    // Verify category if being updated
    if (updateBrandDto.categoryId && updateBrandDto.categoryId !== brand.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateBrandDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
      include: {
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
            discounts: true,
          },
        },
      },
    });

    return {
      ...updatedBrand,
      discountCount: updatedBrand._count.discounts,
      _count: undefined,
    };
  }

  async remove(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    // Soft delete
    await this.prisma.brand.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return { message: 'Brand deleted successfully' };
  }

  async getStats(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        discounts: {
          select: {
            id: true,
            _count: {
              select: {
                usages: true,
              },
            },
          },
        },
        _count: {
          select: {
            discounts: true,
          },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const totalUsages = brand.discounts.reduce(
      (sum, discount) => sum + discount._count.usages,
      0,
    );

    return {
      brandId: brand.id,
      name: brand.name,
      totalDiscounts: brand.totalDiscounts,
      totalSales: brand.totalSales,
      rating: brand.rating,
      reviewCount: brand.reviewCount,
      activeDiscounts: brand._count.discounts,
      totalDiscountUsages: totalUsages,
    };
  }

  async updateRatings(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    // Get all reviews for this brand
    const reviews = await this.prisma.review.findMany({
      where: {
        reviewableType: 'brand',
        reviewableId: String(id),
        isApproved: true,
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      // No reviews, reset rating
      await this.prisma.brand.update({
        where: { id },
        data: {
          rating: 0,
          reviewCount: 0,
        },
      });

      return {
        brandId: id,
        rating: 0,
        reviewCount: 0,
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Number((totalRating / reviews.length).toFixed(2));

    // Update brand with new rating
    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: {
        rating: averageRating,
        reviewCount: reviews.length,
      },
    });

    return {
      brandId: updatedBrand.id,
      rating: updatedBrand.rating,
      reviewCount: updatedBrand.reviewCount,
    };
  }

  async getBrandDiscounts(
    brandId: number,
    page = 1,
    limit = 20,
    isActive?: boolean,
    isFeatured?: boolean,
  ) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const skip = (page - 1) * limit;

    const where: any = {
      brandId,
    };

    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    const [discounts, total] = await Promise.all([
      this.prisma.discount.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              nameUz: true,
              slug: true,
            },
          },
          _count: {
            select: {
              usages: true,
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
      data: discounts.map((discount) => ({
        ...discount,
        usageCount: discount._count.usages,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
