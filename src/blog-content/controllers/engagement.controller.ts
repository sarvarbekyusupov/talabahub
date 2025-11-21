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
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EngagementService } from '../services';
import {
  ClapDto,
  CreateResponseDto,
  UpdateResponseDto,
  ResponseFilterDto,
  CreateBookmarkDto,
  MoveBookmarkDto,
  CreateCollectionDto,
  UpdateCollectionDto,
  ShareDto,
  CreateReportDto,
} from '../dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Engagement')
@Controller()
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  // ==================== CLAPS ====================

  @Post('articles/:id/clap')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clap article' })
  clapArticle(
    @Param('id') id: string,
    @Body() dto: ClapDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.clapArticle(id, dto, user.id);
  }

  // ==================== RESPONSES ====================

  @Post('articles/:id/responses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create response' })
  createResponse(
    @Param('id') id: string,
    @Body() dto: CreateResponseDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.createResponse(id, dto, user.id);
  }

  @Get('articles/:id/responses')
  @Public()
  @ApiOperation({ summary: 'Get article responses' })
  @ApiQuery({ name: 'sort', required: false, enum: ['best', 'newest', 'oldest'] })
  getResponses(@Param('id') id: string, @Query() filters: ResponseFilterDto) {
    return this.engagementService.getArticleResponses(id, filters);
  }

  @Put('responses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update response' })
  updateResponse(
    @Param('id') id: string,
    @Body() dto: UpdateResponseDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.updateResponse(id, dto, user.id);
  }

  @Delete('responses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete response' })
  deleteResponse(@Param('id') id: string, @CurrentUser() user: any) {
    return this.engagementService.deleteResponse(id, user.id);
  }

  @Post('responses/:id/clap')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clap response' })
  clapResponse(
    @Param('id') id: string,
    @Body() dto: ClapDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.clapResponse(id, dto, user.id);
  }

  @Post('responses/:id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report response' })
  reportResponse(
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.reportResponse(id, dto, user.id);
  }

  // ==================== BOOKMARKS ====================

  @Post('articles/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark article' })
  bookmarkArticle(
    @Param('id') id: string,
    @Body() dto: CreateBookmarkDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.bookmarkArticle(id, dto, user.id);
  }

  @Delete('articles/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark' })
  removeBookmark(@Param('id') id: string, @CurrentUser() user: any) {
    return this.engagementService.removeBookmark(id, user.id);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks' })
  getUserBookmarks(@CurrentUser() user: any) {
    return this.engagementService.getUserBookmarks(user.id);
  }

  @Put('bookmarks/:articleId/collection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move bookmark to collection' })
  moveBookmark(
    @Param('articleId') articleId: string,
    @Body() dto: MoveBookmarkDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.moveBookmark(articleId, dto, user.id);
  }

  // ==================== COLLECTIONS ====================

  @Post('bookmarks/collections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create collection' })
  createCollection(@Body() dto: CreateCollectionDto, @CurrentUser() user: any) {
    return this.engagementService.createCollection(dto, user.id);
  }

  @Put('bookmarks/collections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update collection' })
  updateCollection(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.updateCollection(id, dto, user.id);
  }

  @Delete('bookmarks/collections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete collection' })
  deleteCollection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.engagementService.deleteCollection(id, user.id);
  }

  // ==================== SHARES ====================

  @Post('articles/:id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track article share' })
  shareArticle(
    @Param('id') id: string,
    @Body() dto: ShareDto,
    @CurrentUser() user: any,
  ) {
    return this.engagementService.shareArticle(id, dto, user.id);
  }
}
