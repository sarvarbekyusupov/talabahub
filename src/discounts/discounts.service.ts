import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ClaimDiscountDto, RedeemClaimDto } from './dto/claim-discount.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to generate unique claim codes
  private generateClaimCode(): string {
    const random = randomBytes(4).toString('hex').toUpperCase();
    const year = new Date().getFullYear();
    return `STU-${random}-${year}`;
  }

  // Helper to calculate distance between two points (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Helper to check if current time is within active hours
  private isWithinActiveHours(activeTimeStart?: string, activeTimeEnd?: string): boolean {
    if (!activeTimeStart || !activeTimeEnd) return true;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return currentTime >= activeTimeStart && currentTime <= activeTimeEnd;
  }

  // Helper to check if current day is active
  private isActiveDayOfWeek(activeDaysOfWeek?: number[]): boolean {
    if (!activeDaysOfWeek || activeDaysOfWeek.length === 0) return true;
    const currentDay = new Date().getDay();
    return activeDaysOfWeek.includes(currentDay);
  }

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

  // ================================
  // CLAIM PROCESS METHODS
  // ================================

  async claimDiscount(
    discountId: string,
    userId: string,
    claimData: ClaimDiscountDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    // Check eligibility
    const eligibility = await this.checkUserEligibility(discountId, userId, claimData.latitude, claimData.longitude);
    if (!eligibility.canClaim) {
      throw new BadRequestException(eligibility.reason);
    }

    // Generate unique claim code
    let claimCode = this.generateClaimCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await this.prisma.discountClaim.findUnique({
        where: { claimCode },
      });
      if (!existing) break;
      claimCode = this.generateClaimCode();
      attempts++;
    }

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (discount.claimExpiryHours || 24));

    // Create claim
    const claim = await this.prisma.discountClaim.create({
      data: {
        discountId,
        userId,
        claimCode,
        expiresAt,
        ipAddress,
        userAgent,
        deviceId: claimData.deviceId,
        claimLat: claimData.latitude,
        claimLng: claimData.longitude,
      },
      include: {
        discount: {
          select: {
            id: true,
            title: true,
            discountType: true,
            discountValue: true,
            brand: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    // Update discount claim count
    await this.prisma.discount.update({
      where: { id: discountId },
      data: {
        totalClaimsCount: { increment: 1 },
      },
    });

    return {
      claim,
      message: 'Discount claimed successfully',
      expiresAt,
      claimCode,
    };
  }

  async redeemClaim(
    claimCode: string,
    partnerId: string,
    redeemData: RedeemClaimDto,
  ) {
    const claim = await this.prisma.discountClaim.findUnique({
      where: { claimCode },
      include: {
        discount: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentIdNumber: true,
          },
        },
      },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== 'claimed') {
      throw new BadRequestException(`Claim is already ${claim.status}`);
    }

    if (new Date() > claim.expiresAt) {
      // Update status to expired
      await this.prisma.discountClaim.update({
        where: { id: claim.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Claim has expired');
    }

    // Calculate discount amount
    let discountAmount = redeemData.discountAmount;
    if (!discountAmount) {
      const discount = claim.discount;
      if (discount.discountType === 'percentage') {
        discountAmount = (redeemData.transactionAmount * Number(discount.discountValue)) / 100;
        if (discount.maxDiscountAmount && discountAmount > Number(discount.maxDiscountAmount)) {
          discountAmount = Number(discount.maxDiscountAmount);
        }
      } else if (discount.discountType === 'fixed_amount') {
        discountAmount = Number(discount.discountValue);
      }
    }

    // Calculate cashback if applicable
    let cashbackAmount: number | undefined;
    if (claim.discount.discountType === 'cashback' && claim.discount.cashbackPercentage) {
      cashbackAmount = (redeemData.transactionAmount * Number(claim.discount.cashbackPercentage)) / 100;
      if (claim.discount.maxCashbackAmount && cashbackAmount > Number(claim.discount.maxCashbackAmount)) {
        cashbackAmount = Number(claim.discount.maxCashbackAmount);
      }
    }

    // Update claim to redeemed
    const updatedClaim = await this.prisma.discountClaim.update({
      where: { id: claim.id },
      data: {
        status: 'redeemed',
        redeemedAt: new Date(),
        verifiedBy: partnerId,
        verificationNotes: redeemData.verificationNotes,
        transactionAmount: redeemData.transactionAmount,
        discountAmount,
        cashbackAmount,
        redeemLat: redeemData.redeemLat,
        redeemLng: redeemData.redeemLng,
      },
    });

    // Update discount analytics
    await this.prisma.discount.update({
      where: { id: claim.discountId },
      data: {
        totalRedemptions: { increment: 1 },
        currentUsageCount: { increment: 1 },
        totalSavingsGenerated: { increment: discountAmount || 0 },
      },
    });

    // Update user savings
    await this.prisma.user.update({
      where: { id: claim.userId },
      data: {
        totalDiscountsUsed: { increment: 1 },
        totalSavings: { increment: discountAmount || 0 },
      },
    });

    return {
      claim: updatedClaim,
      user: claim.user,
      discountAmount,
      cashbackAmount,
      message: 'Claim redeemed successfully',
    };
  }

  async getUserClaims(userId: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (status) where.status = status;

    const [claims, total] = await Promise.all([
      this.prisma.discountClaim.findMany({
        where,
        skip,
        take: limit,
        include: {
          discount: {
            select: {
              id: true,
              title: true,
              discountType: true,
              discountValue: true,
              imageUrl: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
        orderBy: { claimedAt: 'desc' },
      }),
      this.prisma.discountClaim.count({ where }),
    ]);

    return {
      data: claims,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================================
  // ELIGIBILITY CHECK METHODS
  // ================================

  async checkUserEligibility(
    discountId: string,
    userId: string,
    userLat?: number,
    userLng?: number,
  ): Promise<{ canClaim: boolean; reason?: string }> {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      return { canClaim: false, reason: 'Discount not found' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { canClaim: false, reason: 'User not found' };
    }

    // Check if discount is active and approved
    if (!discount.isActive) {
      return { canClaim: false, reason: 'Discount is not active' };
    }

    if (discount.approvalStatus !== 'approved') {
      return { canClaim: false, reason: 'Discount is not approved' };
    }

    // Check date validity
    const now = new Date();
    if (discount.startDate > now) {
      return { canClaim: false, reason: 'Discount has not started yet' };
    }
    if (discount.endDate < now) {
      return { canClaim: false, reason: 'Discount has expired' };
    }

    // Check time restrictions
    if (!this.isWithinActiveHours(discount.activeTimeStart, discount.activeTimeEnd)) {
      return {
        canClaim: false,
        reason: `Discount is only active between ${discount.activeTimeStart} and ${discount.activeTimeEnd}`,
      };
    }

    // Check day of week restrictions
    if (!this.isActiveDayOfWeek(discount.activeDaysOfWeek)) {
      return { canClaim: false, reason: 'Discount is not active today' };
    }

    // Check university eligibility
    if (discount.universityIds.length > 0 && user.universityId) {
      if (!discount.universityIds.includes(user.universityId)) {
        return { canClaim: false, reason: 'Discount is not available for your university' };
      }
    }

    // Check course year eligibility
    if (discount.minCourseYear && user.courseYear) {
      if (user.courseYear < discount.minCourseYear) {
        return { canClaim: false, reason: `Discount requires minimum course year ${discount.minCourseYear}` };
      }
    }

    // Check first-time only
    if (discount.isFirstTimeOnly) {
      const previousUsage = await this.prisma.discountUsage.findFirst({
        where: { userId },
      });
      if (previousUsage) {
        return { canClaim: false, reason: 'Discount is only for first-time users' };
      }
    }

    // Check location restrictions
    if (discount.allowedCities.length > 0) {
      // TODO: Implement city check based on user's university or location
    }

    if (discount.requiresLocation && discount.locationLat && discount.locationLng) {
      if (!userLat || !userLng) {
        return { canClaim: false, reason: 'Location verification required' };
      }
      const distance = this.calculateDistance(
        Number(discount.locationLat),
        Number(discount.locationLng),
        userLat,
        userLng,
      );
      if (discount.locationRadius && distance > discount.locationRadius) {
        return { canClaim: false, reason: 'You are too far from the discount location' };
      }
    }

    // Check usage limits based on type
    const claimCount = await this.getClaimCountForPeriod(discountId, userId, discount.usageLimitType);

    let maxClaims: number;
    switch (discount.usageLimitType) {
      case 'one_time':
        maxClaims = 1;
        break;
      case 'daily':
        maxClaims = discount.dailyClaimLimit || 1;
        break;
      case 'weekly':
        maxClaims = discount.weeklyClaimLimit || 1;
        break;
      case 'monthly':
        maxClaims = discount.monthlyClaimLimit || 1;
        break;
      case 'unlimited':
        maxClaims = Infinity;
        break;
      default:
        maxClaims = discount.usageLimitPerUser;
    }

    if (claimCount >= maxClaims) {
      return { canClaim: false, reason: 'You have reached the usage limit for this discount' };
    }

    // Check global usage limit
    if (discount.totalUsageLimit && discount.currentUsageCount >= discount.totalUsageLimit) {
      return { canClaim: false, reason: 'This discount has reached its total usage limit' };
    }

    return { canClaim: true };
  }

  private async getClaimCountForPeriod(
    discountId: string,
    userId: string,
    limitType: string,
  ): Promise<number> {
    let startDate: Date | undefined;
    const now = new Date();

    switch (limitType) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly': {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = undefined;
    }

    const where: any = { discountId, userId };
    if (startDate) {
      where.claimedAt = { gte: startDate };
    }

    return this.prisma.discountClaim.count({ where });
  }

  // ================================
  // APPROVAL WORKFLOW METHODS
  // ================================

  async approveDiscount(discountId: string, adminId: string, notes?: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (discount.approvalStatus !== 'pending') {
      throw new BadRequestException(`Discount is already ${discount.approvalStatus}`);
    }

    const updated = await this.prisma.discount.update({
      where: { id: discountId },
      data: {
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: adminId,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      discount: updated,
      message: 'Discount approved successfully',
    };
  }

  async rejectDiscount(discountId: string, adminId: string, reason: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    if (discount.approvalStatus !== 'pending') {
      throw new BadRequestException(`Discount is already ${discount.approvalStatus}`);
    }

    const updated = await this.prisma.discount.update({
      where: { id: discountId },
      data: {
        approvalStatus: 'rejected',
        rejectionReason: reason,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    return {
      discount: updated,
      message: 'Discount rejected',
    };
  }

  async getPendingApprovals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [discounts, total] = await Promise.all([
      this.prisma.discount.findMany({
        where: { approvalStatus: 'pending' },
        skip,
        take: limit,
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
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.discount.count({ where: { approvalStatus: 'pending' } }),
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
              claims: true,
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

  async getPartnerPendingVerifications(brandId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [claims, total] = await Promise.all([
      this.prisma.discountClaim.findMany({
        where: {
          discount: { brandId },
          status: 'claimed',
          expiresAt: { gt: new Date() },
        },
        skip,
        take: limit,
        include: {
          discount: {
            select: {
              id: true,
              title: true,
              discountType: true,
              discountValue: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentIdNumber: true,
            },
          },
        },
        orderBy: { claimedAt: 'desc' },
      }),
      this.prisma.discountClaim.count({
        where: {
          discount: { brandId },
          status: 'claimed',
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return {
      data: claims,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPartnerAnalytics(brandId: number, startDate?: string, endDate?: string) {
    const where: any = { brandId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const discounts = await this.prisma.discount.findMany({
      where,
      select: {
        id: true,
        title: true,
        viewCount: true,
        clickCount: true,
        totalClaimsCount: true,
        totalRedemptions: true,
        totalSavingsGenerated: true,
      },
    });

    const totals = discounts.reduce(
      (acc, d) => ({
        totalViews: acc.totalViews + d.viewCount,
        totalClicks: acc.totalClicks + d.clickCount,
        totalClaims: acc.totalClaims + d.totalClaimsCount,
        totalRedemptions: acc.totalRedemptions + d.totalRedemptions,
        totalSavingsGenerated: acc.totalSavingsGenerated + Number(d.totalSavingsGenerated),
      }),
      { totalViews: 0, totalClicks: 0, totalClaims: 0, totalRedemptions: 0, totalSavingsGenerated: 0 },
    );

    const claimRate = totals.totalViews > 0
      ? ((totals.totalClaims / totals.totalViews) * 100).toFixed(2)
      : 0;
    const redemptionRate = totals.totalClaims > 0
      ? ((totals.totalRedemptions / totals.totalClaims) * 100).toFixed(2)
      : 0;

    return {
      ...totals,
      claimRate,
      redemptionRate,
      discountBreakdown: discounts,
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

    const claims = await this.prisma.discountClaim.findMany({
      where: { userId, status: 'redeemed' },
      select: {
        discountAmount: true,
        cashbackAmount: true,
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

    claims.forEach((claim) => {
      const savings = Number(claim.discountAmount || 0) + Number(claim.cashbackAmount || 0);

      if (claim.discount.category) {
        const catName = claim.discount.category.nameUz;
        categoryStats[catName] = (categoryStats[catName] || 0) + savings;
      }

      const brandName = claim.discount.brand.name;
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
  // FRAUD DETECTION METHODS
  // ================================

  async checkForFraud(
    userId: string,
    discountId: string,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<{ isSuspicious: boolean; alerts: string[] }> {
    const alerts: string[] = [];

    // Check for multiple claims in short period
    const recentClaims = await this.prisma.discountClaim.count({
      where: {
        userId,
        claimedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    if (recentClaims >= 10) {
      alerts.push('Multiple claims in short period');
    }

    // Check for multiple accounts from same device
    if (deviceId) {
      const deviceUsers = await this.prisma.discountClaim.groupBy({
        by: ['userId'],
        where: { deviceId },
        _count: true,
      });

      if (deviceUsers.length > 1) {
        alerts.push('Multiple accounts from same device');
      }
    }

    // Check for multiple accounts from same IP
    if (ipAddress) {
      const ipUsers = await this.prisma.discountClaim.groupBy({
        by: ['userId'],
        where: { ipAddress },
        _count: true,
      });

      if (ipUsers.length > 3) {
        alerts.push('Multiple accounts from same IP');
      }
    }

    if (alerts.length > 0) {
      // Create fraud alert
      await this.prisma.fraudAlert.create({
        data: {
          userId,
          discountId,
          alertType: alerts.length > 1 ? 'suspicious_activity' : 'unusual_pattern',
          description: alerts.join('; '),
          severity: Math.min(alerts.length * 2, 5),
          ipAddress,
          deviceId,
          evidence: { alerts, timestamp: new Date() },
        },
      });
    }

    return {
      isSuspicious: alerts.length > 0,
      alerts,
    };
  }

  async getFraudAlerts(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [alerts, total] = await Promise.all([
      this.prisma.fraudAlert.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          discount: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fraudAlert.count({ where }),
    ]);

    return {
      data: alerts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================================
  // RECOMMENDATION ENGINE
  // ================================

  async getRecommendedDiscounts(
    userId: string,
    userLat?: number,
    userLng?: number,
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

    // Get user's previous claims to understand preferences
    const previousClaims = await this.prisma.discountClaim.findMany({
      where: { userId },
      select: {
        discount: {
          select: {
            categoryId: true,
            brandId: true,
          },
        },
      },
      take: 50,
    });

    const preferredCategories = [...new Set(previousClaims.map((c) => c.discount.categoryId).filter(Boolean))];
    const preferredBrands = [...new Set(previousClaims.map((c) => c.discount.brandId))];

    // Build query for active, approved discounts
    const now = new Date();
    const baseWhere: any = {
      isActive: true,
      approvalStatus: 'approved',
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

      // Location weight (0.2)
      if (userLat && userLng && discount.locationLat && discount.locationLng) {
        const distance = this.calculateDistance(
          userLat,
          userLng,
          Number(discount.locationLat),
          Number(discount.locationLng),
        );
        if (distance < 5000) score += 20; // Within 5km bonus
      }

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

  async expireOldClaims() {
    const result = await this.prisma.discountClaim.updateMany({
      where: {
        status: 'claimed',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
      },
    });

    return { expiredCount: result.count };
  }

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
