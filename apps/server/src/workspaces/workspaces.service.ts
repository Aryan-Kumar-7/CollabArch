import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService
  ) {}

  /**
   * Returns all workspaces where the user is a member or owner.
   */
  async getUserWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            rooms: true,
            members: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Creates a new workspace and links the creator as ADMIN in WorkspaceMember.
   */
  async createWorkspace(userId: string, data: CreateWorkspaceDto) {
    if (!data.name?.trim()) {
      throw new Error('Workspace name is required');
    }

    const rawSlug =
      data.slug?.trim() ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    let slug = rawSlug || `ws-${randomUUID().slice(0, 8)}`;

    const existing = await this.prisma.workspace.findUnique({
      where: { slug },
    });
    if (existing) {
      slug = `${slug}-${randomUUID().slice(0, 6)}`;
    }

    // Ensure the creator User record exists
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@collabarch.internal`,
        name: 'Workspace Creator',
      },
    });

    const workspace = await this.prisma.workspace.create({
      data: {
        name: data.name.trim(),
        slug,
        clerkOrgId: data.clerkOrgId || null,
        members: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            rooms: true,
            members: true,
          },
        },
      },
    });

    this.logger.log(
      `[WorkspacesService] Created workspace "${workspace.name}" (${workspace.id}) by user ${userId}`
    );

    await this.activityService.log({
      workspaceId: workspace.id,
      userId,
      action: 'WORKSPACE_CREATED',
      details: { name: workspace.name, slug: workspace.slug },
    });

    return workspace;
  }

  /**
   * Returns all architecture canvases belonging to that workspace.
   */
  async getWorkspaceRooms(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    // Verify user membership in workspace
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return this.prisma.canvasRoom.findMany({
      where: { workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Invites/adds a member to the workspace.
   */
  async addMember(workspaceId: string, email: string, role: Role = 'MEMBER') {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    // Lookup user by email or provision an invited user record
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const generatedId = `user_invited_${randomUUID().slice(0, 12)}`;
      user = await this.prisma.user.create({
        data: {
          id: generatedId,
          email,
          name: email.split('@')[0],
        },
      });
      this.logger.log(
        `[WorkspacesService] Provisioned invited user "${email}" (${user.id})`
      );
    }

    const membership = await this.prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
      update: {
        role,
      },
      create: {
        userId: user.id,
        workspaceId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        workspace: true,
      },
    });

    this.logger.log(
      `[WorkspacesService] Added/updated member ${user.email} as ${role} in workspace ${workspaceId}`
    );

    await this.activityService.log({
      workspaceId,
      userId: user.id,
      action: 'MEMBER_INVITED',
      details: { email: user.email, role },
    });

    return membership;
  }
}
