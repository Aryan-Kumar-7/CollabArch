import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAction } from '@prisma/client';

export interface LogActivityParams {
  workspaceId?: string | null;
  roomId?: string | null;
  userId: string;
  action: ActivityAction;
  details?: any;
  ipAddress?: string | null;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an audit event to the ActivityLog table
   */
  async log(params: LogActivityParams) {
    try {
      let resolvedRoomId = params.roomId;
      if (resolvedRoomId) {
        const room = await this.prisma.canvasRoom.findFirst({
          where: {
            OR: [{ id: resolvedRoomId }, { slug: resolvedRoomId }],
          },
          select: { id: true, workspaceId: true },
        });
        if (room) {
          resolvedRoomId = room.id;
          if (!params.workspaceId && room.workspaceId) {
            params.workspaceId = room.workspaceId;
          }
        }
      }

      const logEntry = await this.prisma.activityLog.create({
        data: {
          workspaceId: params.workspaceId || null,
          roomId: resolvedRoomId || null,
          userId: params.userId,
          action: params.action,
          details: params.details || undefined,
          ipAddress: params.ipAddress || null,
        },
      });

      this.logger.log(
        `[ActivityLog] ${params.action} by user ${params.userId} (Room: ${resolvedRoomId || 'none'}, WS: ${params.workspaceId || 'none'})`
      );
      return logEntry;
    } catch (err: any) {
      this.logger.error(`[ActivityLog] Failed to log activity: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Retrieves chronological audit trail for a workspace
   */
  async getWorkspaceActivity(workspaceId: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        room: {
          select: { id: true, slug: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retrieves activity stream for a canvas room
   */
  async getRoomActivity(roomIdOrSlug: string, limit = 50) {
    const room = await this.prisma.canvasRoom.findFirst({
      where: {
        OR: [{ id: roomIdOrSlug }, { slug: roomIdOrSlug }],
      },
      select: { id: true },
    });

    if (!room) {
      return [];
    }

    return this.prisma.activityLog.findMany({
      where: { roomId: room.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
