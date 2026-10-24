import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService
  ) {}

  /**
   * Retrieves all threaded comments for a room
   */
  async getComments(roomSlug: string) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug: roomSlug },
    });

    if (!room) {
      throw new NotFoundException(`Room "${roomSlug}" not found`);
    }

    return this.prisma.canvasComment.findMany({
      where: {
        roomId: room.id,
        parentId: null, // Top-level comment threads
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates a new pinned architecture comment or threaded reply
   */
  async createComment(roomSlug: string, userId: string, dto: CreateCommentDto) {
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug: roomSlug },
    });

    if (!room) {
      throw new NotFoundException(`Room "${roomSlug}" not found`);
    }

    // Ensure the author User record exists
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@collabarch.internal`,
        name: 'Architect',
      },
    });

    if (dto.parentId) {
      const parent = await this.prisma.canvasComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.roomId !== room.id) {
        throw new NotFoundException('Parent comment not found in this room');
      }
    }

    const comment = await this.prisma.canvasComment.create({
      data: {
        roomId: room.id,
        authorId: userId,
        parentId: dto.parentId || null,
        nodeId: dto.nodeId || null,
        posX: dto.posX ?? null,
        posY: dto.posY ?? null,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    this.logger.log(
      `[CommentsService] Created comment (${comment.id}) in room "${roomSlug}" by user ${userId}`
    );

    // Audit log
    await this.activityService.log({
      workspaceId: room.workspaceId,
      roomId: room.id,
      userId,
      action: 'COMMENT_ADDED',
      details: {
        commentId: comment.id,
        nodeId: comment.nodeId,
        isReply: Boolean(dto.parentId),
      },
    });

    return comment;
  }

  /**
   * Updates resolution status or text content of a comment
   */
  async updateComment(id: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.canvasComment.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment "${id}" not found`);
    }

    const data: any = {};
    if (typeof dto.isResolved === 'boolean') {
      data.isResolved = dto.isResolved;
    }
    if (dto.content !== undefined) {
      if (comment.authorId !== userId) {
        throw new ForbiddenException('Only the author can edit comment text');
      }
      data.content = dto.content.trim();
    }

    const updated = await this.prisma.canvasComment.update({
      where: { id },
      data,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `[CommentsService] Updated comment (${id}) - resolved: ${updated.isResolved}`
    );

    return updated;
  }

  /**
   * Deletes a comment (and its replies via cascade)
   */
  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.canvasComment.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment "${id}" not found`);
    }

    // Only comment author or room owner can delete
    if (comment.authorId !== userId && comment.room.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    await this.prisma.canvasComment.delete({
      where: { id },
    });

    this.logger.log(`[CommentsService] Deleted comment (${id})`);
    return { success: true, deletedCommentId: id };
  }
}
