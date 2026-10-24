import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (Role | 'ADMIN' | 'MEMBER' | 'VIEWER')[]) =>
  SetMetadata(ROLES_KEY, roles);
