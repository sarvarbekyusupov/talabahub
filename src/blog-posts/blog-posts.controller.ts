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
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BlogPostsService } from './blog-posts.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { UpdateBlogPostStatusDto } from './dto/update-blog-post-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../audit/audit.service';
import { UserRole } from '@prisma/client';

@ApiTags('Blog Posts')
@Controller('blog-posts')
export class BlogPostsController {
  constructor(private readonly blogPostsService: BlogPostsService) {}

  /**
   * Create a new blog post (Authenticated - Students and Admins)
   */
  @Post()
  @AuditLog(AuditAction.CREATE, 'BlogPost')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a new blog post',
    description: 'Create a new blog post as a draft. Only authenticated users can create posts.',
  })
  @ApiResponse({
    status: 201,
    description: 'Blog post created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or slug already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiBearerAuth()
  create(
    @Body() createBlogPostDto: CreateBlogPostDto,
    @CurrentUser() user: any,
  ) {
    return this.blogPostsService.create(createBlogPostDto, user.id);
  }

  /**
   * Get all published blog posts with pagination and filtering (Public)
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all published blog posts',
    description: 'Retrieve all published blog posts with optional filtering and pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'authorId',
    required: false,
    type: String,
    description: 'Filter by author ID',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'isFeatured',
    required: false,
    type: Boolean,
    description: 'Filter by featured status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of blog posts retrieved successfully',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('authorId') authorId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isFeatured') isFeatured?: string,
  ) {
    const filters = {
      authorId,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
    };

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    return this.blogPostsService.findAll(filters, pagination);
  }

  /**
   * Search blog posts by query (Public)
   */
  @Get('search/:query')
  @Public()
  @ApiOperation({
    summary: 'Search blog posts',
    description: 'Search for blog posts by title, content, or keywords',
  })
  @ApiParam({
    name: 'query',
    description: 'Search query string',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search query',
  })
  search(
    @Param('query') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const filters = {
      categoryId: categoryId ? parseInt(categoryId) : undefined,
    };

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    return this.blogPostsService.search(query, filters, pagination);
  }

  /**
   * Get featured blog posts (Public)
   */
  @Get('featured/posts')
  @Public()
  @ApiOperation({
    summary: 'Get featured blog posts',
    description: 'Retrieve featured blog posts',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of featured posts to retrieve (default: 5)',
  })
  @ApiResponse({
    status: 200,
    description: 'Featured blog posts retrieved successfully',
  })
  getFeaturedPosts(@Query('limit') limit?: string) {
    const limitValue = limit ? parseInt(limit) : 5;
    return this.blogPostsService.getFeaturedPosts(limitValue);
  }

  /**
   * Get trending blog posts (Public)
   */
  @Get('trending/posts')
  @Public()
  @ApiOperation({
    summary: 'Get trending blog posts',
    description: 'Retrieve trending blog posts (most viewed in the last 30 days)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of trending posts to retrieve (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trending blog posts retrieved successfully',
  })
  getTrendingPosts(@Query('limit') limit?: string) {
    const limitValue = limit ? parseInt(limit) : 10;
    return this.blogPostsService.getTrendingPosts(limitValue);
  }

  /**
   * Get blog posts by category (Public)
   */
  @Get('category/:categoryId')
  @Public()
  @ApiOperation({
    summary: 'Get blog posts by category',
    description: 'Retrieve blog posts from a specific category',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'Category ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog posts retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  getByCategory(
    @Param('categoryId') categoryId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    return this.blogPostsService.getByCategory(parseInt(categoryId), pagination);
  }

  /**
   * Get blog posts by author (Public)
   */
  @Get('author/:authorId')
  @Public()
  @ApiOperation({
    summary: 'Get blog posts by author',
    description: 'Retrieve published blog posts from a specific author',
  })
  @ApiParam({
    name: 'authorId',
    description: 'Author user ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog posts retrieved successfully',
  })
  getByAuthor(
    @Param('authorId') authorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    return this.blogPostsService.getByAuthor(authorId, pagination, 'published');
  }

  /**
   * Get a single blog post by ID (Public)
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a blog post by ID',
    description: 'Retrieve a single blog post by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog post retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  findOne(@Param('id') id: string) {
    return this.blogPostsService.findOne(id);
  }

  /**
   * Get blog post by slug (Public)
   */
  @Get('slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get a blog post by slug',
    description: 'Retrieve a single blog post by its slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Blog post slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog post retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  findBySlug(@Param('slug') slug: string) {
    return this.blogPostsService.findBySlug(slug);
  }

  /**
   * Track view count (Public)
   */
  @Post(':id/view')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Track blog post view',
    description: 'Increment the view count for a blog post',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 204,
    description: 'View count incremented successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  trackView(@Param('id') id: string) {
    return this.blogPostsService.incrementViewCount(id);
  }

  /**
   * Update a blog post (Authenticated - Author or Admin)
   */
  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'BlogPost')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update a blog post',
    description: 'Update a blog post. Only the author or admin can update a post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog post updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or slug already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only update your own posts',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() updateBlogPostDto: UpdateBlogPostDto,
    @CurrentUser() user: any,
  ) {
    return this.blogPostsService.update(id, updateBlogPostDto, user.id, user.role);
  }

  /**
   * Publish a blog post (Authenticated - Author or Admin)
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a blog post',
    description: 'Publish a draft blog post. Only the author or admin can publish a post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog post published successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Post is already published',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only publish your own posts',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  @ApiBearerAuth()
  publish(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.blogPostsService.publish(id, user.id, user.role);
  }

  /**
   * Unpublish a blog post (Authenticated - Author or Admin)
   */
  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unpublish a blog post',
    description: 'Convert a published blog post to draft. Only the author or admin can unpublish a post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog post unpublished successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Post is already a draft',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only unpublish your own posts',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  @ApiBearerAuth()
  unpublish(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.blogPostsService.unpublish(id, user.id, user.role);
  }

  /**
   * Update blog post status (Admin only)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Update blog post status',
    description: 'Update blog post status (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog post status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status or post already in that status',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  @ApiBearerAuth()
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateBlogPostStatusDto,
  ) {
    return this.blogPostsService.updateStatus(id, updateStatusDto);
  }

  /**
   * Toggle featured status (Admin only)
   */
  @Post(':id/toggle-featured')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle featured status',
    description: 'Toggle the featured status of a blog post (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Featured status toggled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  @ApiBearerAuth()
  toggleFeatured(@Param('id') id: string) {
    return this.blogPostsService.toggleFeatured(id);
  }

  /**
   * Delete a blog post (Authenticated - Author or Admin)
   */
  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'BlogPost')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a blog post',
    description: 'Delete a blog post. Only the author or admin can delete a post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post ID (UUID)',
  })
  @ApiResponse({
    status: 204,
    description: 'Blog post deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only delete your own posts',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  @ApiBearerAuth()
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.blogPostsService.remove(id, user.id, user.role);
  }
}
