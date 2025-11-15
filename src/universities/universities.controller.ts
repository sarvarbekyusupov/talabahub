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
import { UniversitiesService } from './universities.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditLog } from '../common/decorators/audit.decorator';
import { AuditAction } from '../audit/audit.service';
import { UserRole } from '@prisma/client';

@ApiTags('Universities')
@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Post()
  @AuditLog(AuditAction.CREATE, 'University')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new university (Admin only)' })
  @ApiResponse({ status: 201, description: 'University created successfully' })
  create(@Body() createUniversityDto: CreateUniversityDto) {
    return this.universitiesService.create(createUniversityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all universities with pagination (Public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.universitiesService.findAll(page, limit, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get university by ID (Public)' })
  @ApiResponse({ status: 200, description: 'University found' })
  @ApiResponse({ status: 404, description: 'University not found' })
  findOne(@Param('id') id: string) {
    return this.universitiesService.findOne(+id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get university statistics (Public)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getUniversityStats(@Param('id') id: string) {
    return this.universitiesService.getUniversityStats(+id);
  }

  @Patch(':id')
  @AuditLog(AuditAction.UPDATE, 'University')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update university by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'University updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateUniversityDto: UpdateUniversityDto,
  ) {
    return this.universitiesService.update(+id, updateUniversityDto);
  }

  @Delete(':id')
  @AuditLog(AuditAction.DELETE, 'University')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete university by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'University deleted successfully' })
  remove(@Param('id') id: string) {
    return this.universitiesService.remove(+id);
  }
}
