import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TagsService } from '../services';
import { CreateTagDto, TagFilterDto } from '../dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'popular', required: false, type: Boolean })
  findAll(@Query() filters: TagFilterDto) {
    return this.tagsService.findAll(filters);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search tags' })
  @ApiQuery({ name: 'q', required: true })
  search(@Query('q') query: string) {
    return this.tagsService.search(query);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get tag details with articles' })
  findBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create tag (admin only)' })
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }
}
