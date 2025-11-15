import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...data } = createCategoryDto;

    // Validate parent category exists if parentId is provided
    if (parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID ${parentId} not found`);
      }
    }

    // Check if slug is unique
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Category with slug "${data.slug}" already exists`);
    }

    return this.prisma.category.create({
      data: {
        ...data,
        parentId: parentId || null,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 20, isActive?: boolean) {
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where: whereClause,
        include: {
          parent: true,
          children: true,
        },
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.category.count({ where: whereClause }),
    ]);

    return {
      data: categories,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async getRootCategories(isActive?: boolean) {
    const whereClause: any = { parentId: null };
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    return this.prisma.category.findMany({
      where: whereClause,
      include: {
        parent: true,
        children: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getChildren(id: number) {
    const category = await this.findOne(id);

    return this.prisma.category.findMany({
      where: { parentId: id },
      include: {
        parent: true,
        children: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCategoryTree(isActive?: boolean) {
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    const allCategories = await this.prisma.category.findMany({
      where: whereClause,
      include: {
        parent: true,
        children: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Build tree structure
    const categoryMap = new Map();
    const tree: any[] = [];

    // Create a map of all categories
    for (const category of allCategories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    // Build tree by linking parent-child relationships
    for (const category of allCategories) {
      if (category.parentId === null) {
        tree.push(categoryMap.get(category.id));
      } else {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      }
    }

    return tree;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    const { parentId, slug, ...data } = updateCategoryDto;

    // Validate parent category exists if parentId is provided
    if (parentId !== undefined && parentId !== null) {
      if (parentId === id) {
        throw new ConflictException('A category cannot be its own parent');
      }

      const parentCategory = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID ${parentId} not found`);
      }

      // Check for circular dependencies
      const parentAncestors = await this.getAncestors(parentId);
      if (parentAncestors.some((ancestor) => ancestor.id === id)) {
        throw new ConflictException(
          'Cannot set parent to a descendant category (circular dependency)',
        );
      }
    }

    // Check if new slug is unique
    if (slug && slug !== category.slug) {
      const existingSlug = await this.prisma.category.findUnique({
        where: { slug },
      });

      if (existingSlug) {
        throw new ConflictException(`Category with slug "${slug}" already exists`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...data,
        ...(slug && { slug }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    return this.prisma.category.delete({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  private async getAncestors(id: number): Promise<any[]> {
    const ancestors: any[] = [];
    let currentId: number | null = id;

    while (currentId !== null) {
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { id: true, parentId: true },
      });

      if (!category) break;
      ancestors.push(category);
      currentId = category.parentId;
    }

    return ancestors;
  }
}
