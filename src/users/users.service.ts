import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole, UserVerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, ...userData } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        ...userData,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAll(page = 1, limit = 20, role?: UserRole, universityId?: number) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (universityId) where.universityId = universityId;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          verificationStatus: true,
          isActive: true,
          university: {
            select: {
              id: true,
              nameUz: true,
              logoUrl: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        university: true,
        _count: {
          select: {
            referrals: true,
            discountUsages: true,
            jobApplications: true,
            courseEnrollments: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, emailVerificationToken, passwordResetToken, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...updateData } = updateUserDto as any;

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateProfileDto,
    });

    const { passwordHash, emailVerificationToken, passwordResetToken, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return { message: 'User deleted successfully' };
  }

  async updateVerificationStatus(
    id: string,
    status: UserVerificationStatus,
    notes?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        verificationStatus: status,
        verificationDate: new Date(),
        verificationNotes: notes,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        verificationStatus: true,
        verificationDate: true,
      },
    });

    return updatedUser;
  }

  async getUserStats(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            referrals: true,
            discountUsages: true,
            jobApplications: true,
            courseEnrollments: true,
            reviews: true,
            blogPosts: true,
            eventRegistrations: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      totalDiscountsUsed: user.totalDiscountsUsed,
      totalSavings: user.totalSavings,
      referralsCount: user._count.referrals,
      discountUsagesCount: user._count.discountUsages,
      jobApplicationsCount: user._count.jobApplications,
      courseEnrollmentsCount: user._count.courseEnrollments,
      reviewsCount: user._count.reviews,
      blogPostsCount: user._count.blogPosts,
      eventRegistrationsCount: user._count.eventRegistrations,
    };
  }
}
