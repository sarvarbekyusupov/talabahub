import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';

@Injectable()
export class UniversitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUniversityDto: CreateUniversityDto) {
    const { emailDomain, ...universityData } = createUniversityDto;

    // Check if university with same email domain already exists
    if (emailDomain) {
      const existingUniversity = await this.prisma.university.findUnique({
        where: { emailDomain },
      });

      if (existingUniversity) {
        throw new ConflictException('University with this email domain already exists');
      }
    }

    const university = await this.prisma.university.create({
      data: {
        emailDomain,
        ...universityData,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return this.formatUniversityResponse(university);
  }

  async findAll(page = 1, limit = 20, isActive?: boolean) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [universities, total] = await Promise.all([
      this.prisma.university.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.university.count({ where }),
    ]);

    return {
      data: universities.map((uni) => this.formatUniversityResponse(uni)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const university = await this.prisma.university.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    return this.formatUniversityResponse(university);
  }

  async update(id: number, updateUniversityDto: UpdateUniversityDto) {
    const university = await this.prisma.university.findUnique({
      where: { id },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    // Check if trying to update email domain to an existing one
    if (
      updateUniversityDto.emailDomain &&
      updateUniversityDto.emailDomain !== university.emailDomain
    ) {
      const existingUniversity = await this.prisma.university.findUnique({
        where: { emailDomain: updateUniversityDto.emailDomain },
      });

      if (existingUniversity) {
        throw new ConflictException('University with this email domain already exists');
      }
    }

    const updatedUniversity = await this.prisma.university.update({
      where: { id },
      data: updateUniversityDto,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return this.formatUniversityResponse(updatedUniversity);
  }

  async remove(id: number) {
    const university = await this.prisma.university.findUnique({
      where: { id },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    // Soft delete by marking as inactive
    await this.prisma.university.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return { message: 'University deleted successfully' };
  }

  async getUniversityStats(id: number) {
    const university = await this.prisma.university.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    const activeUsers = university.users.filter((user) => user.isActive).length;
    const studentCount = university.users.filter((user) => user.role === 'student').length;
    const adminCount = university.users.filter((user) => user.role === 'admin').length;
    const partnerCount = university.users.filter((user) => user.role === 'partner').length;

    return {
      universityId: university.id,
      universityName: university.nameUz,
      totalUsers: university._count.users,
      activeUsers,
      studentCount,
      adminCount,
      partnerCount,
    };
  }

  private formatUniversityResponse(university: any) {
    const { _count, ...data } = university;
    return {
      ...data,
      userCount: _count?.users || 0,
    };
  }
}
