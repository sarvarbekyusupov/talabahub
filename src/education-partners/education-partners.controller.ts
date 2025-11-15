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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerTokenAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { EducationPartnersService } from './education-partners.service';
import { CreateEducationPartnerDto } from './dto/create-education-partner.dto';
import { UpdateEducationPartnerDto } from './dto/update-education-partner.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Education Partners')
@Controller('education-partners')
@UseGuards(RolesGuard)
export class EducationPartnersController {
  constructor(private readonly educationPartnersService: EducationPartnersService) {}

  /**
   * Create a new education partner (Admin and Partner roles only)
   */
  @Post()
  @Roles('admin', 'partner')
  @ApiBearerTokenAuth()
  @ApiOperation({ summary: 'Create a new education partner' })
  @ApiResponse({
    status: 201,
    description: 'Education partner created successfully',
    schema: {
      example: {
        id: 1,
        name: 'Tech Academy Uzbekistan',
        slug: 'tech-academy-uzbekistan',
        logoUrl: 'https://example.com/logo.png',
        bannerUrl: 'https://example.com/banner.png',
        description: 'Leading technology education provider',
        website: 'https://techacademy.uz',
        email: 'contact@techacademy.uz',
        phone: '+998 71 200 0000',
        address: 'Tashkent, Uzbekistan',
        socialMedia: { facebook: 'https://facebook.com/techacademy' },
        totalCourses: 0,
        totalStudents: 0,
        rating: '10.00',
        reviewCount: 0,
        commissionRate: '15.50',
        isActive: true,
        isVerified: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - slug already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  create(@Body() createEducationPartnerDto: CreateEducationPartnerDto) {
    return this.educationPartnersService.create(createEducationPartnerDto);
  }

  /**
   * Get all education partners with pagination and filtering (Public endpoint)
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all education partners with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Education partners retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Tech Academy Uzbekistan',
            slug: 'tech-academy-uzbekistan',
            logoUrl: 'https://example.com/logo.png',
            bannerUrl: 'https://example.com/banner.png',
            description: 'Leading technology education provider',
            website: 'https://techacademy.uz',
            email: 'contact@techacademy.uz',
            phone: '+998 71 200 0000',
            address: 'Tashkent, Uzbekistan',
            socialMedia: null,
            totalCourses: 5,
            totalStudents: 150,
            rating: '4.50',
            reviewCount: 25,
            commissionRate: '15.50',
            isActive: true,
            isVerified: true,
            courseCount: 5,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    },
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('isVerified') isVerified?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isActiveFilter = isActive ? isActive === 'true' : undefined;
    const isVerifiedFilter = isVerified ? isVerified === 'true' : undefined;

    return this.educationPartnersService.findAll(pageNum, limitNum, isActiveFilter, isVerifiedFilter);
  }

  /**
   * Search education partners by name/description (Public endpoint)
   */
  @Get('search/:query')
  @Public()
  @ApiOperation({ summary: 'Search education partners by name or description' })
  @ApiParam({ name: 'query', description: 'Search query string' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  search(
    @Param('query') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.educationPartnersService.search(query, pageNum, limitNum);
  }

  /**
   * Get a single education partner by ID (Public endpoint)
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get education partner by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Partner ID' })
  @ApiResponse({
    status: 200,
    description: 'Education partner retrieved successfully',
    schema: {
      example: {
        id: 1,
        name: 'Tech Academy Uzbekistan',
        slug: 'tech-academy-uzbekistan',
        logoUrl: 'https://example.com/logo.png',
        bannerUrl: 'https://example.com/banner.png',
        description: 'Leading technology education provider',
        website: 'https://techacademy.uz',
        email: 'contact@techacademy.uz',
        phone: '+998 71 200 0000',
        address: 'Tashkent, Uzbekistan',
        socialMedia: null,
        totalCourses: 5,
        totalStudents: 150,
        rating: '4.50',
        reviewCount: 25,
        commissionRate: '15.50',
        isActive: true,
        isVerified: true,
        courseCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Education partner not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.educationPartnersService.findOne(id);
  }

  /**
   * Get all courses from a specific partner (Public endpoint)
   */
  @Get(':id/courses')
  @Public()
  @ApiOperation({ summary: "Get all courses from a partner" })
  @ApiParam({ name: 'id', type: Number, description: 'Partner ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Partner courses retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            partnerId: 1,
            categoryId: 1,
            title: 'Introduction to Web Development',
            slug: 'intro-web-dev',
            description: 'Learn the basics of web development',
            level: 'beginner',
            rating: '4.75',
            enrollmentCount: 250,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  getPartnerCourses(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.educationPartnersService.getPartnerCourses(id, pageNum, limitNum);
  }

  /**
   * Get partner statistics (Public endpoint)
   */
  @Get(':id/stats')
  @Public()
  @ApiOperation({ summary: 'Get partner statistics including courses, students, and revenue' })
  @ApiParam({ name: 'id', type: Number, description: 'Partner ID' })
  @ApiResponse({
    status: 200,
    description: 'Partner statistics retrieved successfully',
    schema: {
      example: {
        partnerId: 1,
        totalCourses: 5,
        activeCourses: 4,
        totalStudents: 350,
        totalRevenue: 125000,
        averageRating: 4.5,
        totalReviews: 35,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  getPartnerStats(@Param('id', ParseIntPipe) id: number) {
    return this.educationPartnersService.getPartnerStats(id);
  }

  /**
   * Update an education partner (Admin and Partner roles only)
   */
  @Patch(':id')
  @Roles('admin', 'partner')
  @ApiBearerTokenAuth()
  @ApiOperation({ summary: 'Update an education partner' })
  @ApiParam({ name: 'id', type: Number, description: 'Partner ID' })
  @ApiResponse({
    status: 200,
    description: 'Education partner updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Education partner not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEducationPartnerDto: UpdateEducationPartnerDto,
  ) {
    return this.educationPartnersService.update(id, updateEducationPartnerDto);
  }

  /**
   * Delete an education partner (Admin only)
   */
  @Delete(':id')
  @Roles('admin')
  @ApiBearerTokenAuth()
  @ApiOperation({ summary: 'Delete an education partner (Admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Partner ID' })
  @ApiResponse({
    status: 200,
    description: 'Education partner deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'Education partner not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.educationPartnersService.remove(id);
  }
}
