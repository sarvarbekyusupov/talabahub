import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEducationPartnerDto } from './dto/create-education-partner.dto';
import { UpdateEducationPartnerDto } from './dto/update-education-partner.dto';

@Injectable()
export class EducationPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new education partner
   */
  async create(createEducationPartnerDto: CreateEducationPartnerDto): Promise<any> {
    // Check if slug already exists
    const existingPartner = await this.prisma.educationPartner.findUnique({
      where: { slug: createEducationPartnerDto.slug },
    });

    if (existingPartner) {
      throw new BadRequestException('Partner with this slug already exists');
    }

    return this.prisma.educationPartner.create({
      data: {
        name: createEducationPartnerDto.name,
        slug: createEducationPartnerDto.slug,
        logoUrl: createEducationPartnerDto.logoUrl,
        bannerUrl: createEducationPartnerDto.bannerUrl,
        description: createEducationPartnerDto.description,
        website: createEducationPartnerDto.website,
        email: createEducationPartnerDto.email,
        phone: createEducationPartnerDto.phone,
        address: createEducationPartnerDto.address,
        socialMedia: createEducationPartnerDto.socialMedia,
        commissionRate: createEducationPartnerDto.commissionRate ?? 10,
      },
    });
  }

  /**
   * Get all education partners with pagination and filtering
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    isVerified?: boolean,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (isVerified !== undefined) where.isVerified = isVerified;

    const [partners, total] = await Promise.all([
      this.prisma.educationPartner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.educationPartner.count({ where }),
    ]);

    // Get course count for each partner
    const partnersWithCounts = await Promise.all(
      partners.map(async (partner) => {
        const courseCount = await this.prisma.course.count({
          where: { partnerId: partner.id },
        });
        return {
          ...partner,
          courseCount,
        };
      }),
    );

    return {
      data: partnersWithCounts,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single education partner by ID with course count
   */
  async findOne(id: number): Promise<any> {
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException(`Education partner with ID ${id} not found`);
    }

    const courseCount = await this.prisma.course.count({
      where: { partnerId: id },
    });

    return {
      ...partner,
      courseCount,
    };
  }

  /**
   * Update an education partner
   */
  async update(id: number, updateEducationPartnerDto: UpdateEducationPartnerDto): Promise<any> {
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException(`Education partner with ID ${id} not found`);
    }

    // Check if slug is being changed and if new slug already exists
    if (updateEducationPartnerDto.slug && updateEducationPartnerDto.slug !== partner.slug) {
      const existingPartner = await this.prisma.educationPartner.findUnique({
        where: { slug: updateEducationPartnerDto.slug },
      });
      if (existingPartner) {
        throw new BadRequestException('Partner with this slug already exists');
      }
    }

    return this.prisma.educationPartner.update({
      where: { id },
      data: {
        ...updateEducationPartnerDto,
        commissionRate: updateEducationPartnerDto.commissionRate
          ? (updateEducationPartnerDto.commissionRate)
          : undefined,
      },
    });
  }

  /**
   * Delete an education partner
   */
  async remove(id: number): Promise<any> {
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException(`Education partner with ID ${id} not found`);
    }

    return this.prisma.educationPartner.delete({
      where: { id },
    });
  }

  /**
   * Get all courses for a specific education partner
   */
  async getPartnerCourses(
    partnerId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException(`Education partner with ID ${partnerId} not found`);
    }

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: { partnerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      this.prisma.course.count({
        where: { partnerId },
      }),
    ]);

    return {
      data: courses,
      total,
      page,
      limit,
    };
  }

  /**
   * Get partner statistics including total courses, students, and revenue
   */
  async getPartnerStats(partnerId: number): Promise<{
    partnerId: number;
    totalCourses: number;
    activeCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  }> {
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException(`Education partner with ID ${partnerId} not found`);
    }

    const [totalCourses, activeCourses, totalStudents, totalRevenue] = await Promise.all([
      this.prisma.course.count({
        where: { partnerId },
      }),
      this.prisma.course.count({
        where: { partnerId, isActive: true },
      }),
      this.prisma.courseEnrollment.aggregate({
        where: {
          course: { partnerId },
        },
        _count: {
          userId: true,
        },
      }),
      this.prisma.courseEnrollment.aggregate({
        where: {
          course: { partnerId },
        },
        _sum: {
          amountPaid: true,
        },
      }),
    ]);

    return {
      partnerId,
      totalCourses,
      activeCourses,
      totalStudents: totalStudents._count.userId,
      totalRevenue: totalRevenue._sum.amountPaid ? Number(totalRevenue._sum.amountPaid) : 0,
      averageRating: Number(partner.rating),
      totalReviews: partner.reviewCount,
    };
  }

  /**
   * Update partner rating based on course reviews
   */
  async updatePartnerRating(partnerId: number): Promise<any> {
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException(`Education partner with ID ${partnerId} not found`);
    }

    // Get all reviews for courses from this partner
    const courseIds = await this.prisma.course.findMany({
      where: { partnerId },
      select: { id: true },
    });

    if (courseIds.length === 0) {
      // No courses, keep rating as is
      return partner;
    }

    const courseIdStrings = courseIds.map((c) => c.id);

    // Get reviews for these courses
    const reviews = await this.prisma.review.findMany({
      where: {
        reviewableType: 'course',
        reviewableId: { in: courseIdStrings },
      },
    });

    if (reviews.length === 0) {
      return partner;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    return this.prisma.educationPartner.update({
      where: { id: partnerId },
      data: {
        rating: (averageRating),
        reviewCount: reviews.length,
      },
    });
  }

  /**
   * Search education partners by name
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [partners, total] = await Promise.all([
      this.prisma.educationPartner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.educationPartner.count({ where }),
    ]);

    // Get course count for each partner
    const partnersWithCounts = await Promise.all(
      partners.map(async (partner) => {
        const courseCount = await this.prisma.course.count({
          where: { partnerId: partner.id },
        });
        return {
          ...partner,
          courseCount,
        };
      }),
    );

    return {
      data: partnersWithCounts,
      total,
      page,
      limit,
    };
  }
}
