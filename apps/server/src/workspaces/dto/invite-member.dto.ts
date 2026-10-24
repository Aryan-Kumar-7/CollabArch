import { Role } from '@prisma/client';

export class InviteMemberDto {
  email!: string;
  role?: Role;
}
