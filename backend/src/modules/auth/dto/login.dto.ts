import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @IsString({ message: 'Şifre geçerli bir metin olmalıdır' })
  @IsNotEmpty({ message: 'Şifre zorunludur' })
  password!: string;
}
