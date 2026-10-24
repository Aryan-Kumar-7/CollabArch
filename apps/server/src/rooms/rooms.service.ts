import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomManagerService } from '../gateway/room-manager.service';
import { randomUUID } from 'crypto';

export interface CreateRoomDto {
  title: string;
  slug?: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  description?: string;
  template?: string;
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roomManager: RoomManagerService
  ) {}

  /**
   * Returns all CanvasRoom records with owner details and updated timestamps.
   */
  async getAllRooms(userId?: string) {
    const rooms = await this.prisma.canvasRoom.findMany({
      where: userId ? { ownerId: userId } : undefined,
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
      room = await this.prisma.canvasRoom.create({
        data: {
          title: rawTitle,
          slug,
          ownerId,
          description: data.description || null,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });
      this.logger.log(`[RoomsService] Created new room in PostgreSQL: "${room.title}" (${room.slug})`);
    }

    // Initialize in-memory Yjs session
    this.roomManager.getOrCreateRoom(room.slug, room.title);

    return {
      id: room.id,
      slug: room.slug,
      title: room.title,
      description: room.description,
      visibility: room.visibility,
      ownerId: room.ownerId,
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

    const session = this.roomManager.getOrCreateRoom(slug, room.title);

    return {
      id: room.id,
      slug: room.slug,
      title: room.title,
      description: room.description,
      visibility: room.visibility,
      ownerId: room.ownerId,
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
   * Deletes a room from PostgreSQL.
   */
  async deleteRoom(slug: string, userId?: string) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug },
    });

    if (!room) {
      throw new NotFoundException(`Room with slug "${slug}" not found`);
    }

    await this.prisma.canvasRoom.delete({
      where: { slug },
    });

    this.logger.log(`[RoomsService] Deleted room "${slug}" from PostgreSQL`);
    return { success: true, deletedSlug: slug };
  }
}
