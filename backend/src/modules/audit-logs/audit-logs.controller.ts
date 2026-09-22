import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService, AuditLogWithUser } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole, type AuthenticatedUser } from '../auth';
import { PaginatedResult } from './interfaces/audit-log.interface';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  async findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedResult<AuditLogWithUser>> {
    return this.auditLogsService.findAll(currentUser.tenantId, query);
  }
}
