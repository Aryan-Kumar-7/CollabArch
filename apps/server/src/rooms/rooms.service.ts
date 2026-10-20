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

  createRoom(name: string): CanvasRoomMeta {
    const id = `room-${Date.now().toString(36)}`;
    const session = this.roomManager.getOrCreateRoom(id);
    return {
      id,
      name,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.lastActiveAt.toISOString(),
      nodeCount: 0,
      edgeCount: 0,
    };
  }
}
