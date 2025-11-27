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
import { CommentsService } from '../services/comments.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Blog Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createCommentDto: { content: string; parentId?: string; blogPostId: string },
    @CurrentUser() user: any,
  ) {
    return this.commentsService.create(createCommentDto.blogPostId, user.sub, createCommentDto);
  }

  @Get('post/:blogPostId')
  @Public()
  @ApiOperation({ summary: 'Get comments for a blog post' })
  @ApiParam({ name: 'blogPostId', description: 'Blog Post ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'approved', required: false, type: Boolean })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  async findByBlogPost(
    @Param('blogPostId') blogPostId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('approved') approved?: boolean,
    @Query('parentId') parentId?: string,
  ) {
    return this.commentsService.findByBlogPost(blogPostId, page, limit, { approved, parentId });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: { content?: string; isApproved?: boolean },
    @CurrentUser() user: any,
  ) {
    return this.commentsService.update(id, user.sub, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commentsService.remove(id, user.sub);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment approved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async approveComment(@Param('id') id: string) {
    return this.commentsService.approveComment(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.partner)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment rejected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async rejectComment(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    return this.commentsService.rejectComment(id, body?.reason);
  }

  @Get('post/:blogPostId/count')
  @Public()
  @ApiOperation({ summary: 'Get comment count for a blog post' })
  @ApiParam({ name: 'blogPostId', description: 'Blog Post ID' })
  @ApiQuery({ name: 'approved', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Comment count retrieved successfully' })
  async getCommentCount(
    @Param('blogPostId') blogPostId: string,
    @Query('approved') approved?: boolean,
  ) {
    return this.commentsService.getCommentCount(blogPostId, approved);
  }
}