import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_PROVIDER, type DrizzleDB } from '../../database/database.constants';
import { auditLogs, users, type AuditLog } from '../../database/schema';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  type DatabaseExecutor,
  type CreateAuditLogInput,
  type PaginatedResult,
} from './interfaces/audit-log.interface';

export interface AuditLogWithUser extends AuditLog {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: DrizzleDB,
  ) {}

  /**
   * Helper method to insert audit log record inside a transaction or standalone.
   * Supports both logAction(tx, logData) and logAction(logData) signatures.
   */
  async logAction(
    txOrLogData: DatabaseExecutor | null | undefined | CreateAuditLogInput,
    maybeLogData?: CreateAuditLogInput,
  ): Promise<AuditLog> {
    let executor: DatabaseExecutor = this.db;
    let logData: CreateAuditLogInput;

    if (maybeLogData) {
      if (txOrLogData && typeof (txOrLogData as any).insert === 'function') {
        executor = txOrLogData as DatabaseExecutor;
      }
      logData = maybeLogData;
    } else {
      logData = txOrLogData as CreateAuditLogInput;
    }

    const [createdLog] = await executor
      .insert(auditLogs)
      .values({
        tenantId: logData.tenantId,
        userId: logData.userId ?? null,
        action: logData.action,
        entityType: logData.entityType,
        entityId: logData.entityId,
        changes: logData.changes ?? null,
      })
      .returning();

    return createdLog;
  }

  /**
   * List paginated audit logs scoped strictly to the specified tenantId.
   */
  async findAll(
    tenantId: string,
    query: AuditLogQueryDto,
  ): Promise<PaginatedResult<AuditLogWithUser>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const conditions: (SQL | undefined)[] = [eq(auditLogs.tenantId, tenantId)];

    if (query.action) {
      conditions.push(eq(auditLogs.action, query.action));
    }

    if (query.entityType) {
      conditions.push(eq(auditLogs.entityType, query.entityType));
    }

    if (query.entityId) {
      conditions.push(eq(auditLogs.entityId, query.entityId));
    }

    if (query.userId) {
      conditions.push(eq(auditLogs.userId, query.userId));
    }

    if (query.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(query.endDate)));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await this.db
      .select({ value: count() })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(countResult?.value ?? 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Order clause
    const orderByClause =
      query.sortOrder === 'asc' ? asc(auditLogs.createdAt) : desc(auditLogs.createdAt);

    // Fetch paginated rows with joined user details
    const rows = await this.db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        changes: auditLogs.changes,
        createdAt: auditLogs.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Format rows so that user is null if userId was null
    const data: AuditLogWithUser[] = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      changes: row.changes,
      createdAt: row.createdAt,
      user: row.userId && row.user?.id ? row.user : null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
