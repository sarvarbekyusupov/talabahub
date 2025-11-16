import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createSavedSearchDto: CreateSavedSearchDto) {
    const savedSearch = await this.prisma.savedSearch.create({
      data: {
        userId,
        name: createSavedSearchDto.name,
        type: createSavedSearchDto.type,
        filters: createSavedSearchDto.filters,
      },
    });

    return savedSearch;
  }

  async findAll(userId: string, type?: string) {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const savedSearches = await this.prisma.savedSearch.findMany({
      where,
      orderBy: { lastUsedAt: 'desc' },
    });

    return savedSearches;
  }

  async findOne(id: string, userId: string) {
    const savedSearch = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('You do not have access to this saved search');
    }

    // Update last used timestamp
    await this.prisma.savedSearch.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });

    return savedSearch;
  }

  async update(id: string, userId: string, updateSavedSearchDto: UpdateSavedSearchDto) {
    const savedSearch = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('You do not have access to this saved search');
    }

    const updated = await this.prisma.savedSearch.update({
      where: { id },
      data: updateSavedSearchDto,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const savedSearch = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('You do not have access to this saved search');
    }

    await this.prisma.savedSearch.delete({
      where: { id },
    });

    return { message: 'Saved search deleted successfully' };
  }
}
