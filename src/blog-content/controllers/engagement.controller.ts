import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EngagementService } from '../services/engagement.service';

@ApiTags('Engagement')
@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  // ==========================================
  // CLAPS (Likes) ENDPOINTS
  // ==========================================

  @Post('claps/:blogPostId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle clap (like) on an article' })
  @ApiParam({ name: 'blogPostId', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Clap toggled successfully' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async toggleClap(@Param('blogPostId') blogPostId: string, @Request() req) {
    return this.engagementService.clapArticle(blogPostId, req.user.id);
  }

  @Get('claps/:blogPostId/count')
  @ApiOperation({ summary: 'Get total clap count for an article' })
  @ApiParam({ name: 'blogPostId', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Clap count retrieved successfully' })
  async getClapCount(@Param('blogPostId') blogPostId: string) {
    return this.engagementService.getArticleClapCount(blogPostId);
  }

  @Get('claps/my-claps')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user\'s clapped articles' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'User claps retrieved successfully' })
  async getUserClaps(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.engagementService.getUserClaps(req.user.id, page, limit);
  }

  // ==========================================
  // BOOKMARKS ENDPOINTS
  // ==========================================

  @Post('bookmarks/:blogPostId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle bookmark on an article' })
  @ApiParam({ name: 'blogPostId', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Bookmark toggled successfully' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async toggleBookmark(@Param('blogPostId') blogPostId: string, @Request() req) {
    return this.engagementService.bookmarkArticle(blogPostId, req.user.id);
  }

  @Get('bookmarks/:blogPostId/count')
  @ApiOperation({ summary: 'Get total bookmark count for an article' })
  @ApiParam({ name: 'blogPostId', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Bookmark count retrieved successfully' })
  async getBookmarkCount(@Param('blogPostId') blogPostId: string) {
    return this.engagementService.getArticleBookmarkCount(blogPostId);
  }

  @Get('bookmarks/my-bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user\'s bookmarked articles' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'User bookmarks retrieved successfully' })
  async getUserBookmarks(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.engagementService.getUserBookmarks(req.user.id, page, limit);
  }

  @Get('bookmarks/:blogPostId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if current user has bookmarked an article' })
  @ApiParam({ name: 'blogPostId', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Bookmark status retrieved successfully' })
  async getBookmarkStatus(@Param('blogPostId') blogPostId: string, @Request() req) {
    return this.engagementService.getUserBookmarkStatus(blogPostId, req.user.id);
  }

  // ==========================================
  // ANALYTICS ENDPOINTS
  // ==========================================

  @Get('stats/:blogPostId')
  @ApiOperation({ summary: 'Get comprehensive engagement statistics for an article' })
  @ApiParam({ name: 'blogPostId', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Engagement stats retrieved successfully' })
  async getEngagementStats(@Param('blogPostId') blogPostId: string) {
    return this.engagementService.getEngagementStats(blogPostId);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular articles based on engagement' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of articles to return (default: 10)' })
  @ApiResponse({ status: 200, description: 'Popular articles retrieved successfully' })
  async getPopularArticles(@Query('limit') limit?: number) {
    return this.engagementService.getPopularArticles(limit);
  }
}