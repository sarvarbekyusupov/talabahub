import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Global search across all entities',
    description: 'Search across discounts, jobs, events, brands, companies, and courses',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'developer' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async globalSearch(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.globalSearch(query, limit ? parseInt(limit as any) : 20);
  }

  @Get('discounts')
  @ApiOperation({
    summary: 'Search discounts',
    description: 'Full-text search for discounts with ranking',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'food' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async searchDiscounts(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchDiscounts({
      query,
      limit: limit ? parseInt(limit as any) : 20,
      offset: offset ? parseInt(offset as any) : 0,
    });
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'Search jobs',
    description: 'Full-text search for job postings',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'developer' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async searchJobs(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchJobs({
      query,
      limit: limit ? parseInt(limit as any) : 20,
      offset: offset ? parseInt(offset as any) : 0,
    });
  }

  @Get('events')
  @ApiOperation({
    summary: 'Search events',
    description: 'Full-text search for events',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'conference' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async searchEvents(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchEvents({
      query,
      limit: limit ? parseInt(limit as any) : 20,
      offset: offset ? parseInt(offset as any) : 0,
    });
  }

  @Get('brands')
  @ApiOperation({
    summary: 'Search brands',
    description: 'Full-text search for brands',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'technology' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async searchBrands(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchBrands({
      query,
      limit: limit ? parseInt(limit as any) : 20,
      offset: offset ? parseInt(offset as any) : 0,
    });
  }

  @Get('companies')
  @ApiOperation({
    summary: 'Search companies',
    description: 'Full-text search for companies',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'IT' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async searchCompanies(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchCompanies({
      query,
      limit: limit ? parseInt(limit as any) : 20,
      offset: offset ? parseInt(offset as any) : 0,
    });
  }

  @Get('courses')
  @ApiOperation({
    summary: 'Search courses',
    description: 'Full-text search for courses',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'programming' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async searchCourses(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchCourses({
      query,
      limit: limit ? parseInt(limit as any) : 20,
      offset: offset ? parseInt(offset as any) : 0,
    });
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get search suggestions',
    description: 'Get search suggestions based on query (autocomplete)',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query', example: 'dev' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  async getSearchSuggestions(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getSearchSuggestions(
      query,
      limit ? parseInt(limit as any) : 5,
    );
  }
}
