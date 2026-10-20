/**
 * CollabArch Real-Time Events & Awareness Types
 * Used for NestJS WebSocket Gateway, Redis Pub/Sub, and Yjs awareness.
 */

export type WsSyncMessageType = 'sync-step-1' | 'sync-step-2' | 'sync-update' | 'awareness';

export interface RoomSyncMessage {
  type: WsSyncMessageType;
  roomId: string;
  payload: string; // Base64 encoded Uint8Array for portable JSON over WebSocket / Redis
}

export interface RedisRoomUpdateMessage {
  roomId: string;
  type: 'sync-update' | 'sync-step-2';
  payload: string; // Base64 encoded Uint8Array
  originServerId: string;
  originSocketId?: string;
  originUserId?: string;
  timestamp: number;
}

export interface RedisRoomAwarenessMessage {
  roomId: string;
  payload: string; // Ephemeral presence payload
  originServerId: string;
  originSocketId?: string;
  originUserId?: string;
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  cursor?: { x: number; y: number } | null;
  selectedNodeIds?: string[];
  lastActive: number;
}

export interface AwarenessState {
  users: Record<string, UserPresence>;
}

export interface JoinRoomPayload {
  roomId: string;
  userId?: string;
  userName?: string;
  color?: string;
}

export interface RoomJoinedResponse {
  roomId: string;
  status: 'ok';
  peerCount: number;
  userId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
  userId?: string;
}

export interface PeerLeftPayload {
  roomId: string;
  userId?: string;
  remainingPeerCount: number;
}

export interface CanvasRoomMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
}
