import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER, type DrizzleDB } from '../../database/database.constants';
import { users, tenants, type User, type Tenant } from '../../database/schema';

export interface UserWithTenant extends Omit<User, 'passwordHash'> {
  tenant: Pick<Tenant, 'id' | 'name' | 'slug' | 'status'>;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: DrizzleDB,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    return user ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  }

  async findByIdWithTenant(id: string): Promise<UserWithTenant | null> {
    const [result] = await this.db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        tenant: {
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          status: tenants.status,
        },
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.id, id))
      .limit(1);

    return result ?? null;
  }

  async findByTenant(tenantId: string): Promise<Omit<User, 'passwordHash'>[]> {
    return this.db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));
  }
}
