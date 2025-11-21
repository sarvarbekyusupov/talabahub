import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ArticlesService } from '../services';
import {
  CreateDraftDto,
  UpdateDraftDto,
  PublishArticleDto,
  UpdateArticleDto,
  ArticleFilterDto,
  TrackViewDto,
} from '../dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // Draft endpoints
  @Post('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new draft' })
  createDraft(@Body() dto: CreateDraftDto, @CurrentUser() user: any) {
    return this.articlesService.createDraft(dto, user.id);
  }

  @Put('drafts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update draft (auto-save)' })
  updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
    @CurrentUser() user: any,
  ) {
    return this.articlesService.updateDraft(id, dto, user.id);
  }

  @Get('drafts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get draft by ID' })
  getDraft(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.getDraft(id, user.id);
  }

  @Get('my/drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user drafts' })
  getUserDrafts(@CurrentUser() user: any) {
    return this.articlesService.getUserDrafts(user.id);
  }

  @Delete('drafts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete draft' })
  deleteDraft(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.deleteDraft(id, user.id);
  }

  // Publish article
  @Post(':draftId/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish article from draft' })
  publishArticle(
    @Param('draftId') draftId: string,
    @Body() dto: PublishArticleDto,
    @CurrentUser() user: any,
  ) {
    return this.articlesService.publishArticle(draftId, dto, user.id);
  }

  // Get articles
  @Get()
  @Public()
  @ApiOperation({ summary: 'List articles with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'author', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['latest', 'popular', 'trending'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() filters: ArticleFilterDto) {
    return this.articlesService.findAll(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get article by ID' })
  findById(@Param('id') id: string) {
    return this.articlesService.findById(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get article by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  @Get('author/:username')
  @Public()
  @ApiOperation({ summary: 'Get articles by author' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByAuthor(
    @Param('username') username: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.articlesService.findByAuthor(username, page, limit);
  }

  @Get(':id/related')
  @Public()
  @ApiOperation({ summary: 'Get related articles' })
  getRelated(@Param('id') id: string) {
    return this.articlesService.getRelated(id);
  }

  // Update article
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update article' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: any,
  ) {
    return this.articlesService.update(id, dto, user.id, user.role);
  }

  // Delete article
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete article' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.delete(id, user.id, user.role);
  }

  // Track view
  @Post(':id/view')
  @Public()
  @ApiOperation({ summary: 'Track article view' })
  trackView(
    @Param('id') id: string,
    @Body() dto: TrackViewDto,
    @CurrentUser() user: any,
  ) {
    return this.articlesService.trackView(id, dto, user?.id);
  }

  // Get stats
  @Get(':id/stats')
  @Public()
  @ApiOperation({ summary: 'Get article stats' })
  getStats(@Param('id') id: string) {
    return this.articlesService.getStats(id);
  }

  @Get(':id/stats/detailed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed stats (author only)' })
  getDetailedStats(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.getDetailedStats(id, user.id);
  }
}
