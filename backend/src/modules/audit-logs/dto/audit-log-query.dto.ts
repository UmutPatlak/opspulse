import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sayfa numarası tam sayı olmalıdır' })
  @Min(1, { message: 'Sayfa numarası en az 1 olmalıdır' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sayfa başına kayıt sayısı tam sayı olmalıdır' })
  @Min(1, { message: 'Sayfa başına kayıt en az 1 olmalıdır' })
  @Max(100, { message: 'Sayfa başına kayıt en fazla 100 olabilir' })
  limit: number = 20;

  @IsOptional()
  @IsString({ message: 'Aksiyon filtresi metin olmalıdır' })
  action?: string;

  @IsOptional()
  @IsString({ message: 'Varlık tipi filtresi metin olmalıdır' })
  entityType?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Varlık ID geçerli bir UUID olmalıdır' })
  entityId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Kullanıcı ID geçerli bir UUID olmalıdır' })
  userId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Başlangıç tarihi geçerli bir ISO-8601 tarihi olmalıdır' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Bitiş tarihi geçerli bir ISO-8601 tarihi olmalıdır' })
  endDate?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'Sıralama yönü asc veya desc olmalıdır' })
  sortOrder: 'asc' | 'desc' = 'desc';
}
