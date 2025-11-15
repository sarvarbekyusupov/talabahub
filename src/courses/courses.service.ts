import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CreateCourseEnrollmentDto,
  UpdateEnrollmentProgressDto,
  CompleteEnrollmentDto,
} from './dto/create-course-enrollment.dto';
import { CourseLevel } from '@prisma/client';

interface FilterOptions {
  partnerId?: number;
  categoryId?: number;
  level?: CourseLevel;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  search?: string;
}

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new course
   */
  async create(createCourseDto: CreateCourseDto) {
    // Verify partner exists
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id: createCourseDto.partnerId },
    });

    if (!partner) {
      throw new BadRequestException('Education partner not found');
    }

    // Verify category exists if provided
    if (createCourseDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: createCourseDto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    // Check if slug is unique
    const existingCourse = await this.prisma.course.findUnique({
      where: { slug: createCourseDto.slug },
    });

    if (existingCourse) {
      throw new ConflictException('Course slug already exists');
    }

    const course = await this.prisma.course.create({
      data: {
        partnerId: createCourseDto.partnerId,
        categoryId: createCourseDto.categoryId,
        title: createCourseDto.title,
        slug: createCourseDto.slug,
        description: createCourseDto.description,
        syllabus: createCourseDto.syllabus,
        learningOutcomes: createCourseDto.learningOutcomes || [],
        thumbnailUrl: createCourseDto.thumbnailUrl,
        promoVideoUrl: createCourseDto.promoVideoUrl,
        level: createCourseDto.level,
        durationHours: createCourseDto.durationHours,
        durationWeeks: createCourseDto.durationWeeks,
        language: createCourseDto.language || 'uz',
        originalPrice: new Decimal(createCourseDto.originalPrice),
        discountPrice: createCourseDto.discountPrice
          ? new Decimal(createCourseDto.discountPrice)
          : null,
        discountPercentage: createCourseDto.discountPercentage,
        currency: createCourseDto.currency || 'UZS',
        prerequisites: createCourseDto.prerequisites || [],
        targetAudience: createCourseDto.targetAudience || [],
        startDate: createCourseDto.startDate,
        endDate: createCourseDto.endDate,
        scheduleInfo: createCourseDto.scheduleInfo,
        isActive: createCourseDto.isActive !== false,
        isFeatured: createCourseDto.isFeatured || false,
      },
      include: {
        partner: true,
        category: true,
      },
    });

    return course;
  }

  /**
   * Find all courses with filtering and pagination
   */
  async findAll(
    filters: FilterOptions = {},
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (filters.partnerId) {
      whereClause.partnerId = filters.partnerId;
    }

    if (filters.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters.level) {
      whereClause.level = filters.level;
    }

    if (filters.language) {
      whereClause.language = filters.language;
    }

    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Price range filtering
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.AND = [
        filters.minPrice !== undefined
          ? { discountPrice: { gte: new Decimal(filters.minPrice) } }
          : { originalPrice: { gte: new Decimal(filters.minPrice || 0) } },
        filters.maxPrice !== undefined
          ? { discountPrice: { lte: new Decimal(filters.maxPrice) } }
          : { originalPrice: { lte: new Decimal(filters.maxPrice || 999999) } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: whereClause,
        include: {
          partner: true,
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where: whereClause }),
    ]);

    return {
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single course by ID
   */
  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        partner: true,
        category: true,
        enrollments: {
          select: {
            id: true,
            userId: true,
            progressPercentage: true,
            completedAt: true,
          },
          take: 5,
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  /**
   * Find a course by slug
   */
  async findBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        partner: true,
        category: true,
        enrollments: {
          select: {
            id: true,
            userId: true,
            progressPercentage: true,
            completedAt: true,
          },
          take: 5,
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  /**
   * Update a course
   */
  async update(id: string, updateCourseDto: UpdateCourseDto) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // If slug is being updated, verify it's unique
    if (updateCourseDto.slug && updateCourseDto.slug !== course.slug) {
      const existingCourse = await this.prisma.course.findUnique({
        where: { slug: updateCourseDto.slug },
      });

      if (existingCourse) {
        throw new ConflictException('Course slug already exists');
      }
    }

    // If category is being updated, verify it exists
    if (
      updateCourseDto.categoryId &&
      updateCourseDto.categoryId !== course.categoryId
    ) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateCourseDto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        ...(updateCourseDto.title && { title: updateCourseDto.title }),
        ...(updateCourseDto.slug && { slug: updateCourseDto.slug }),
        ...(updateCourseDto.description && {
          description: updateCourseDto.description,
        }),
        ...(updateCourseDto.syllabus && { syllabus: updateCourseDto.syllabus }),
        ...(updateCourseDto.learningOutcomes && {
          learningOutcomes: updateCourseDto.learningOutcomes,
        }),
        ...(updateCourseDto.thumbnailUrl && {
          thumbnailUrl: updateCourseDto.thumbnailUrl,
        }),
        ...(updateCourseDto.promoVideoUrl && {
          promoVideoUrl: updateCourseDto.promoVideoUrl,
        }),
        ...(updateCourseDto.level && { level: updateCourseDto.level }),
        ...(updateCourseDto.durationHours && {
          durationHours: updateCourseDto.durationHours,
        }),
        ...(updateCourseDto.durationWeeks && {
          durationWeeks: updateCourseDto.durationWeeks,
        }),
        ...(updateCourseDto.language && { language: updateCourseDto.language }),
        ...(updateCourseDto.originalPrice && {
          originalPrice: new Decimal(updateCourseDto.originalPrice),
        }),
        ...(updateCourseDto.discountPrice && {
          discountPrice: new Decimal(updateCourseDto.discountPrice),
        }),
        ...(updateCourseDto.discountPercentage !== undefined && {
          discountPercentage: updateCourseDto.discountPercentage,
        }),
        ...(updateCourseDto.currency && { currency: updateCourseDto.currency }),
        ...(updateCourseDto.prerequisites && {
          prerequisites: updateCourseDto.prerequisites,
        }),
        ...(updateCourseDto.targetAudience && {
          targetAudience: updateCourseDto.targetAudience,
        }),
        ...(updateCourseDto.startDate && { startDate: updateCourseDto.startDate }),
        ...(updateCourseDto.endDate && { endDate: updateCourseDto.endDate }),
        ...(updateCourseDto.scheduleInfo && {
          scheduleInfo: updateCourseDto.scheduleInfo,
        }),
        ...(updateCourseDto.isActive !== undefined && {
          isActive: updateCourseDto.isActive,
        }),
        ...(updateCourseDto.isFeatured !== undefined && {
          isFeatured: updateCourseDto.isFeatured,
        }),
      },
      include: {
        partner: true,
        category: true,
      },
    });

    return updatedCourse;
  }

  /**
   * Delete a course
   */
  async remove(id: string) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { message: 'Course deleted successfully' };
  }

  /**
   * Enroll a user in a course
   */
  async createEnrollment(
    courseId: string,
    userId: string,
    enrollmentData: CreateCourseEnrollmentDto,
  ) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });

    if (existingEnrollment) {
      throw new ConflictException('User is already enrolled in this course');
    }

    // Create enrollment
    const enrollment = await this.prisma.courseEnrollment.create({
      data: {
        courseId,
        userId,
        amountPaid: new Decimal(enrollmentData.amountPaid),
        commissionEarned: enrollmentData.commissionEarned
          ? new Decimal(enrollmentData.commissionEarned)
          : null,
        paymentMethod: enrollmentData.paymentMethod,
        transactionId: enrollmentData.transactionId,
        status: 'active',
      },
      include: {
        course: {
          include: {
            partner: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update course enrollment count
    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        enrollmentCount: {
          increment: 1,
        },
      },
    });

    return enrollment;
  }

  /**
   * Get user's enrollments
   */
  async getUserEnrollments(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              partner: true,
              category: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.courseEnrollment.count({ where: { userId } }),
    ]);

    return {
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course enrollments (for admins/partners)
   */
  async getCourseEnrollments(
    courseId: string,
    partnerId?: number,
    page: number = 1,
    limit: number = 10,
  ) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { partnerId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify access if partnerId is provided
    if (partnerId && course.partnerId !== partnerId) {
      throw new ForbiddenException(
        'You do not have access to this course enrollments',
      );
    }

    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: { courseId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              universityId: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.courseEnrollment.count({ where: { courseId } }),
    ]);

    return {
      data: enrollments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update enrollment progress
   */
  async updateEnrollmentProgress(
    enrollmentId: string,
    userId: string,
    progressData: UpdateEnrollmentProgressDto,
  ) {
    // Verify enrollment exists and belongs to user
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this enrollment',
      );
    }

    const updatedEnrollment = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercentage: progressData.progressPercentage,
      },
      include: {
        course: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedEnrollment;
  }

  /**
   * Mark course as completed and issue certificate
   */
  async completeEnrollment(
    enrollmentId: string,
    userId: string,
    completeData?: CompleteEnrollmentDto,
  ) {
    // Verify enrollment exists and belongs to user
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this enrollment',
      );
    }

    const completedEnrollment = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'completed',
        progressPercentage: 100,
        completedAt: new Date(),
        ...(completeData?.certificateUrl && {
          certificateUrl: completeData.certificateUrl,
        }),
      },
      include: {
        course: {
          include: {
            partner: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return completedEnrollment;
  }

  /**
   * Get enrollment details
   */
  async getEnrollmentDetails(enrollmentId: string, userId?: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            partner: true,
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Verify access if userId is provided
    if (userId && enrollment.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this enrollment',
      );
    }

    return enrollment;
  }

  /**
   * Search courses
   */
  async searchCourses(query: string, limit: number = 20) {
    const courses = await this.prisma.course.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        partner: true,
        category: true,
      },
      take: limit,
    });

    return courses;
  }

  /**
   * Get featured courses
   */
  async getFeaturedCourses(limit: number = 10) {
    const courses = await this.prisma.course.findMany({
      where: {
        isFeatured: true,
        isActive: true,
      },
      include: {
        partner: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return courses;
  }

  /**
   * Get partner's courses
   */
  async getPartnerCourses(
    partnerId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    // Verify partner exists
    const partner = await this.prisma.educationPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: { partnerId },
        include: {
          category: true,
          enrollments: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where: { partnerId } }),
    ]);

    return {
      data: courses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
