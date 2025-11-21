import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from '../services';
import { SearchDto, SearchSuggestionsDto } from '../dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
@Public()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['articles', 'students', 'tags'] })
  @ApiQuery({ name: 'universityId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(@Query() dto: SearchDto) {
    return this.searchService.search(dto);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Search suggestions' })
  @ApiQuery({ name: 'q', required: true })
  getSuggestions(@Query() dto: SearchSuggestionsDto) {
    return this.searchService.getSuggestions(dto);
  }
}
