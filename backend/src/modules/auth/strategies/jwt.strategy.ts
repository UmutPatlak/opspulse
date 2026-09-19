import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Geçersiz token yapısı');
    }

    const userWithTenant = await this.usersService.findByIdWithTenant(payload.sub);

    if (!userWithTenant) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya oturum geçersiz');
    }

    if (!userWithTenant.isActive) {
      throw new UnauthorizedException('Kullanıcı hesabı aktif değildir');
    }

    if (userWithTenant.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Bağlı olunan organizasyon/şirket hesabı aktif değildir');
    }

    return {
      id: userWithTenant.id,
      email: userWithTenant.email,
      fullName: userWithTenant.fullName,
      tenantId: userWithTenant.tenantId,
      role: userWithTenant.role,
      tenantName: userWithTenant.tenant.name,
      tenantSlug: userWithTenant.tenant.slug,
    };
  }
}
