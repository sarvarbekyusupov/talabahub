import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  READ = 'READ',
}

export interface AuditLogData {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: any;
  metadata?: any;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(data: AuditLogData) {
    try {
      return await this.prisma.$executeRawUnsafe(`
        INSERT INTO audit_logs (
          id, action, entity_type, entity_id, user_id, user_email, user_role,
          ip_address, user_agent, changes, metadata, created_at
        ) VALUES (
          gen_random_uuid()::text,
          '${data.action}'::audit_action,
          '${data.entityType}',
          ${data.entityId ? `'${data.entityId}'` : 'NULL'},
          ${data.userId ? `'${data.userId}'` : 'NULL'},
          ${data.userEmail ? `'${data.userEmail}'` : 'NULL'},
          ${data.userRole ? `'${data.userRole}'` : 'NULL'},
          ${data.ipAddress ? `'${data.ipAddress}'` : 'NULL'},
          ${data.userAgent ? `'${data.userAgent}'` : 'NULL'},
          ${data.changes ? `'${JSON.stringify(data.changes)}'::jsonb` : 'NULL'},
          ${data.metadata ? `'${JSON.stringify(data.metadata)}'::jsonb` : 'NULL'},
          CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      // Don't throw error to prevent audit logging from breaking the main flow
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, email: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: userId,
      userId,
      userEmail: email,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId: string, email: string, ipAddress?: string) {
    return this.log({
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: userId,
      userId,
      userEmail: email,
      ipAddress,
    });
  }

  /**
   * Log entity creation
   */
  async logCreate(
    entityType: string,
    entityId: string,
    data: any,
    userId?: string,
    userEmail?: string,
  ) {
    return this.log({
      action: AuditAction.CREATE,
      entityType,
      entityId,
      userId,
      userEmail,
      changes: { created: data },
    });
  }

  /**
   * Log entity update
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    oldData: any,
    newData: any,
    userId?: string,
    userEmail?: string,
  ) {
    const changes = this.getChanges(oldData, newData);

    return this.log({
      action: AuditAction.UPDATE,
      entityType,
      entityId,
      userId,
      userEmail,
      changes,
    });
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: string,
    entityId: string,
    data: any,
    userId?: string,
    userEmail?: string,
  ) {
    return this.log({
      action: AuditAction.DELETE,
      entityType,
      entityId,
      userId,
      userEmail,
      changes: { deleted: data },
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditLog(entityType: string, entityId: string, limit = 50) {
    return this.prisma.$queryRawUnsafe(`
      SELECT * FROM audit_logs
      WHERE entity_type = '${entityType}' AND entity_id = '${entityId}'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLog(userId: string, limit = 50) {
    return this.prisma.$queryRawUnsafe(`
      SELECT * FROM audit_logs
      WHERE user_id = '${userId}'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
  }

  /**
   * Get audit logs by action
   */
  async getAuditLogsByAction(action: AuditAction, limit = 50) {
    return this.prisma.$queryRawUnsafe(`
      SELECT * FROM audit_logs
      WHERE action = '${action}'::audit_action
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
  }

  /**
   * Get all audit logs with pagination
   */
  async getAllAuditLogs(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const logs = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM audit_logs
    `);

    return {
      data: logs,
      meta: {
        total: parseInt(total[0]?.count || '0'),
        page,
        limit,
        totalPages: Math.ceil(parseInt(total[0]?.count || '0') / limit),
      },
    };
  }

  /**
   * Helper: Get changes between old and new data
   */
  private getChanges(oldData: any, newData: any): any {
    const changes: any = {
      before: {},
      after: {},
    };

    // Find changed fields
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes.before[key] = oldData[key];
        changes.after[key] = newData[key];
      }
    }

    return changes;
  }
}
