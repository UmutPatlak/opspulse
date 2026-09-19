import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER, type DrizzleDB } from '../../database/database.constants';
import { tenants, users } from '../../database/schema';
import { UsersService, UserWithTenant } from '../users/users.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from './enums/user-role.enum';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    tenantId: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: DrizzleDB,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedSlug = dto.tenantSlug.toLowerCase().trim();

    // 1. Check if email already registered
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut');
    }

    // 2. Check if tenant slug is already taken
    const [existingTenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, normalizedSlug))
      .limit(1);

    if (existingTenant) {
      throw new ConflictException('Bu şirket kısa adı (slug) zaten kullanılmaktadır');
    }

    // 3. Hash the password with bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 4. Atomic transaction: create tenant and initial TENANT_ADMIN user
    const { createdTenant, createdUser } = await this.db.transaction(async (tx) => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({
          name: dto.tenantName.trim(),
          slug: normalizedSlug,
          status: 'ACTIVE',
        })
        .returning();

      const [newUser] = await tx
        .insert(users)
        .values({
          tenantId: newTenant.id,
          email: normalizedEmail,
          passwordHash,
          fullName: dto.fullName.trim(),
          role: UserRole.TENANT_ADMIN,
          isActive: true,
        })
        .returning();

      return { createdTenant: newTenant, createdUser: newUser };
    });

    // 5. Generate JWT token
    const payload: JwtPayload = {
      sub: createdUser.id,
      email: createdUser.email,
      tenantId: createdTenant.id,
      role: createdUser.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        fullName: createdUser.fullName,
        role: createdUser.role,
        tenantId: createdUser.tenantId,
      },
      tenant: {
        id: createdTenant.id,
        name: createdTenant.name,
        slug: createdTenant.slug,
        status: createdTenant.status,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Look up user by email
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    // 3. Check user active status
    if (!user.isActive) {
      throw new UnauthorizedException('Kullanıcı hesabı dondurulmuş veya aktif değil');
    }

    // 4. Check tenant active status
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Bağlı olunan organizasyon/şirket hesabı aktif durumda değil');
    }

    // 5. Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
      },
    };
  }

  async getMe(userId: string): Promise<UserWithTenant> {
    const userWithTenant = await this.usersService.findByIdWithTenant(userId);
    if (!userWithTenant) {
      throw new NotFoundException('Kullanıcı profili bulunamadı');
    }

    return userWithTenant;
  }
}
