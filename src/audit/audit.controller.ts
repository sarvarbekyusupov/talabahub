import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService, AuditAction } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all audit logs (Admin only)',
    description: 'Retrieve all audit logs with pagination',
  })
  async getAllAuditLogs(@Query() pagination: PaginationDto) {
    return this.auditService.getAllAuditLogs(
      pagination.page,
      pagination.limit,
    );
  }

  @Get('entity')
  @ApiOperation({
    summary: 'Get audit logs for specific entity (Admin only)',
    description: 'Retrieve audit logs for a specific entity type and ID',
  })
  @ApiQuery({ name: 'entityType', required: true, example: 'User' })
  @ApiQuery({ name: 'entityId', required: true, example: 'clp123abc456' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  async getEntityAuditLog(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getEntityAuditLog(entityType, entityId, limit || 50);
  }

  @Get('user')
  @ApiOperation({
    summary: 'Get audit logs for specific user (Admin only)',
    description: 'Retrieve all actions performed by a specific user',
  })
  @ApiQuery({ name: 'userId', required: true, example: 'clp123abc456' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  async getUserAuditLog(
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getUserAuditLog(userId, limit || 50);
  }

  @Get('action')
  @ApiOperation({
    summary: 'Get audit logs by action type (Admin only)',
    description: 'Retrieve audit logs filtered by action type (CREATE, UPDATE, DELETE, etc.)',
  })
  @ApiQuery({
    name: 'action',
    required: true,
    enum: AuditAction,
    example: AuditAction.CREATE,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  async getAuditLogsByAction(
    @Query('action') action: AuditAction,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getAuditLogsByAction(action, limit || 50);
  }
}
