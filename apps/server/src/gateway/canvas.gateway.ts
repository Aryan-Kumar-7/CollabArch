import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { RoomSyncMessage } from '@collabarch/shared-types';

@WebSocketGateway({ path: '/ws' })
export class CanvasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Active sockets mapped by roomId
  private readonly roomSockets: Map<string, Set<WebSocket>> = new Map();
  // Socket mapped to its active roomId
  private readonly socketToRoom: Map<WebSocket, string> = new Map();

  handleConnection(client: WebSocket) {
    console.log('[CanvasGateway] Client connected');
  }

  handleDisconnect(client: WebSocket) {
    const roomId = this.socketToRoom.get(client);
    if (roomId) {
      const room = this.roomSockets.get(roomId);
      if (room) {
        room.delete(client);
        if (room.size === 0) {
          this.roomSockets.delete(roomId);
        }
      }
      this.socketToRoom.delete(client);
      console.log(`[CanvasGateway] Client disconnected from room ${roomId}`);
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { roomId: string; userId?: string }
  ) {
    const { roomId } = data;
    this.socketToRoom.set(client, roomId);

    if (!this.roomSockets.has(roomId)) {
      this.roomSockets.set(roomId, new Set());
    }
    this.roomSockets.get(roomId)!.add(client);

    console.log(`[CanvasGateway] Socket joined room: ${roomId}`);
    return { event: 'room-joined', data: { roomId, status: 'ok' } };
  }

  @SubscribeMessage('sync-message')
  handleSyncMessage(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() message: RoomSyncMessage
  ) {
    const roomId = message.roomId || this.socketToRoom.get(client);
    if (!roomId) return;

    // Broadcast binary delta / awareness update to other room peers
    const peers = this.roomSockets.get(roomId);
    if (peers) {
      for (const peer of peers) {
        if (peer !== client && peer.readyState === WebSocket.OPEN) {
          peer.send(
            JSON.stringify({
              event: 'sync-message',
              data: message,
            })
          );
        }
      }
    }
  }
}
