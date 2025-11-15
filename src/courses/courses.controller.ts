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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CreateCourseEnrollmentDto,
  UpdateEnrollmentProgressDto,
  CompleteEnrollmentDto,
} from './dto/create-course-enrollment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CourseLevel, UserRole } from '@prisma/client';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * Create a new course (Admin/Partner only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  /**
   * Get all courses with filtering and pagination (Public)
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all courses with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'partnerId',
    required: false,
    type: Number,
    description: 'Filter by partner ID',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: CourseLevel,
    description: 'Filter by course level',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    type: String,
    example: 'uz',
    description: 'Filter by course language',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum course price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum course price',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by title or description',
  })
  @ApiResponse({ status: 200, description: 'List of courses' })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('partnerId') partnerId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('level') level?: string,
    @Query('language') language?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    const filters = {
      ...(partnerId && { partnerId: parseInt(partnerId) }),
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(level && { level: level as CourseLevel }),
      ...(language && { language }),
      ...(minPrice && { minPrice: parseFloat(minPrice) }),
      ...(maxPrice && { maxPrice: parseFloat(maxPrice) }),
      ...(search && { search }),
    };

    return this.coursesService.findAll(
      filters,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Get featured courses (Public)
   */
  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured courses' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({ status: 200, description: 'List of featured courses' })
  getFeatured(@Query('limit') limit: string = '10') {
    return this.coursesService.getFeaturedCourses(parseInt(limit));
  }

  /**
   * Search courses (Public)
   */
  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search courses' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(@Query('q') query: string, @Query('limit') limit: string = '20') {
    return this.coursesService.searchCourses(query, parseInt(limit));
  }

  /**
   * Get courses by partner (Public)
   */
  @Get('partner/:partnerId')
  @Public()
  @ApiOperation({ summary: 'Get courses by partner' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Partner courses' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  getPartnerCourses(
    @Param('partnerId') partnerId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.coursesService.getPartnerCourses(
      parseInt(partnerId),
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Get course details (Public)
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get course details by ID' })
  @ApiResponse({ status: 200, description: 'Course details' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  /**
   * Get course by slug (Public)
   */
  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get course by slug' })
  @ApiResponse({ status: 200, description: 'Course details' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  /**
   * Update course (Admin/Partner only)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, updateCourseDto);
  }

  /**
   * Delete course (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  /**
   * Enroll user in course (Authenticated)
   */
  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll user in course' })
  @ApiResponse({
    status: 201,
    description: 'User enrolled successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid enrollment data' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'User already enrolled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enroll(
    @Param('id') courseId: string,
    @Body() enrollmentData: CreateCourseEnrollmentDto,
    @Request() req: any,
  ) {
    return this.coursesService.createEnrollment(
      courseId,
      req.user.sub,
      enrollmentData,
    );
  }

  /**
   * Get user's enrollments (Authenticated)
   */
  @Get('me/enrollments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user enrollments' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'User enrollments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserEnrollments(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.coursesService.getUserEnrollments(
      req.user.sub,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Get course enrollments (Admin/Partner only)
   */
  @Get(':id/enrollments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course enrollments' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Course enrollments' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getCourseEnrollments(
    @Param('id') courseId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Request() req: any,
  ) {
    const partnerId = req.user?.partnerId;
    return this.coursesService.getCourseEnrollments(
      courseId,
      partnerId,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Update enrollment progress (Authenticated)
   */
  @Patch('enrollments/:enrollmentId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update enrollment progress' })
  @ApiResponse({
    status: 200,
    description: 'Progress updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Body() progressData: UpdateEnrollmentProgressDto,
    @Request() req: any,
  ) {
    return this.coursesService.updateEnrollmentProgress(
      enrollmentId,
      req.user.sub,
      progressData,
    );
  }

  /**
   * Mark enrollment as completed (Authenticated)
   */
  @Post('enrollments/:enrollmentId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark enrollment as completed' })
  @ApiResponse({
    status: 200,
    description: 'Course completed successfully',
  })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  completeEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Body() completeData: CompleteEnrollmentDto,
    @Request() req: any,
  ) {
    return this.coursesService.completeEnrollment(
      enrollmentId,
      req.user.sub,
      completeData,
    );
  }

  /**
   * Get enrollment details (Authenticated)
   */
  @Get('enrollments/:enrollmentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get enrollment details' })
  @ApiResponse({ status: 200, description: 'Enrollment details' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getEnrollmentDetails(
    @Param('enrollmentId') enrollmentId: string,
    @Request() req: any,
  ) {
    return this.coursesService.getEnrollmentDetails(enrollmentId, req.user.sub);
  }
}
