import { Injectable } from '@nestjs/common';
import { CanvasRoomMeta } from '@collabarch/shared-types';
import { RoomManagerService } from '../gateway/room-manager.service';

@Injectable()
export class RoomsService {
  constructor(private readonly roomManager: RoomManagerService) {}

  getAllRooms(): CanvasRoomMeta[] {
    return this.roomManager.getAllRoomMetas();
  }

  getRoom(id: string): CanvasRoomMeta {
    const session = this.roomManager.getOrCreateRoom(id);
    const metas = this.roomManager.getAllRoomMetas();
    const found = metas.find((m) => m.id === id);
    if (found) return found;

    return {
      id: session.roomId,
      name: `Canvas Room ${session.roomId}`,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.lastActiveAt.toISOString(),
      nodeCount: 0,
      edgeCount: 0,
    };
  }

  createRoom(name?: string, id?: string): CanvasRoomMeta {
    const roomId = id?.trim() || `arch-${Math.random().toString(36).substring(2, 8)}`;
    const roomName =
      name?.trim() ||
      (roomId.startsWith('arch-') ? `Studio ${roomId.replace('arch-', '')}` : `Studio ${roomId}`);
    const session = this.roomManager.getOrCreateRoom(roomId, roomName);
    return {
      id: roomId,
      name: session.name || roomName,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.lastActiveAt.toISOString(),
      nodeCount: 0,
      edgeCount: 0,
    };
  }
}
