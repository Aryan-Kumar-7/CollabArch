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

export interface CanvasRoomMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
}
