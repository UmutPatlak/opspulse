import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskWithAssignedUser } from './interfaces/task.interface';
import { PaginatedResult } from '../audit-logs/interfaces/audit-log.interface';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  UserRole,
  type AuthenticatedUser,
} from '../auth';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Create a new task. Allowed roles: TENANT_ADMIN, DISPATCHER.
   */
  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.DISPATCHER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskWithAssignedUser> {
    return this.tasksService.create(currentUser.tenantId, currentUser, dto);
  }

  /**
   * List paginated and filtered tasks.
   * OPERATOR role is strictly restricted to assigned tasks.
   */
  @Get()
  async findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedResult<TaskWithAssignedUser>> {
    return this.tasksService.findAll(currentUser.tenantId, currentUser, query);
  }

  /**
   * Retrieve a single task by ID.
   */
  @Get(':id')
  async findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskWithAssignedUser> {
    return this.tasksService.findOne(currentUser.tenantId, currentUser, id);
  }

  /**
   * Update task details. Allowed roles: TENANT_ADMIN, DISPATCHER.
   */
  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.DISPATCHER)
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskWithAssignedUser> {
    return this.tasksService.update(currentUser.tenantId, currentUser, id, dto);
  }

  /**
   * Update task status. Accessible by all authenticated roles;
   * OPERATOR specific transitions are verified in service.
   */
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<TaskWithAssignedUser> {
    return this.tasksService.updateStatus(currentUser.tenantId, currentUser, id, dto);
  }

  /**
   * Delete task. Allowed roles: TENANT_ADMIN.
   */
  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  async remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string; id: string }> {
    return this.tasksService.remove(currentUser.tenantId, currentUser, id);
  }
}
