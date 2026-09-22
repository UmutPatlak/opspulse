import { type DrizzleClient } from '../../../database/database.constants';

export type DatabaseExecutor = DrizzleClient;

export interface CreateAuditLogInput {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any> | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
