import { Injectable, NotFoundException } from '@nestjs/common';
import { CanvasRoomMeta } from '@collabarch/shared-types';

@Injectable()
export class RoomsService {
  private readonly rooms: Map<string, CanvasRoomMeta> = new Map([
    [
      'demo-room',
      {
        id: 'demo-room',
        name: 'Distributed E-Commerce Microservices',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodeCount: 4,
        edgeCount: 3,
      },
    ],
  ]);

  getAllRooms(): CanvasRoomMeta[] {
    return Array.from(this.rooms.values());
  }

  getRoom(id: string): CanvasRoomMeta {
    const room = this.rooms.get(id);
    if (!room) {
      // Auto-create room for development if requested
      const newRoom: CanvasRoomMeta = {
        id,
        name: `Canvas Room ${id}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodeCount: 0,
        edgeCount: 0,
      };
      this.rooms.set(id, newRoom);
      return newRoom;
    }
    return room;
  }

  createRoom(name: string): CanvasRoomMeta {
    const id = `room-${Date.now().toString(36)}`;
    const room: CanvasRoomMeta = {
      id,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeCount: 0,
      edgeCount: 0,
    };
    this.rooms.set(id, room);
    return room;
  }
}
