import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole | string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  role: UserRole | string;
  tenantName?: string;
  tenantSlug?: string;
}
