import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket, RawData } from 'ws';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { verifyToken, createClerkClient } from '@clerk/backend';
import {
  RoomSyncMessage,
  JoinRoomPayload,
  LeaveRoomPayload,
  RoomJoinedResponse,
  RedisRoomUpdateMessage,
  RedisRoomAwarenessMessage,
} from '@collabarch/shared-types';
import { RoomManagerService } from './room-manager.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  toUint8Array,
} from './binary.util';

@WebSocketGateway({ path: '/ws' })
export class CanvasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CanvasGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly roomManager: RoomManagerService,
    private readonly redisPubSub: RedisPubSubService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Connection lifecycle hook with Clerk JWT verification and guest fallback
   */
  async handleConnection(client: WebSocket, request?: IncomingMessage) {
    const socketId = randomUUID();
    (client as any).id = socketId;

    const reqUrl = request?.url || (client as any).url || '';
    const url = new URL(reqUrl, 'http://localhost:4000');
    const token = url.searchParams.get('token');

    let user: {
      userId: string;
      orgId?: string | null;
      orgRole?: string | null;
      userName: string;
      email?: string;
      avatarUrl?: string | null;
      isGuest: boolean;
    } | null = null;

    if (token) {
      try {
        const secretKey =
          process.env.CLERK_SECRET_KEY || 'sk_test_1OOaEIDnIHxhRluKj9r1EBnOVmmiC8fcwyZenhpm2y';
        const verifiedClaims = await verifyToken(token, {
          secretKey,
        });
        user = {
          userId: verifiedClaims.sub,
          orgId: (verifiedClaims as any).org_id || null,
          orgRole: (verifiedClaims as any).org_role || null,
          userName:
            (verifiedClaims as any).name ||
            (verifiedClaims as any).username ||
            (verifiedClaims as any).email?.split('@')[0] ||
            'Architect',
          email: (verifiedClaims as any).email,
          avatarUrl: (verifiedClaims as any).picture || null,
          isGuest: false,
        };
        this.logger.log(
          `[CanvasGateway] Verified Clerk user connected: ${user.userName} (${user.userId}, org: ${user.orgId})`
        );
      } catch (err: any) {
        this.logger.warn(
          `[CanvasGateway] Invalid or expired Clerk token (${err?.message || err}), falling back to guest`
        );
      }
    }

    // Fallback to ephemeral guest identity if unauthenticated
    if (!user) {
      user = {
        userId: `guest-${randomUUID().slice(0, 6)}`,
        userName: `Guest (${randomUUID().slice(0, 4)})`,
        avatarUrl: null,
        isGuest: true,
      };
    }

    (client as any).auth = user;

    this.logger.log(
      `[CanvasGateway] Client connected (socketId: ${socketId}, user: ${user.userName}, isGuest: ${user.isGuest})`
    );

    // Attach native raw binary frame listener
    client.on('message', (data: RawData, isBinary: boolean) => {
      // If isBinary is true or data is a Buffer and not starting with '{' (JSON)
      if (isBinary || (Buffer.isBuffer(data) && data.length > 0 && data[0] !== 0x7b)) {
        this.handleRawBinaryMessage(client, data);
      }
    });

    client.on('error', (err) => {
      this.logger.error(`[CanvasGateway] WebSocket client error (${socketId}):`, err);
    });
  }

  /**
   * Disconnection lifecycle hook
   */
  async handleDisconnect(client: WebSocket) {
    const leaveResult = this.roomManager.leaveRoom(client);
    if (leaveResult) {
      const { roomId, peer, remainingPeerCount, isLastPeerOnNode } = leaveResult;
      this.logger.log(
        `[CanvasGateway] Peer ${peer.userId} disconnected from room "${roomId}". Remaining on node: ${remainingPeerCount}`
      );

      // If last client on this node departed, cleanly unsubscribe from Redis channels
      if (isLastPeerOnNode) {
        await this.redisPubSub.unsubscribeFromRoom(roomId);
        this.logger.log(
          `[CanvasGateway] Cleanly unsubscribed from Redis channels for empty room "${roomId}"`
        );
      }

      // Broadcast peer-left notification to remaining room members on this node
      this.roomManager.broadcastToRoom(roomId, {
        event: 'peer-left',
        data: {
          roomId,
          userId: peer.userId,
          remainingPeerCount,
        },
      });

      // Broadcast an empty awareness update to clear peer cursor across the mesh
      await this.redisPubSub.publishAwareness(roomId, {
        roomId,
        payload: JSON.stringify({
          userId: peer.userId,
          cursor: null,
          selectedNodeIds: [],
          disconnected: true,
        }),
        originSocketId: peer.socketId,
        originUserId: peer.userId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Join Room Handshake
   * Establishes room session, manages Redis channel subscription, and initiates Yjs state sync.
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: JoinRoomPayload & { stateVector?: string; role?: string; token?: string }
  ): Promise<{ event: string; data: RoomJoinedResponse } | void> {
    const { roomId, userId, userName, color, stateVector, role, token } = payload;
    const socketId = (client as any).id || randomUUID();
    (client as any).id = socketId;

    // Verify token from payload if client connected before token was acquired
    let authUser = (client as any).auth;
    if ((!authUser || authUser.isGuest) && token) {
      try {
        const secretKey =
          process.env.CLERK_SECRET_KEY || 'sk_test_1OOaEIDnIHxhRluKj9r1EBnOVmmiC8fcwyZenhpm2y';
        const verifiedClaims = await verifyToken(token, { secretKey });
        if (verifiedClaims?.sub) {
          authUser = {
            userId: verifiedClaims.sub,
            orgId: (verifiedClaims as any).org_id || null,
            orgRole: (verifiedClaims as any).org_role || null,
            userName:
              (verifiedClaims as any).name ||
              (verifiedClaims as any).username ||
              userName ||
              'Architect',
            email: (verifiedClaims as any).email,
            avatarUrl: (verifiedClaims as any).picture || null,
            isGuest: false,
          };
          (client as any).auth = authUser;
          this.logger.log(
            `[CanvasGateway] Verified Clerk user from join-room payload: ${authUser.userName} (${authUser.userId}, org: ${authUser.orgId})`
          );
        }
      } catch (err: any) {
        this.logger.warn(`[CanvasGateway] Failed to verify payload token: ${err?.message || err}`);
      }
    }

    const finalUserId = authUser && !authUser.isGuest ? authUser.userId : (userId || authUser?.userId);
    const finalUserName = authUser && !authUser.isGuest ? authUser.userName : (userName || authUser?.userName);

    // Query PostgreSQL for the room record to enforce RBAC & Visibility gatekeeping
    const room = await this.prisma.canvasRoom.findUnique({
      where: { slug: roomId },
    });

    if (room) {
      const isOwner = Boolean(authUser && !authUser.isGuest && (authUser.userId === room.ownerId || finalUserId === room.ownerId));

      // 1. Private Room Enforcement
      if (room.visibility === 'PRIVATE') {
        if (!isOwner) {
          this.logger.warn(
            `[CanvasGateway] Access denied to private room "${roomId}" for user "${authUser?.userId}" (guest: ${authUser?.isGuest})`
          );
          this.sendToClient(client, {
            event: 'room-access-denied',
            data: { reason: 'This canvas is Private to the owner.' },
          });
          client.close(4403, 'Canvas is private');
          return;
        }
      }
      // 2. Workspace Room Enforcement
      else if (room.visibility === 'WORKSPACE') {
        const isAuthenticated = Boolean(authUser && !authUser.isGuest);

        // 1. Check PostgreSQL WorkspaceMember database table first!
        let isDbMember = false;
        if (isAuthenticated && room.workspaceId && authUser.userId) {
          const dbMember = await this.prisma.workspaceMember.findUnique({
            where: {
              userId_workspaceId: {
                userId: authUser.userId,
                workspaceId: room.workspaceId,
              },
            },
          });
          if (dbMember) {
            isDbMember = true;
          }
        }

        // 2. Check token claims for active org
        const isTokenOrgMember = Boolean(
          isAuthenticated && room.workspaceId && authUser.orgId === room.workspaceId
        );

        let isOrgMember = isDbMember || isTokenOrgMember;

        // 3. Fallback: If not yet in DB, verify via Clerk API and immediately persist to PostgreSQL
        if (!isOrgMember && !isOwner && isAuthenticated && room.workspaceId && authUser.userId) {
          try {
            const secretKey =
              process.env.CLERK_SECRET_KEY || 'sk_test_1OOaEIDnIHxhRluKj9r1EBnOVmmiC8fcwyZenhpm2y';
            const clerk = createClerkClient({ secretKey });
            const userOrgs = await clerk.users.getOrganizationMembershipList({
              userId: authUser.userId,
            });
            const memberMatch = userOrgs.data.find((m) => m.organization.id === room.workspaceId);
            if (memberMatch) {
              isOrgMember = true;
              authUser.orgId = memberMatch.organization.id;
              authUser.orgRole = memberMatch.role;
              (client as any).auth = authUser;
              this.logger.log(
                `[CanvasGateway] Verified Clerk org membership via API for user ${authUser.userId} in org ${room.workspaceId}`
              );

              // Persist into PostgreSQL database WorkspaceMember
              await this.prisma.workspaceMember.upsert({
                where: {
                  userId_workspaceId: {
                    userId: authUser.userId,
                    workspaceId: room.workspaceId,
                  },
                },
                update: {
                  role: memberMatch.role?.includes('admin') ? 'ADMIN' : 'MEMBER',
                },
                create: {
                  userId: authUser.userId,
                  workspaceId: room.workspaceId,
                  role: memberMatch.role?.includes('admin') ? 'ADMIN' : 'MEMBER',
                },
              });
            }
          } catch (err: any) {
            this.logger.warn(
              `[CanvasGateway] Failed to verify org membership via Clerk API: ${err?.message || err}`
            );
          }
        }

        // Room creator / owner always has access to their workspace canvas!
        // Workspace org members also have access.
        const hasAccess = isOwner || isOrgMember || (isAuthenticated && !room.workspaceId);

        if (!hasAccess) {
          this.logger.warn(
            `[CanvasGateway] Access denied to workspace room "${roomId}" for user "${authUser?.userId}" (guest: ${authUser?.isGuest}, org: ${authUser?.orgId}, roomOrg: ${room.workspaceId})`
          );
          this.sendToClient(client, {
            event: 'room-access-denied',
            data: { reason: 'Canvas is restricted to Workspace members only.' },
          });
          client.close(4403, 'Canvas is restricted to Workspace members only.');
          return;
        }
      }
      // 3. Public Link (visibility === 'PUBLIC_LINK'): Allow connection for both authenticated users and guests.
    }

    // Determine user role: 'owner' | 'editor' | 'viewer'
    const isOwner = Boolean(room && authUser && !authUser.isGuest && room.ownerId === authUser.userId);
    let determinedRole: 'owner' | 'editor' | 'viewer' = 'editor';
    if (isOwner) {
      determinedRole = 'owner';
    } else if (role?.toLowerCase() === 'viewer') {
      determinedRole = 'viewer';
    }
    (client as any).role = determinedRole;

    const { session, peer, isFirstPeerOnNode } = await this.roomManager.joinRoom(roomId, client, {
      userId: finalUserId,
      userName: finalUserName,
      color,
      socketId,
      email: authUser?.email,
      avatarUrl: authUser?.avatarUrl,
      isGuest: authUser?.isGuest ?? true,
      role: determinedRole,
    });

    // If this is the first client on this node for this room, dynamically subscribe to Redis channels
    if (isFirstPeerOnNode) {
      await this.redisPubSub.subscribeToRoom(roomId, {
        onUpdate: (msg) => this.handleRedisUpdate(msg),
        onAwareness: (msg) => this.handleRedisAwareness(msg),
      });
      this.logger.log(
        `[CanvasGateway] First client on node joined room "${roomId}". Subscribed to Redis mesh.`
      );
    }

    // 1. Confirm room join to client
    const responseData: RoomJoinedResponse = {
      roomId,
      status: 'ok',
      peerCount: session.peers.size,
      userId: peer.userId,
      userRole: determinedRole,
    };

    // 2. Transmit Step 1 (Server State Vector) to the client
    const serverVector = this.roomManager.encodeStateVector(roomId);
    this.sendToClient(client, {
      event: 'sync-message',
      data: {
        type: 'sync-step-1',
        roomId,
        payload: uint8ArrayToBase64(serverVector),
      },
    });

    // 3. Compute and send differential cold-start update (Sync Step 2)
    let clientVectorBytes: Uint8Array | undefined;
    if (stateVector) {
      try {
        clientVectorBytes = base64ToUint8Array(stateVector);
      } catch (err) {
        this.logger.warn(`[CanvasGateway] Failed to parse client state vector:`, err);
      }
    }

    const diffUpdate = this.roomManager.computeDiff(roomId, clientVectorBytes);
    if (diffUpdate.length > 0) {
      this.sendToClient(client, {
        event: 'sync-message',
        data: {
          type: 'sync-step-2',
          roomId,
          payload: uint8ArrayToBase64(diffUpdate),
        },
      });
    }

    // 4. Notify existing room peers on this node that a new peer has joined
    this.roomManager.broadcastToRoom(
      roomId,
      {
        event: 'peer-joined',
        data: {
          roomId,
          peer: {
            userId: peer.userId,
            userName: peer.userName,
            color: peer.color,
            email: peer.email,
            avatarUrl: peer.avatarUrl,
            isGuest: peer.isGuest,
          },
          peerCount: session.peers.size,
        },
      },
      client
    );

    return { event: 'room-joined', data: responseData };
  }

  /**
   * Leave Room Request
   */
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload?: LeaveRoomPayload
  ) {
    const leaveResult = this.roomManager.leaveRoom(client);
    if (leaveResult) {
      const { roomId, peer, remainingPeerCount, isLastPeerOnNode } = leaveResult;

      // If last client on this node left, unsubscribe from Redis channels
      if (isLastPeerOnNode) {
        await this.redisPubSub.unsubscribeFromRoom(roomId);
        this.logger.log(
          `[CanvasGateway] Last peer left room "${roomId}". Unsubscribed from Redis mesh.`
        );
      }

      this.roomManager.broadcastToRoom(roomId, {
        event: 'peer-left',
        data: {
          roomId,
          userId: peer.userId,
          remainingPeerCount,
        },
      });
    }
    return { event: 'room-left', data: { status: 'ok' } };
  }

  /**
   * Unified Yjs Sync Message Router
   * Handles: sync-step-1, sync-step-2, sync-update, awareness
   */
  @SubscribeMessage('sync-message')
  async handleSyncMessage(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() message: RoomSyncMessage
  ) {
    const roomId = message.roomId || this.roomManager.getSocketRoomId(client);
    if (!roomId) {
      this.logger.warn('[CanvasGateway] Received sync-message without active room');
      return;
    }

    switch (message.type) {
      case 'sync-step-1':
        this.processSyncStep1(client, roomId, message.payload);
        break;

      case 'sync-step-2':
        await this.processSyncStep2(client, roomId, message.payload);
        break;

      case 'sync-update':
        await this.processSyncUpdate(client, roomId, message.payload);
        break;

      case 'awareness':
        await this.processAwareness(client, roomId, message.payload);
        break;

      default:
        this.logger.warn(`[CanvasGateway] Unknown sync message type: ${(message as any).type}`);
    }
  }

  /**
   * Individual event subscriptions for granular routing
   */
  @SubscribeMessage('sync-step-1')
  handleSyncStep1(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { roomId: string; payload: string }
  ) {
    this.processSyncStep1(client, data.roomId, data.payload);
  }

  @SubscribeMessage('sync-step-2')
  async handleSyncStep2(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { roomId: string; payload: string }
  ) {
    await this.processSyncStep2(client, data.roomId, data.payload);
  }

  @SubscribeMessage('sync-update')
  async handleSyncUpdate(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { roomId: string; payload: string }
  ) {
    await this.processSyncUpdate(client, data.roomId, data.payload);
  }

  @SubscribeMessage('awareness')
  async handleAwareness(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { roomId: string; payload: string }
  ) {
    await this.processAwareness(client, data.roomId, data.payload);
  }

  /**
   * Sync Step 1 Handler:
   * Client sends its state vector. Server calculates differential update (Step 2)
   * and sends it back to the client.
   */
  private processSyncStep1(client: WebSocket, roomId: string, payloadBase64: string): void {
    try {
      const clientVector = base64ToUint8Array(payloadBase64);
      const diff = this.roomManager.computeDiff(roomId, clientVector);

      if (diff.length > 0) {
        this.sendToClient(client, {
          event: 'sync-message',
          data: {
            type: 'sync-step-2',
            roomId,
            payload: uint8ArrayToBase64(diff),
          },
        });
      }
    } catch (err) {
      this.logger.error(`[CanvasGateway] Failed to process sync-step-1 for room ${roomId}:`, err);
    }
  }

  /**
   * Sync Step 2 Handler:
   * Client transmits its differential update to merge into the server's Y.Doc and Redis mesh.
   */
  private async processSyncStep2(
    client: WebSocket,
    roomId: string,
    payloadBase64: string
  ): Promise<void> {
    const peer = this.roomManager.getPeer(client);
    const clientRole = (client as any).role || peer?.role;
    if (clientRole === 'viewer' || clientRole === 'VIEWER') {
      this.logger.debug(`[CanvasGateway] Dropping sync-step-2 from read-only VIEWER ${peer?.userId}`);
      return;
    }

    try {
      const updateBytes = base64ToUint8Array(payloadBase64);
      const applied = this.roomManager.applyUpdate(roomId, updateBytes, client);

      if (applied) {
        const socketId = (client as any).id || peer?.socketId;

        // Publish to Redis Pub/Sub backplane
        await this.redisPubSub.publishUpdate(roomId, {
          roomId,
          type: 'sync-step-2',
          payload: payloadBase64,
          originSocketId: socketId,
          originUserId: peer?.userId,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      this.logger.error(`[CanvasGateway] Failed to process sync-step-2 for room ${roomId}:`, err);
    }
  }

  /**
   * Incremental Sync Update Handler:
   * Real-time delta created by node move, addition, deletion, or property change.
   */
  private async processSyncUpdate(
    client: WebSocket,
    roomId: string,
    payloadBase64: string
  ): Promise<void> {
    const peer = this.roomManager.getPeer(client);
    const clientRole = (client as any).role || peer?.role;
    if (clientRole === 'viewer' || clientRole === 'VIEWER') {
      this.logger.debug(`[CanvasGateway] Dropping sync-update from read-only VIEWER ${peer?.userId}`);
      return;
    }

    try {
      const updateBytes = base64ToUint8Array(payloadBase64);
      const applied = this.roomManager.applyUpdate(roomId, updateBytes, client);

      if (applied) {
        const socketId = (client as any).id || peer?.socketId;

        // Publish to Redis Pub/Sub mesh
        await this.redisPubSub.publishUpdate(roomId, {
          roomId,
          type: 'sync-update',
          payload: payloadBase64,
          originSocketId: socketId,
          originUserId: peer?.userId,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      this.logger.error(`[CanvasGateway] Failed to process sync-update for room ${roomId}:`, err);
    }
  }

  /**
   * Ephemeral Presence & Awareness Relay:
   * Relays live cursor movements, client username, and selected nodes to the cluster via Redis.
   */
  private async processAwareness(
    client: WebSocket,
    roomId: string,
    payload: string
  ): Promise<void> {
    try {
      const peer = this.roomManager.getPeer(client);
      const socketId = (client as any).id || peer?.socketId;

      await this.redisPubSub.publishAwareness(roomId, {
        roomId,
        payload,
        originSocketId: socketId,
        originUserId: peer?.userId,
        timestamp: Date.now(),
      });
    } catch (err) {
      this.logger.error(`[CanvasGateway] Failed to relay awareness for room ${roomId}:`, err);
    }
  }

  /**
   * Raw Binary Message Processing (Uint8Array frames)
   */
  private async handleRawBinaryMessage(client: WebSocket, raw: RawData): Promise<void> {
    const roomId = this.roomManager.getSocketRoomId(client);
    if (!roomId) {
      this.logger.warn('[CanvasGateway] Received raw binary from socket not joined to any room');
      return;
    }

    try {
      const binaryBytes = toUint8Array(raw);
      if (binaryBytes.length === 0) return;

      const peer = this.roomManager.getPeer(client);
      const socketId = (client as any).id || peer?.socketId;
      const clientRole = (client as any).role || peer?.role;

      // Prefix byte protocol: 0 = sync-step-1, 1 = sync-step-2, 2 = sync-update, 3 = awareness
      const msgType = binaryBytes[0];
      const payloadBytes = binaryBytes.subarray(1);

      // VIEWER guard: Drop binary mutation frames from read-only viewers
      if (clientRole === 'viewer' || clientRole === 'VIEWER') {
        if (msgType === 1 || msgType === 2 || msgType > 3) {
          this.logger.debug(`[CanvasGateway] Dropping raw binary edit from VIEWER ${peer?.userId}`);
          return;
        }
      }

      if (msgType === 0) {
        // sync-step-1: payload is state vector
        const diff = this.roomManager.computeDiff(roomId, payloadBytes);
        const reply = new Uint8Array(diff.length + 1);
        reply[0] = 1; // sync-step-2
        reply.set(diff, 1);
        client.send(reply, { binary: true });
      } else if (msgType === 1 || msgType === 2) {
        // sync-step-2 or sync-update: payload is binary delta
        const applied = this.roomManager.applyUpdate(roomId, payloadBytes, client);
        if (applied) {
          const payloadBase64 = uint8ArrayToBase64(payloadBytes);
          await this.redisPubSub.publishUpdate(roomId, {
            roomId,
            type: msgType === 1 ? 'sync-step-2' : 'sync-update',
            payload: payloadBase64,
            originSocketId: socketId,
            originUserId: peer?.userId,
            timestamp: Date.now(),
          });
        }
      } else if (msgType === 3) {
        // Awareness binary payload
        const payloadBase64 = uint8ArrayToBase64(payloadBytes);
        await this.redisPubSub.publishAwareness(roomId, {
          roomId,
          payload: payloadBase64,
          originSocketId: socketId,
          originUserId: peer?.userId,
          timestamp: Date.now(),
        });
      } else {
        // Direct Yjs update without prefix byte
        const applied = this.roomManager.applyUpdate(roomId, binaryBytes, client);
        if (applied) {
          const payloadBase64 = uint8ArrayToBase64(binaryBytes);
          await this.redisPubSub.publishUpdate(roomId, {
            roomId,
            type: 'sync-update',
            payload: payloadBase64,
            originSocketId: socketId,
            originUserId: peer?.userId,
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      this.logger.error(`[CanvasGateway] Error handling raw binary payload:`, err);
    }
  }

  /**
   * Dispatches updates received from the Redis Pub/Sub mesh.
   * 1. If originated from another server node, applies update to in-memory Y.Doc.
   * 2. Forwards payload to all local sockets in the room, EXCLUDING the originating socket.
   */
  private handleRedisUpdate(msg: RedisRoomUpdateMessage): void {
    const { roomId, type, payload, originServerId, originSocketId } = msg;

    // 1. If received from another cluster node, apply to local Y.Doc
    if (originServerId !== this.redisPubSub.serverId) {
      try {
        const updateBytes = base64ToUint8Array(payload);
        this.roomManager.applyUpdate(roomId, updateBytes, 'redis-mesh');
      } catch (err) {
        this.logger.error(
          `[CanvasGateway] Failed to apply remote Redis update to room "${roomId}":`,
          err
        );
      }
    }

    // 2. Forward to all locally connected sockets in that room, excluding originating socket
    const session = this.roomManager.getRoom(roomId);
    if (!session) return;

    const messagePayload = JSON.stringify({
      event: 'sync-message',
      data: {
        type,
        roomId,
        payload,
      },
    });

    for (const [socket, peer] of session.peers) {
      const socketId = (socket as any).id || peer.socketId;
      if (socketId === originSocketId) {
        // Exclude originating socket to avoid duplicate echo
        continue;
      }

      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(messagePayload);
        } catch (err) {
          this.logger.error(
            `[CanvasGateway] Failed forwarding Redis update to peer ${peer.userId}:`,
            err
          );
        }
      }
    }
  }

  /**
   * Dispatches awareness received from the Redis Pub/Sub mesh.
   * Forwards payload to all local sockets in the room, EXCLUDING the originating socket.
   */
  private handleRedisAwareness(msg: RedisRoomAwarenessMessage): void {
    const { roomId, payload, originSocketId } = msg;

    const session = this.roomManager.getRoom(roomId);
    if (!session) return;

    const messagePayload = JSON.stringify({
      event: 'sync-message',
      data: {
        type: 'awareness',
        roomId,
        payload,
      },
    });

    for (const [socket, peer] of session.peers) {
      const socketId = (socket as any).id || peer.socketId;
      if (socketId === originSocketId) {
        // Exclude originating socket
        continue;
      }

      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(messagePayload);
        } catch (err) {
          this.logger.error(
            `[CanvasGateway] Failed forwarding Redis awareness to peer ${peer.userId}:`,
            err
          );
        }
      }
    }
  }

  /**
   * Safe socket transmitter
   */
  private sendToClient(client: WebSocket, payload: unknown): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
      } catch (err) {
        this.logger.error('[CanvasGateway] Error sending message to client:', err);
      }
    }
  }
}
