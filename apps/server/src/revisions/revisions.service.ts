import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomManagerService } from '../gateway/room-manager.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import { ActivityService } from '../activity/activity.service';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../gateway/binary.util';
import * as Y from 'yjs';

@Injectable()
export class RevisionsService {
  private readonly logger = new Logger(RevisionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roomManager: RoomManagerService,
    private readonly redisPubSub: RedisPubSubService,
    private readonly activityService: ActivityService
  ) {}

  /**
   * Captures an immutable binary snapshot of the canvas room state as a named revision
   */
  async createRevision(roomSlug: string, userId: string, dto: CreateRevisionDto) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug: roomSlug },
    });

    if (!room) {
      throw new NotFoundException(`Room "${roomSlug}" not found`);
    }

    // Ensure the creator User record exists
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@collabarch.internal`,
        name: 'Architect',
      },
    });

    let snapshotBuffer: Uint8Array;
    if (dto.documentBlob) {
      snapshotBuffer = base64ToUint8Array(dto.documentBlob);
    } else {
      const activeSession = this.roomManager.getRoom(roomSlug);
      if (activeSession) {
        snapshotBuffer = Y.encodeStateAsUpdate(activeSession.doc);
      } else if (room.documentBlob && room.documentBlob.length > 0) {
        snapshotBuffer = new Uint8Array(room.documentBlob);
      } else {
        throw new BadRequestException('No document state available to snapshot');
      }
    }

    const revisionName =
      dto.name?.trim() || `Revision ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

    const revision = await this.prisma.canvasRevision.create({
      data: {
        roomId: room.id,
        name: revisionName,
        description: dto.description?.trim() || null,
        documentBlob: Buffer.from(snapshotBuffer) as any,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    this.logger.log(
      `[RevisionsService] Created revision "${revision.name}" (${revision.id}) for room "${roomSlug}" (${snapshotBuffer.length} bytes)`
    );

    // Record audit event
    await this.activityService.log({
      workspaceId: room.workspaceId,
      roomId: room.id,
      userId,
      action: 'REVISION_CREATED',
      details: {
        revisionId: revision.id,
        revisionName: revision.name,
        sizeBytes: snapshotBuffer.length,
      },
    });

    return {
      id: revision.id,
      roomId: revision.roomId,
      roomSlug,
      name: revision.name,
      description: revision.description,
      sizeBytes: revision.documentBlob.length,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy,
    };
  }

  /**
   * Returns all revision snapshots for a room (excluding raw binary blobs for high performance)
   */
  async getRevisions(roomSlug: string) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug: roomSlug },
    });

    if (!room) {
      throw new NotFoundException(`Room "${roomSlug}" not found`);
    }

    const revisions = await this.prisma.canvasRevision.findMany({
      where: { roomId: room.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return revisions.map((rev) => ({
      id: rev.id,
      roomId: rev.roomId,
      roomSlug,
      name: rev.name,
      description: rev.description,
      sizeBytes: rev.documentBlob.length,
      createdAt: rev.createdAt.toISOString(),
      createdBy: rev.createdBy,
    }));
  }

  /**
   * Retrieves single revision details including Base64 encoded snapshot
   */
  async getRevisionById(id: string) {
    const revision = await this.prisma.canvasRevision.findUnique({
      where: { id },
      include: {
        room: {
          select: { id: true, slug: true, title: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!revision) {
      throw new NotFoundException(`Revision "${id}" not found`);
    }

    return {
      id: revision.id,
      roomId: revision.roomId,
      roomSlug: revision.room.slug,
      roomTitle: revision.room.title,
      name: revision.name,
      description: revision.description,
      documentBlobBase64: uint8ArrayToBase64(new Uint8Array(revision.documentBlob)),
      sizeBytes: revision.documentBlob.length,
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy,
    };
  }

  /**
   * Restores canvas room to a previous revision snapshot
   */
  async restoreRevision(id: string, userId: string) {
    const revision = await this.prisma.canvasRevision.findUnique({
      where: { id },
      include: {
        room: true,
      },
    });

    if (!revision) {
      throw new NotFoundException(`Revision "${id}" not found`);
    }

    const roomSlug = revision.room.slug;
    const updateBytes = new Uint8Array(revision.documentBlob);

    // 1. Update in-memory active Y.Doc session
    const session = await this.roomManager.getOrCreateRoom(roomSlug, revision.room.title);
    this.roomManager.applyUpdate(roomSlug, updateBytes, 'revision-restore');

    // 2. Persist to PostgreSQL room table
    await this.prisma.canvasRoom.update({
      where: { id: revision.roomId },
      data: {
        documentBlob: updateBytes,
        updatedAt: new Date(),
      },
    });

    // 3. Broadcast restored delta across Redis Pub/Sub mesh to all connected nodes
    const payloadBase64 = uint8ArrayToBase64(updateBytes);
    await this.redisPubSub.publishUpdate(roomSlug, {
      roomId: roomSlug,
      type: 'sync-step-2',
      payload: payloadBase64,
      originUserId: userId,
      timestamp: Date.now(),
    });

    this.logger.log(
      `[RevisionsService] Restored room "${roomSlug}" to revision "${revision.name}" (${revision.id}) by user ${userId}`
    );

    // 4. Record audit event
    await this.activityService.log({
      workspaceId: revision.room.workspaceId,
      roomId: revision.roomId,
      userId,
      action: 'REVISION_RESTORED',
      details: {
        revisionId: revision.id,
        revisionName: revision.name,
      },
    });

    return {
      success: true,
      restoredRevisionId: id,
      roomSlug,
      revisionName: revision.name,
      restoredAt: new Date().toISOString(),
    };
  }
}
