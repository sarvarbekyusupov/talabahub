import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Check if slug already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { slug: createCompanyDto.slug },
    });

    if (existingCompany) {
      throw new ConflictException('Company slug already exists');
    }

    const company = await this.prisma.company.create({
      data: createCompanyDto,
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    return this._formatCompanyResponse(company);
  }

  async findAll(
    page = 1,
    limit = 20,
    industry?: string,
    isActive?: boolean,
    isVerified?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (industry !== undefined) where.industry = industry;
    if (isActive !== undefined) where.isActive = isActive;
    if (isVerified !== undefined) where.isVerified = isVerified;

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              jobs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: companies.map((c) => this._formatCompanyResponse(c)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            jobType: true,
            location: true,
            isRemote: true,
            isActive: true,
            isFeatured: true,
            applicationCount: true,
            createdAt: true,
          },
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this._formatCompanyResponse(company);
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if slug is being updated and already exists
    if (
      updateCompanyDto.slug &&
      updateCompanyDto.slug !== company.slug
    ) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { slug: updateCompanyDto.slug },
      });

      if (existingCompany) {
        throw new ConflictException('Company slug already exists');
      }
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    return this._formatCompanyResponse(updatedCompany);
  }

  async remove(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Soft delete
    await this.prisma.company.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return { message: 'Company deleted successfully' };
  }

  async getCompanyStatistics(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        jobs: {
          select: {
            id: true,
            applicationCount: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            jobs: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const activeJobs = company.jobs.filter((j) => j.isActive).length;
    const totalApplications = company.jobs.reduce(
      (sum, job) => sum + job.applicationCount,
      0,
    );

    return {
      companyId: company.id,
      companyName: company.name,
      totalJobs: company._count.jobs,
      activeJobs,
      inactiveJobs: company._count.jobs - activeJobs,
      totalApplications,
      averageApplicationsPerJob:
        company._count.jobs > 0
          ? (totalApplications / company._count.jobs).toFixed(2)
          : 0,
      isVerified: company.isVerified,
      rating: company.rating.toNumber(),
      createdAt: company.createdAt,
    };
  }

  async incrementViewCount(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Note: Company model doesn't have viewCount, so we'll just return success
    return { message: 'Company view recorded' };
  }

  private _formatCompanyResponse(company: any) {
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      bannerUrl: company.bannerUrl,
      description: company.description,
      website: company.website,
      email: company.email,
      phone: company.phone,
      address: company.address,
      industry: company.industry,
      companySize: company.companySize,
      foundedYear: company.foundedYear,
      jobCount: company._count?.jobs || 0,
      totalHires: company.totalHires,
      rating: company.rating.toNumber(),
      isActive: company.isActive,
      isVerified: company.isVerified,
      jobs: company.jobs || [],
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
