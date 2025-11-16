import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SavedSearchesService } from './saved-searches.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Saved Searches')
@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedSearchesController {
  constructor(private readonly savedSearchesService: SavedSearchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new saved search' })
  @ApiResponse({
    status: 201,
    description: 'Saved search created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createSavedSearchDto: CreateSavedSearchDto,
    @CurrentUser() user: any,
  ) {
    return this.savedSearchesService.create(user.id, createSavedSearchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all saved searches for current user' })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter by search type (job, event, course, discount)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of saved searches',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: any, @Query('type') type?: string) {
    return this.savedSearchesService.findAll(user.id, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved search by ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved search details',
  })
  @ApiResponse({ status: 404, description: 'Saved search not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.savedSearchesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved search' })
  @ApiResponse({
    status: 200,
    description: 'Saved search updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Saved search not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body() updateSavedSearchDto: UpdateSavedSearchDto,
    @CurrentUser() user: any,
  ) {
    return this.savedSearchesService.update(id, user.id, updateSavedSearchDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved search' })
  @ApiResponse({
    status: 200,
    description: 'Saved search deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Saved search not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.savedSearchesService.remove(id, user.id);
  }
}
