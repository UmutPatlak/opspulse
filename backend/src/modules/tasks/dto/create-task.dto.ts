import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskPriority } from '../enums/task-priority.enum';

export class CreateTaskDto {
  @IsString({ message: 'Görev başlığı geçerli bir metin olmalıdır' })
  @IsNotEmpty({ message: 'Görev başlığı boş bırakılamaz' })
  @MaxLength(255, { message: 'Görev başlığı en fazla 255 karakter olabilir' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsString({ message: 'Görev açıklaması geçerli bir metin olmalıdır' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority, {
    message: 'Öncelik değeri LOW, MEDIUM, HIGH veya CRITICAL olmalıdır',
  })
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @IsOptional()
  @IsUUID('4', { message: 'Atanan kullanıcı kimliği geçerli bir UUID v4 olmalıdır' })
  assignedUserId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Bitiş tarihi geçerli bir ISO-8601 tarih formatında olmalıdır' })
  dueDate?: string;

  @IsOptional()
  @IsObject({ message: 'Metadata geçerli bir JSON nesnesi olmalıdır' })
  metadata?: Record<string, any>;
}
