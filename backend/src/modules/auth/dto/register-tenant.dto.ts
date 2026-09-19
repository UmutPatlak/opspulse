import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterTenantDto {
  @IsString({ message: 'Şirket adı geçerli bir metin olmalıdır' })
  @IsNotEmpty({ message: 'Şirket adı zorunludur' })
  @MinLength(2, { message: 'Şirket adı en az 2 karakter olmalıdır' })
  @MaxLength(255, { message: 'Şirket adı en fazla 255 karakter olabilir' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  tenantName!: string;

  @IsString({ message: 'Şirket slug değeri geçerli bir metin olmalıdır' })
  @IsNotEmpty({ message: 'Şirket slug zorunludur' })
  @MinLength(2, { message: 'Şirket slug en az 2 karakter olmalıdır' })
  @MaxLength(100, { message: 'Şirket slug en fazla 100 karakter olabilir' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug yalnızca küçük harf, rakam ve tire (-) içerebilir (Örn: acme-logistics)',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  tenantSlug!: string;

  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @IsString({ message: 'Şifre geçerli bir metin olmalıdır' })
  @MinLength(8, { message: 'Şifre en az 8 karakter uzunluğunda olmalıdır' })
  @MaxLength(64, { message: 'Şifre en fazla 64 karakter olabilir' })
  password!: string;

  @IsString({ message: 'Ad soyad geçerli bir metin olmalıdır' })
  @IsNotEmpty({ message: 'Yönetici ad soyad zorunludur' })
  @MinLength(2, { message: 'Ad soyad en az 2 karakter olmalıdır' })
  @MaxLength(255, { message: 'Ad soyad en fazla 255 karakter olabilir' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  fullName!: string;
}
