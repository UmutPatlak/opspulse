import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class TaskQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sayfa numarası tam sayı olmalıdır' })
  @Min(1, { message: 'Sayfa numarası en az 1 olmalıdır' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sayfa başına kayıt sayısı tam sayı olmalıdır' })
  @Min(1, { message: 'Sayfa başına kayıt sayısı en az 1 olmalıdır' })
  @Max(100, { message: 'Sayfa başına kayıt sayısı en fazla 100 olabilir' })
  limit: number = 20;

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Filtrelenecek durum geçerli bir TaskStatus olmalıdır' })
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Filtrelenecek öncelik geçerli bir TaskPriority olmalıdır' })
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID('4', { message: 'Atanan kullanıcı kimliği geçerli bir UUID olmalıdır' })
  assignedUserId?: string;

  @IsOptional()
  @IsString({ message: 'Arama terimi metin olmalıdır' })
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'dueDate', 'priority', 'status', 'title'], {
    message: 'Sıralama alanı createdAt, dueDate, priority, status veya title olmalıdır',
  })
  sortBy: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'Sıralama yönü asc veya desc olmalıdır' })
  sortOrder: 'asc' | 'desc' = 'desc';
}
