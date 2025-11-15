import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../../audit/audit.service';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: AuditAction;
  entityType: string;
}

/**
 * Decorator to enable automatic audit logging for controller methods
 *
 * @param action - The audit action (CREATE, UPDATE, DELETE, etc.)
 * @param entityType - The type of entity being operated on
 *
 * @example
 * ```typescript
 * @Post()
 * @AuditLog(AuditAction.CREATE, 'Discount')
 * async create(@Body() dto: CreateDiscountDto) {
 *   return this.service.create(dto);
 * }
 * ```
 */
export const AuditLog = (action: AuditAction, entityType: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, entityType } as AuditLogMetadata);
