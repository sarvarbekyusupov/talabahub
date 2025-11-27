import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TagsService } from '../services/tags.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Blog Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createTagDto: { name: string; description?: string; color?: string }) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tags with optional search' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  async findAll(@Query('search') search?: string, @Query('limit') limit?: number) {
    return this.tagsService.findAll(search, limit);
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular tags' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Popular tags retrieved successfully' })
  async getPopular(@Query('limit') limit?: number) {
    return this.tagsService.getPopularTags(limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get tag by ID' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get tag by slug' })
  @ApiParam({ name: 'slug', description: 'Tag slug' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTagDto: { name?: string; description?: string; color?: string },
  ) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }

  @Post('usage/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tag usage counts' })
  @ApiResponse({ status: 200, description: 'Tag usage counts updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateUsage() {
    return this.tagsService.updateTagUsage();
  }
}