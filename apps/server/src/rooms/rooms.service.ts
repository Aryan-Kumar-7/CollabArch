import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomManagerService } from '../gateway/room-manager.service';
import { randomUUID } from 'crypto';
import { createClerkClient } from '@clerk/backend';

import { ActivityService } from '../activity/activity.service';

export interface CreateRoomDto {
  title: string;
  slug?: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  description?: string;
  template?: string;
  workspaceId?: string;
  visibility?: 'PUBLIC_LINK' | 'WORKSPACE' | 'PRIVATE';
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roomManager: RoomManagerService,
    private readonly activityService: ActivityService
  ) {}

  /**
   * Syncs Workspace metadata and WorkspaceMember records from Clerk into PostgreSQL
   */
  async syncWorkspaceAndMembers(workspaceId: string, currentUserId?: string) {
    if (!workspaceId) return;

    try {
      const secretKey =
        process.env.CLERK_SECRET_KEY || 'sk_test_1OOaEIDnIHxhRluKj9r1EBnOVmmiC8fcwyZenhpm2y';
      const clerk = createClerkClient({ secretKey });

      // 1. Fetch organization details from Clerk
      let orgName = 'Team Workspace';
      let orgSlug = `ws-${workspaceId.slice(0, 8)}`;
      try {
        const org = await clerk.organizations.getOrganization({ organizationId: workspaceId });
        if (org) {
          orgName = org.name;
          orgSlug = org.slug || orgSlug;
        }
      } catch {}

      // 2. Upsert Workspace in database
      await this.prisma.workspace.upsert({
        where: { id: workspaceId },
        update: {
          name: orgName,
          slug: orgSlug,
          clerkOrgId: workspaceId,
        },
        create: {
          id: workspaceId,
          name: orgName,
          slug: orgSlug,
          clerkOrgId: workspaceId,
        },
      });

      // 3. Fetch members from Clerk and upsert User and WorkspaceMember
      try {
        const members = await clerk.organizations.getOrganizationMembershipList({
          organizationId: workspaceId,
        });

        for (const m of members.data) {
          const u = m.publicUserData;
          if (!u || !u.userId) continue;

          const userName =
            [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
            u.identifier ||
            'Architect';

          await this.prisma.user.upsert({
            where: { id: u.userId },
            update: {
              name: userName,
              email: u.identifier || `${u.userId}@collabarch.internal`,
              avatarUrl: u.imageUrl || null,
            },
            create: {
              id: u.userId,
              name: userName,
              email: u.identifier || `${u.userId}@collabarch.internal`,
              avatarUrl: u.imageUrl || null,
            },
          });

          await this.prisma.workspaceMember.upsert({
            where: {
              userId_workspaceId: {
                userId: u.userId,
                workspaceId,
              },
            },
            update: {
              role: m.role?.includes('admin') ? 'ADMIN' : 'MEMBER',
            },
            create: {
              userId: u.userId,
              workspaceId,
              role: m.role?.includes('admin') ? 'ADMIN' : 'MEMBER',
            },
          });
        }
      } catch (err: any) {
        // Fallback for current user if list fetch fails
        if (currentUserId) {
          await this.prisma.workspaceMember.upsert({
            where: {
              userId_workspaceId: {
                userId: currentUserId,
                workspaceId,
              },
            },
            update: { role: 'ADMIN' },
            create: {
              userId: currentUserId,
              workspaceId,
              role: 'ADMIN',
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `[RoomsService] Failed to sync workspace ${workspaceId} from Clerk: ${err?.message || err}`
      );
    }
  }

  /**
   * Returns all CanvasRoom records with owner details and updated timestamps.
   */
  async getAllRooms(userId?: string, workspaceId?: string) {
    const where: any = {};
    if (workspaceId) {
      where.workspaceId = workspaceId;
      // Proactively sync workspace & members in background
      this.syncWorkspaceAndMembers(workspaceId, userId).catch(() => {});
    } else if (userId) {
      where.ownerId = userId;
    }

    const rooms = await this.prisma.canvasRoom.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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

    return rooms.map((room) => {
      // Calculate live node/edge count if room is currently active in memory
      const activeSession = this.roomManager.getRoom(room.slug);
      let nodeCount = 0;
      let edgeCount = 0;
      if (activeSession) {
        nodeCount = activeSession.doc.getMap('nodes').size;
        edgeCount = activeSession.doc.getMap('edges').size;
      }

      return {
        id: room.id,
        slug: room.slug,
        title: room.title,
        description: room.description,
        visibility: room.visibility,
        ownerId: room.ownerId,
        workspaceId: room.workspaceId,
        ownerName: room.owner?.name || 'Architect',
        ownerEmail: room.owner?.email,
        ownerAvatarUrl: room.owner?.avatarUrl,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
        nodeCount,
        edgeCount,
      };
    });
  }

  /**
   * Creates a new CanvasRoom in PostgreSQL and prepares in-memory Y.Doc.
   */
  async createRoom(data: CreateRoomDto) {
    const rawTitle = data.title?.trim() || 'Untitled Architecture Canvas';
    let slug = data.slug?.trim();

    if (!slug) {
      const sanitized = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSuffix = randomUUID().slice(0, 6);
      slug = sanitized ? `${sanitized}-${uniqueSuffix}` : `arch-${uniqueSuffix}`;
    }

    // Ensure owner user exists in database before foreign key assignment
    const ownerId = data.ownerId || 'user_guest_default';
    const ownerEmail = data.ownerEmail || `${ownerId}@collabarch.internal`;
    const ownerName = data.ownerName || 'CollabArch Architect';
    const ownerAvatarUrl = data.ownerAvatarUrl || null;

    await this.prisma.user.upsert({
      where: { id: ownerId },
      update: {
        name: ownerName,
        avatarUrl: ownerAvatarUrl,
      },
      create: {
        id: ownerId,
        email: ownerEmail,
        name: ownerName,
        avatarUrl: ownerAvatarUrl,
      },
    });

    // Check if room with this slug already exists
    let room = await this.prisma.canvasRoom.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!room) {
      if (data.workspaceId) {
        await this.syncWorkspaceAndMembers(data.workspaceId, ownerId);
      }

      room = await this.prisma.canvasRoom.create({
        data: {
          title: rawTitle,
          slug,
          ownerId,
          workspaceId: data.workspaceId || null,
          visibility: (data.visibility as any) || undefined,
          description: data.description || null,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });
      this.logger.log(`[RoomsService] Created new room in PostgreSQL: "${room.title}" (${room.slug})`);

      await this.activityService.log({
        workspaceId: room.workspaceId,
        roomId: room.id,
        userId: ownerId,
        action: 'ROOM_CREATED',
        details: { title: room.title, slug: room.slug, visibility: room.visibility },
      });
    }

    // Initialize in-memory Yjs session
    await this.roomManager.getOrCreateRoom(room.slug, room.title);

    return {
      id: room.id,
      slug: room.slug,
      title: room.title,
      description: room.description,
      visibility: room.visibility,
      ownerId: room.ownerId,
      workspaceId: room.workspaceId,
      ownerName: room.owner?.name || ownerName,
      ownerEmail: room.owner?.email || ownerEmail,
      ownerAvatarUrl: room.owner?.avatarUrl || ownerAvatarUrl,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      nodeCount: 0,
      edgeCount: 0,
    };
  }

  /**
   * Fetches room by unique slug.
   */
  async getRoomBySlug(slug: string) {
    let room = await this.prisma.canvasRoom.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Auto-upsert room record if dynamically joined by slug
    if (!room) {
      const defaultOwnerId = 'user_guest_default';
      await this.prisma.user.upsert({
        where: { id: defaultOwnerId },
        update: {},
        create: {
          id: defaultOwnerId,
          email: `${defaultOwnerId}@collabarch.internal`,
          name: 'CollabArch Architect',
        },
      });

      const title = slug.startsWith('arch-')
        ? `Studio ${slug.replace('arch-', '')}`
        : `Studio ${slug}`;

      room = await this.prisma.canvasRoom.create({
        data: {
          slug,
          title,
          ownerId: defaultOwnerId,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });
    }

    const session = await this.roomManager.getOrCreateRoom(slug, room.title);

    return {
      id: room.id,
      slug: room.slug,
      title: room.title,
      description: room.description,
      visibility: room.visibility,
      ownerId: room.ownerId,
      workspaceId: room.workspaceId,
      ownerName: room.owner?.name || 'Architect',
      ownerEmail: room.owner?.email,
      ownerAvatarUrl: room.owner?.avatarUrl,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      nodeCount: session.doc.getMap('nodes').size,
      edgeCount: session.doc.getMap('edges').size,
    };
  }

  /**
   * Updates room visibility permissions (PUBLIC_LINK, WORKSPACE, PRIVATE).
   * Verifies that caller is either the room owner or a workspace admin.
   */
  async updateVisibility(
    slug: string,
    visibility: 'PUBLIC_LINK' | 'WORKSPACE' | 'PRIVATE',
    userId: string
  ) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug },
    });

    if (!room) {
      throw new NotFoundException(`Room with slug "${slug}" not found`);
    }

    if (!userId) {
      throw new ForbiddenException('User authentication required to update room visibility');
    }

    // Check room ownership: only the owner or workspace admin can change visibility
    const isOwner = room.ownerId === userId;
    let isWorkspaceAdmin = false;

    if (!isOwner && room.workspaceId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: room.workspaceId,
          },
        },
      });
      isWorkspaceAdmin = member?.role === 'ADMIN';
    }

    if (!isOwner && !isWorkspaceAdmin) {
      throw new ForbiddenException(
        'Only the room owner or a workspace admin can modify visibility for this canvas.'
      );
    }

    const updatedRoom = await this.prisma.canvasRoom.update({
      where: { slug },
      data: { visibility: visibility as any },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    this.logger.log(
      `[RoomsService] Updated room "${slug}" visibility to ${visibility} by user ${userId}`
    );

    await this.activityService.log({
      workspaceId: updatedRoom.workspaceId,
      roomId: updatedRoom.id,
      userId,
      action: 'VISIBILITY_CHANGED',
      details: {
        previousVisibility: room.visibility,
        newVisibility: visibility,
      },
    });

    return {
      id: updatedRoom.id,
      slug: updatedRoom.slug,
      title: updatedRoom.title,
      description: updatedRoom.description,
      visibility: updatedRoom.visibility,
      ownerId: updatedRoom.ownerId,
      workspaceId: updatedRoom.workspaceId,
      ownerName: updatedRoom.owner?.name || 'Architect',
      ownerEmail: updatedRoom.owner?.email,
      ownerAvatarUrl: updatedRoom.owner?.avatarUrl,
      createdAt: updatedRoom.createdAt.toISOString(),
      updatedAt: updatedRoom.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a room from PostgreSQL.
   */
  async deleteRoom(slug: string, userId?: string) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug },
    });

    if (!room) {
      throw new NotFoundException(`Room with slug "${slug}" not found`);
    }

    await this.activityService.log({
      workspaceId: room.workspaceId,
      roomId: room.id,
      userId: userId || room.ownerId,
      action: 'ROOM_DELETED',
      details: { slug, title: room.title },
    });

    await this.prisma.canvasRoom.delete({
      where: { slug },
    });

    this.logger.log(`[RoomsService] Deleted room "${slug}" from PostgreSQL`);
    return { success: true, deletedSlug: slug };
  }
}
