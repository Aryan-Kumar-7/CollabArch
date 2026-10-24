import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as Y from 'yjs';
import { WebSocket } from 'ws';
import {
  CanvasNode,
  CanvasEdge,
  CanvasRoomMeta,
} from '@collabarch/shared-types';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface ConnectedPeer {
  socket: WebSocket;
  socketId: string;
  userId: string;
  userName: string;
  color: string;
  joinedAt: Date;
  email?: string;
  avatarUrl?: string | null;
  isGuest?: boolean;
}

export interface RoomSession {
  roomId: string;
  name?: string;
  doc: Y.Doc;
  peers: Map<WebSocket, ConnectedPeer>;
  createdAt: Date;
  lastActiveAt: Date;
}

const DEFAULT_PEER_COLORS = [
  '#38bdf8', // Sky
  '#818cf8', // Indigo
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f472b6', // Pink
  '#a78bfa', // Purple
  '#fb923c', // Orange
];

@Injectable()
export class RoomManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(RoomManagerService.name);

  // In-memory active room sessions
  private readonly rooms = new Map<string, RoomSession>();

  // Reverse mapping for fast socket-to-roomId lookups
  private readonly socketToRoom = new Map<WebSocket, string>();

  // Debounced snapshot timers per room
  private readonly snapshotTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves an active room or initializes a new in-memory Y.Doc session with PostgreSQL cold-start hydration.
   */
  async getOrCreateRoom(roomId: string, name?: string): Promise<RoomSession> {
    let session = this.rooms.get(roomId);
    if (!session) {
      const doc = new Y.Doc();
      const defaultName = roomId.startsWith('arch-')
        ? `Studio ${roomId.replace('arch-', '')}`
        : `Studio ${roomId}`;

      session = {
        roomId,
        name: name || defaultName,
        doc,
        peers: new Map(),
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      // Cold-start hydration: Check if a binary snapshot is persisted in PostgreSQL
      try {
        const roomRecord = await this.prisma.canvasRoom.findUnique({
          where: { slug: roomId },
          select: { documentBlob: true, title: true },
        });

        if (roomRecord?.documentBlob && roomRecord.documentBlob.length > 0) {
          Y.applyUpdate(doc, new Uint8Array(roomRecord.documentBlob), 'cold-start-hydration');
          this.logger.log(
            `[RoomManager] Cold-start hydrated room "${roomId}" from PostgreSQL snapshot (${roomRecord.documentBlob.length} bytes)`
          );
        } else {
          // Only seed starter architectural topology if no documentBlob exists in the database
          this.seedStarterArchitecture(doc);
        }

        if (roomRecord?.title) {
          session.name = roomRecord.title;
        }
      } catch (err: any) {
        this.logger.warn(
          `[RoomManager] Could not hydrate snapshot for room "${roomId}", using starter seed:`,
          err?.message || err
        );
        this.seedStarterArchitecture(doc);
      }

      this.rooms.set(roomId, session);
      this.logger.log(`[RoomManager] Initialized dynamic in-memory Y.Doc room: ${roomId}`);
    }
    session.lastActiveAt = new Date();
    return session;
  }

  /**
   * Registers a client socket into an active room session.
   * Returns whether this is the first peer connected to this room on this node.
   */
  async joinRoom(
    roomId: string,
    socket: WebSocket,
    userInfo?: {
      userId?: string;
      userName?: string;
      color?: string;
      socketId?: string;
      email?: string;
      avatarUrl?: string | null;
      isGuest?: boolean;
    }
  ): Promise<{ session: RoomSession; peer: ConnectedPeer; isFirstPeerOnNode: boolean }> {
    // If socket was already registered in a different room, clean up first
    const existingRoomId = this.socketToRoom.get(socket);
    if (existingRoomId && existingRoomId !== roomId) {
      this.leaveRoom(socket);
    }

    const session = await this.getOrCreateRoom(roomId);
    const isFirstPeerOnNode = session.peers.size === 0;

    const socketId = userInfo?.socketId || (socket as any).id || randomUUID();
    (socket as any).id = socketId;

    const userId = userInfo?.userId || `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const color = userInfo?.color || DEFAULT_PEER_COLORS[session.peers.size % DEFAULT_PEER_COLORS.length];
    const userName = userInfo?.userName || `Architect ${session.peers.size + 1}`;

    // Evict any stale socket for the same userId in this room (handles React StrictMode & fast reconnects)
    for (const [existingSocket, existingPeer] of session.peers.entries()) {
      if (existingPeer.userId === userId && existingSocket !== socket) {
        this.logger.log(
          `[RoomManager] Evicting stale socket for user "${userId}" in room "${roomId}"`
        );
        this.socketToRoom.delete(existingSocket);
        session.peers.delete(existingSocket);
        try {
          existingSocket.close();
        } catch {
          // Socket already terminated
        }
      }
    }

    const peer: ConnectedPeer = {
      socket,
      socketId,
      userId,
      userName,
      color,
      joinedAt: new Date(),
      email: userInfo?.email,
      avatarUrl: userInfo?.avatarUrl,
      isGuest: userInfo?.isGuest ?? true,
    };

    session.peers.set(socket, peer);
    this.socketToRoom.set(socket, roomId);
    session.lastActiveAt = new Date();

    this.logger.log(
      `[RoomManager] Peer ${userId} (${userName}, socketId: ${socketId}) joined room "${roomId}". Total peers on node: ${session.peers.size}`
    );

    return { session, peer, isFirstPeerOnNode };
  }

  /**
   * Removes a socket from its active room and cleans up mappings.
   * Returns whether this was the last peer connected to this room on this node.
   */
  leaveRoom(socket: WebSocket): {
    roomId: string;
    peer: ConnectedPeer;
    remainingPeerCount: number;
    isLastPeerOnNode: boolean;
  } | null {
    const roomId = this.socketToRoom.get(socket);
    if (!roomId) return null;

    const session = this.rooms.get(roomId);
    this.socketToRoom.delete(socket);

    if (!session) return null;

    const peer = session.peers.get(socket);
    session.peers.delete(socket);
    session.lastActiveAt = new Date();

    const remainingPeerCount = session.peers.size;
    const isLastPeerOnNode = remainingPeerCount === 0;

    this.logger.log(
      `[RoomManager] Peer ${peer?.userId ?? 'unknown'} left room "${roomId}". Remaining peers on node: ${remainingPeerCount}`
    );

    if (isLastPeerOnNode) {
      // If last client departed, flush immediately so server restarts don't lose the latest state
      if (this.snapshotTimers.has(roomId)) {
        clearTimeout(this.snapshotTimers.get(roomId)!);
        this.snapshotTimers.delete(roomId);
      }
      this.flushRoomSnapshot(roomId).catch((err) => {
        this.logger.error(`[Persistence] Error flushing snapshot on last peer departure:`, err);
      });
    }

    if (peer) {
      return { roomId, peer, remainingPeerCount, isLastPeerOnNode };
    }
    return null;
  }

  /**
   * Applies an incoming binary differential update to the room's CRDT document
   * and schedules a debounced snapshot flush to PostgreSQL.
   */
  applyUpdate(roomId: string, update: Uint8Array, origin?: unknown): boolean {
    const session = this.rooms.get(roomId);
    if (!session) {
      this.logger.warn(`[RoomManager] Cannot apply update: Room "${roomId}" not found`);
      return false;
    }

    try {
      Y.applyUpdate(session.doc, update, origin);
      session.lastActiveAt = new Date();
      this.scheduleRoomSnapshot(roomId);
      return true;
    } catch (err) {
      this.logger.error(`[RoomManager] Error applying CRDT update to room "${roomId}":`, err);
      return false;
    }
  }

  /**
   * Trailing debounce (10 seconds) for persisting binary snapshots to PostgreSQL.
   */
  private scheduleRoomSnapshot(roomId: string): void {
    if (this.snapshotTimers.has(roomId)) {
      clearTimeout(this.snapshotTimers.get(roomId)!);
    }

    const timer = setTimeout(async () => {
      await this.flushRoomSnapshot(roomId);
    }, 10000); // 10s trailing debounce

    this.snapshotTimers.set(roomId, timer);
  }

  /**
   * Flushes binary snapshot of Y.Doc into PostgreSQL.
   */
  public async flushRoomSnapshot(roomId: string): Promise<void> {
    const session = this.rooms.get(roomId);
    if (!session) return;

    try {
      const snapshotBuffer = Buffer.from(Y.encodeStateAsUpdate(session.doc));
      await this.prisma.canvasRoom.update({
        where: { slug: roomId },
        data: {
          documentBlob: snapshotBuffer,
          updatedAt: new Date(),
        },
      });
      this.logger.log(
        `[Persistence] Flushed snapshot for room "${roomId}" to PostgreSQL (${snapshotBuffer.length} bytes)`
      );
    } catch (err: any) {
      if (err.code === 'P2025') {
        try {
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
          const snapshotBuffer = Buffer.from(Y.encodeStateAsUpdate(session.doc));
          await this.prisma.canvasRoom.create({
            data: {
              slug: roomId,
              title: session.name || `Studio ${roomId}`,
              ownerId: defaultOwnerId,
              documentBlob: snapshotBuffer,
            },
          });
          this.logger.log(
            `[Persistence] Auto-created & flushed room "${roomId}" to PostgreSQL (${snapshotBuffer.length} bytes)`
          );
        } catch (innerErr) {
          this.logger.error(`[Persistence] Failed auto-creating room "${roomId}":`, innerErr);
        }
      } else {
        this.logger.error(
          `[Persistence] Failed to flush snapshot for room "${roomId}":`,
          err?.message || err
        );
      }
    } finally {
      this.snapshotTimers.delete(roomId);
    }
  }

  /**
   * Flushes all pending snapshots upon server shutdown.
   */
  async onModuleDestroy() {
    for (const [roomId, timer] of this.snapshotTimers.entries()) {
      clearTimeout(timer);
      await this.flushRoomSnapshot(roomId);
    }
    this.snapshotTimers.clear();
  }

  /**
   * Encodes the current state vector for a room document (Sync Step 1).
   */
  encodeStateVector(roomId: string): Uint8Array {
    const session = this.rooms.get(roomId);
    if (!session) return new Uint8Array();
    return Y.encodeStateVector(session.doc);
  }

  /**
   * Computes the differential update given a target state vector (Sync Step 2).
   */
  computeDiff(roomId: string, targetStateVector?: Uint8Array): Uint8Array {
    const session = this.rooms.get(roomId);
    if (!session) return new Uint8Array();
    return Y.encodeStateAsUpdate(session.doc, targetStateVector);
  }

  /**
   * Returns the room session if it exists.
   */
  getRoom(roomId: string): RoomSession | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Gets the roomId associated with a socket.
   */
  getSocketRoomId(socket: WebSocket): string | undefined {
    return this.socketToRoom.get(socket);
  }

  /**
   * Gets peer metadata associated with a socket.
   */
  getPeer(socket: WebSocket): ConnectedPeer | undefined {
    const roomId = this.socketToRoom.get(socket);
    if (!roomId) return undefined;
    return this.rooms.get(roomId)?.peers.get(socket);
  }

  /**
   * Returns list of connected peers in a room.
   */
  getRoomPeers(roomId: string): ConnectedPeer[] {
    const session = this.rooms.get(roomId);
    if (!session) return [];
    return Array.from(session.peers.values());
  }

  /**
   * Broadcasts a JSON or string message to all peers in a room, optionally excluding sender.
   */
  broadcastToRoom(roomId: string, message: unknown, excludeSocket?: WebSocket): void {
    const session = this.rooms.get(roomId);
    if (!session) return;

    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    for (const [socket] of session.peers) {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(payload);
        } catch (err) {
          this.logger.error(`[RoomManager] Failed to send message to peer in room ${roomId}:`, err);
        }
      }
    }
  }

  /**
   * Broadcasts a raw binary Buffer/Uint8Array to all peers in a room.
   */
  broadcastBinaryToRoom(roomId: string, binaryData: Uint8Array | Buffer, excludeSocket?: WebSocket): void {
    const session = this.rooms.get(roomId);
    if (!session) return;

    for (const [socket] of session.peers) {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(binaryData, { binary: true });
        } catch (err) {
          this.logger.error(`[RoomManager] Failed to send binary to peer in room ${roomId}:`, err);
        }
      }
    }
  }

  /**
   * Retrieves metadata summaries for all active rooms.
   */
  getAllRoomMetas(): CanvasRoomMeta[] {
    return Array.from(this.rooms.values()).map((session) => {
      const yNodes = session.doc.getMap<CanvasNode>('nodes');
      const yEdges = session.doc.getMap<CanvasEdge>('edges');
      return {
        id: session.roomId,
        name: session.name || `Studio ${session.roomId}`,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.lastActiveAt.toISOString(),
        nodeCount: yNodes.size,
        edgeCount: yEdges.size,
      };
    });
  }

  /**
   * Seeds a room with starter architecture topology.
   */
  private seedStarterArchitecture(doc: Y.Doc): void {
    const yNodes = doc.getMap<CanvasNode>('nodes');
    const yEdges = doc.getMap<CanvasEdge>('edges');

    doc.transact(() => {
      const initialNodes: CanvasNode[] = [
        {
          id: 'node-gateway',
          type: 'api-gateway',
          position: { x: 60, y: 260 },
          data: {
            label: 'Edge Gateway',
            capacityRps: 5000,
            latencyMs: 15,
            queueDepthLimit: 1000,
            failureRate: 0.001,
            description: 'Public ingress terminating TLS and rate-limiting upstream callers.',
            tags: ['ingress', 'nginx', 'edge'],
          },
        },
        {
          id: 'node-order-svc',
          type: 'service',
          position: { x: 480, y: 80 },
          data: {
            label: 'Order Service',
            capacityRps: 1500,
            latencyMs: 40,
            queueDepthLimit: 600,
            failureRate: 0.008,
            description: 'Handles order placement, idempotency validation, and checkout orchestration.',
            tags: ['core', 'golang', 'orders'],
          },
        },
        {
          id: 'node-payment-svc',
          type: 'service',
          position: { x: 480, y: 440 },
          data: {
            label: 'Payment Service',
            capacityRps: 800,
            latencyMs: 65,
            queueDepthLimit: 400,
            failureRate: 0.015,
            description: 'Third-party gateway reconciliation & fraud verification processor.',
            tags: ['stripe', 'pci-dss', 'payments'],
          },
        },
        {
          id: 'node-db',
          type: 'database',
          position: { x: 920, y: 80 },
          data: {
            label: 'Orders DB',
            capacityRps: 1000,
            latencyMs: 25,
            queueDepthLimit: 450,
            failureRate: 0.002,
            description: 'Primary PostgreSQL cluster with read replicas and pgvector index.',
            tags: ['postgres', 'storage', 'aurora'],
          },
        },
        {
          id: 'node-queue',
          type: 'queue',
          position: { x: 920, y: 440 },
          data: {
            label: 'Order Events Bus',
            capacityRps: 12000,
            latencyMs: 5,
            queueDepthLimit: 50000,
            failureRate: 0.0001,
            description: 'Partitioned Kafka log fanning out transaction events to analytics & notifications.',
            tags: ['kafka', 'streaming', 'pubsub'],
          },
        },
      ];

      const initialEdges: CanvasEdge[] = [
        {
          id: 'edge-gateway-order',
          source: 'node-gateway',
          target: 'node-order-svc',
          animated: true,
          data: {
            protocol: 'HTTP',
            latencyMs: 5,
            bandwidthLimitRps: 4000,
          },
        },
        {
          id: 'edge-gateway-payment',
          source: 'node-gateway',
          target: 'node-payment-svc',
          animated: true,
          data: {
            protocol: 'gRPC',
            latencyMs: 3,
            bandwidthLimitRps: 2000,
          },
        },
        {
          id: 'edge-order-db',
          source: 'node-order-svc',
          target: 'node-db',
          animated: true,
          data: {
            protocol: 'TCP',
            latencyMs: 2,
            bandwidthLimitRps: 1500,
          },
        },
        {
          id: 'edge-order-queue',
          source: 'node-order-svc',
          target: 'node-queue',
          animated: true,
          data: {
            protocol: 'AMQP',
            latencyMs: 2,
            bandwidthLimitRps: 8000,
          },
        },
      ];

      for (const node of initialNodes) {
        yNodes.set(node.id, node);
      }
      for (const edge of initialEdges) {
        yEdges.set(edge.id, edge);
      }
    }, 'initial-seed');

    this.logger.log(`[RoomManager] Seeded room with initial architecture topology.`);
  }
}
