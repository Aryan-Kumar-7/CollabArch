import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SyncUserData {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts the user into the PostgreSQL User table.
   * If it's a new user (or user has no workspaces), automatically provisions
   * a default "Personal Workspace" in Workspace and assigns them as ADMIN in WorkspaceMember.
   */
  async syncUser(data: SyncUserData) {
    if (!data.id) {
      throw new Error('User ID is required for synchronization');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.id },
      include: {
        memberships: true,
      },
    });

    const user = await this.prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl ?? null,
      },
      create: {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl ?? null,
      },
    });

    // Check if user has any existing workspace memberships
    const hasWorkspaces = existingUser && existingUser.memberships.length > 0;
    if (!hasWorkspaces) {
      const sanitizedName = data.name?.trim() || 'Personal';
      const rawSlug = `personal-${sanitizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || data.id.slice(0, 8)}`;

      let slug = rawSlug;
      const existingWorkspace = await this.prisma.workspace.findUnique({
        where: { slug },
      });

      if (existingWorkspace) {
        slug = `${rawSlug}-${data.id.slice(-6).toLowerCase()}`;
      }

      const defaultWorkspace = await this.prisma.workspace.create({
        data: {
          name: `${sanitizedName}'s Workspace`,
          slug,
          members: {
            create: {
              userId: data.id,
              role: 'ADMIN',
            },
          },
        },
      });

      this.logger.log(
        `[UsersService] Created default Personal Workspace "${defaultWorkspace.name}" (${defaultWorkspace.id}) for user ${data.id}`
      );
    }

    return this.getCurrentUser(data.id);
  }

  /**
   * Returns user profile, their owned rooms, and workspace memberships.
   */
  async getCurrentUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        ownedRooms: {
          orderBy: { updatedAt: 'desc' },
        },
        memberships: {
          include: {
            workspace: {
              include: {
                _count: {
                  select: { rooms: true, members: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }
}
