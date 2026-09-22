import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, or, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_PROVIDER, type DrizzleDB } from '../../database/database.constants';
import { tasks, users, type Task } from '../../database/schema';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/enums/audit-action.enum';
import { UserRole } from '../auth/enums/user-role.enum';
import { type AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskPriority } from './enums/task-priority.enum';
import { TaskStatus } from './enums/task-status.enum';
import { TaskWithAssignedUser } from './interfaces/task.interface';
import { PaginatedResult } from '../audit-logs/interfaces/audit-log.interface';

@Injectable()
export class TasksService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: DrizzleDB,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Creates a new task and logs CREATE_TASK action within an atomic transaction.
   */
  async create(
    tenantId: string,
    currentUser: AuthenticatedUser,
    dto: CreateTaskDto,
  ): Promise<TaskWithAssignedUser> {
    // If assignedUserId is specified, verify user belongs to the same tenant
    if (dto.assignedUserId) {
      const [assignedUser] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, dto.assignedUserId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!assignedUser) {
        throw new BadRequestException('Atanan kullanıcı bu şirkete ait değil veya bulunamadı');
      }
    }

    const priority = dto.priority ?? TaskPriority.MEDIUM;
    const initialStatus = dto.assignedUserId ? TaskStatus.ASSIGNED : TaskStatus.PENDING;
    const parsedDueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    return await this.db.transaction(async (tx) => {
      const [createdTask] = await tx
        .insert(tasks)
        .values({
          tenantId,
          assignedUserId: dto.assignedUserId ?? null,
          title: dto.title.trim(),
          description: dto.description ? dto.description.trim() : null,
          priority,
          status: initialStatus,
          dueDate: parsedDueDate,
          metadata: dto.metadata ?? null,
        })
        .returning();

      // Audit Log within the same transaction
      await this.auditLogsService.logAction(tx, {
        tenantId,
        userId: currentUser.id,
        action: AuditAction.CREATE_TASK,
        entityType: 'TASK',
        entityId: createdTask.id,
        changes: {
          created: {
            title: createdTask.title,
            priority: createdTask.priority,
            status: createdTask.status,
            assignedUserId: createdTask.assignedUserId,
            dueDate: createdTask.dueDate,
          },
        },
      });

      // Retrieve with assigned user information
      return await this.getTaskWithAssignedUser(createdTask.id, tenantId, tx);
    });
  }

  /**
   * Retrieves paginated tasks filtered by tenant and RBAC permissions.
   * If currentUser is OPERATOR, forces assignedUserId = currentUser.id.
   */
  async findAll(
    tenantId: string,
    currentUser: AuthenticatedUser,
    query: TaskQueryDto,
  ): Promise<PaginatedResult<TaskWithAssignedUser>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const conditions: (SQL | undefined)[] = [eq(tasks.tenantId, tenantId)];

    // RBAC Isolation: OPERATOR can only view assigned tasks
    if (currentUser.role === UserRole.OPERATOR) {
      conditions.push(eq(tasks.assignedUserId, currentUser.id));
    } else if (query.assignedUserId) {
      conditions.push(eq(tasks.assignedUserId, query.assignedUserId));
    }

    if (query.status) {
      conditions.push(eq(tasks.status, query.status));
    }

    if (query.priority) {
      conditions.push(eq(tasks.priority, query.priority));
    }

    if (query.search && query.search.trim() !== '') {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(ilike(tasks.title, searchTerm), ilike(tasks.description, searchTerm)),
      );
    }

    const whereClause = and(...conditions);

    // Total count calculation
    const [countResult] = await this.db
      .select({ value: count() })
      .from(tasks)
      .where(whereClause);

    const total = Number(countResult?.value ?? 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Determine sort column
    let sortColumn: any = tasks.createdAt;
    if (query.sortBy === 'dueDate') sortColumn = tasks.dueDate;
    else if (query.sortBy === 'priority') sortColumn = tasks.priority;
    else if (query.sortBy === 'status') sortColumn = tasks.status;
    else if (query.sortBy === 'title') sortColumn = tasks.title;

    const orderByClause = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Execute paginated query with left join to users
    const rows = await this.db
      .select({
        task: tasks,
        assignedUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedUserId, users.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const data: TaskWithAssignedUser[] = rows.map((row) => ({
      ...row.task,
      assignedUser: row.task.assignedUserId && row.assignedUser?.id ? row.assignedUser : null,
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

  /**
   * Retrieves a single task ensuring strict tenant isolation and operator assignment check.
   */
  async findOne(
    tenantId: string,
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<TaskWithAssignedUser> {
    const task = await this.getTaskWithAssignedUser(id, tenantId);

    if (!task) {
      throw new NotFoundException('Görev bulunamadı');
    }

    // If operator, ensure they are assigned to this task; prevent information leakage
    if (currentUser.role === UserRole.OPERATOR && task.assignedUserId !== currentUser.id) {
      throw new NotFoundException('Görev bulunamadı');
    }

    return task;
  }

  /**
   * Updates task details and writes diff to audit_logs atomically.
   */
  async update(
    tenantId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskWithAssignedUser> {
    const existingTask = await this.findOne(tenantId, currentUser, id);

    // Verify new assigned user if specified
    if (dto.assignedUserId !== undefined && dto.assignedUserId !== null) {
      if (dto.assignedUserId !== existingTask.assignedUserId) {
        const [assignedUser] = await this.db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, dto.assignedUserId), eq(users.tenantId, tenantId)))
          .limit(1);

        if (!assignedUser) {
          throw new BadRequestException('Atanan kullanıcı bu şirkete ait değil veya bulunamadı');
        }
      }
    }

    // Build changes diff for audit logging
    const changes: Record<string, { from: any; to: any }> = {};
    const updateData: Partial<typeof tasks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.title !== undefined && dto.title.trim() !== existingTask.title) {
      changes.title = { from: existingTask.title, to: dto.title.trim() };
      updateData.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      const newDesc = dto.description ? dto.description.trim() : null;
      if (newDesc !== existingTask.description) {
        changes.description = { from: existingTask.description, to: newDesc };
        updateData.description = newDesc;
      }
    }

    if (dto.priority !== undefined && dto.priority !== existingTask.priority) {
      changes.priority = { from: existingTask.priority, to: dto.priority };
      updateData.priority = dto.priority;
    }

    if (dto.assignedUserId !== undefined && dto.assignedUserId !== existingTask.assignedUserId) {
      changes.assignedUserId = { from: existingTask.assignedUserId, to: dto.assignedUserId };
      updateData.assignedUserId = dto.assignedUserId;
      // If task was pending and is now assigned, update status to ASSIGNED
      if (dto.assignedUserId && existingTask.status === TaskStatus.PENDING) {
        changes.status = { from: existingTask.status, to: TaskStatus.ASSIGNED };
        updateData.status = TaskStatus.ASSIGNED;
      }
    }

    if (dto.dueDate !== undefined) {
      const newDueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      const oldTime = existingTask.dueDate ? new Date(existingTask.dueDate).getTime() : null;
      const newTime = newDueDate ? newDueDate.getTime() : null;
      if (oldTime !== newTime) {
        changes.dueDate = { from: existingTask.dueDate, to: newDueDate };
        updateData.dueDate = newDueDate;
      }
    }

    if (dto.metadata !== undefined) {
      changes.metadata = { from: existingTask.metadata, to: dto.metadata };
      updateData.metadata = dto.metadata;
    }

    // If nothing changed, return existing
    if (Object.keys(changes).length === 0) {
      return existingTask;
    }

    return await this.db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set(updateData)
        .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)));

      await this.auditLogsService.logAction(tx, {
        tenantId,
        userId: currentUser.id,
        action: AuditAction.UPDATE_TASK,
        entityType: 'TASK',
        entityId: id,
        changes,
      });

      return await this.getTaskWithAssignedUser(id, tenantId, tx);
    });
  }

  /**
   * Updates task status, enforcing Operator specific transition rules and writing UPDATE_TASK_STATUS audit log.
   */
  async updateStatus(
    tenantId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateTaskStatusDto,
  ): Promise<TaskWithAssignedUser> {
    const existingTask = await this.findOne(tenantId, currentUser, id);

    // Operator specific business logic:
    if (currentUser.role === UserRole.OPERATOR) {
      if (existingTask.assignedUserId !== currentUser.id) {
        throw new NotFoundException('Görev bulunamadı');
      }

      const allowedOperatorStatuses: TaskStatus[] = [
        TaskStatus.IN_PROGRESS,
        TaskStatus.COMPLETED,
        TaskStatus.FAILED,
      ];

      if (!allowedOperatorStatuses.includes(dto.status)) {
        throw new ForbiddenException(
          'Operatörler yalnızca IN_PROGRESS, COMPLETED veya FAILED durumlarına geçiş yapabilir',
        );
      }
    }

    // If same status, no-op
    if (existingTask.status === dto.status) {
      return existingTask;
    }

    return await this.db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({
          status: dto.status,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)));

      await this.auditLogsService.logAction(tx, {
        tenantId,
        userId: currentUser.id,
        action: AuditAction.UPDATE_TASK_STATUS,
        entityType: 'TASK',
        entityId: id,
        changes: {
          status: {
            from: existingTask.status,
            to: dto.status,
          },
        },
      });

      return await this.getTaskWithAssignedUser(id, tenantId, tx);
    });
  }

  /**
   * Deletes a task and writes DELETE_TASK audit log inside an atomic transaction.
   */
  async remove(
    tenantId: string,
    currentUser: AuthenticatedUser,
    id: string,
  ): Promise<{ success: boolean; message: string; id: string }> {
    const existingTask = await this.findOne(tenantId, currentUser, id);

    return await this.db.transaction(async (tx) => {
      await tx
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)));

      await this.auditLogsService.logAction(tx, {
        tenantId,
        userId: currentUser.id,
        action: AuditAction.DELETE_TASK,
        entityType: 'TASK',
        entityId: id,
        changes: {
          deleted: {
            id: existingTask.id,
            title: existingTask.title,
            status: existingTask.status,
            priority: existingTask.priority,
            assignedUserId: existingTask.assignedUserId,
          },
        },
      });

      return {
        success: true,
        message: 'Görev başarıyla silindi',
        id,
      };
    });
  }

  /**
   * Helper to retrieve single task joined with assigned user information.
   */
  private async getTaskWithAssignedUser(
    taskId: string,
    tenantId: string,
    executor?: any,
  ): Promise<TaskWithAssignedUser> {
    const dbClient = executor ?? this.db;

    const [row] = await dbClient
      .select({
        task: tasks,
        assignedUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedUserId, users.id))
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Görev bulunamadı');
    }

    return {
      ...row.task,
      assignedUser: row.task.assignedUserId && row.assignedUser?.id ? row.assignedUser : null,
    };
  }
}
