import { IsEnum, IsNotEmpty } from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

export class UpdateTaskStatusDto {
  @IsNotEmpty({ message: 'Görev durumu belirtilmelidir' })
  @IsEnum(TaskStatus, {
    message: 'Geçersiz görev durumu. Beklenen: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, FAILED',
  })
  status!: TaskStatus;
}
