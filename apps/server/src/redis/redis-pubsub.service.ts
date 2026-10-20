import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import {
  RedisRoomUpdateMessage,
  RedisRoomAwarenessMessage,
} from '@collabarch/shared-types';
import {
  REDIS_PUB_CLIENT,
  REDIS_SUB_CLIENT,
  getRoomUpdatesChannel,
  getRoomAwarenessChannel,
  parseRoomChannel,
} from './redis.constants';

export interface RoomMessageHandler {
  onUpdate: (message: RedisRoomUpdateMessage) => void;
  onAwareness: (message: RedisRoomAwarenessMessage) => void;
}

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);

  /**
   * Unique identifier for this NestJS node instance in the cluster.
   * Attached to outgoing messages to prevent redundant echo broadcasts.
   */
  public readonly serverId = `node-${process.pid}-${randomUUID().slice(0, 8)}`;

  /**
   * Tracks rooms actively subscribed to on this server node.
   */
  private readonly subscribedRooms = new Set<string>();

  /**
   * Message handler dispatchers mapped by roomId.
   */
  private readonly roomHandlers = new Map<string, RoomMessageHandler>();

  constructor(
    @Inject(REDIS_PUB_CLIENT) private readonly pubClient: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly subClient: Redis
  ) {
    this.setupClientListeners();
  }

  onModuleInit() {
    this.logger.log(
      `[RedisPubSub] Initialized Redis Pub/Sub mesh node: ${this.serverId}`
    );
    this.registerSubscriberDispatcher();
  }

  async onModuleDestroy() {
    this.logger.log(`[RedisPubSub] Disconnecting Redis clients on node shutdown...`);
    try {
      if (this.subscribedRooms.size > 0) {
        const channels: string[] = [];
        for (const roomId of this.subscribedRooms) {
          channels.push(getRoomUpdatesChannel(roomId), getRoomAwarenessChannel(roomId));
        }
        await this.subClient.unsubscribe(...channels);
      }
      await Promise.allSettled([this.pubClient.quit(), this.subClient.quit()]);
    } catch (err) {
      this.logger.error(`[RedisPubSub] Error during Redis disconnect:`, err);
    }
  }

  /**
   * Returns true if both publishing and subscribing clients are connected and ready.
   */
  isReady(): boolean {
    return this.pubClient.status === 'ready' && this.subClient.status === 'ready';
  }

  /**
   * Returns whether this server instance is currently subscribed to Redis channels for roomId.
   */
  isRoomSubscribed(roomId: string): boolean {
    return this.subscribedRooms.has(roomId);
  }

  /**
   * Subscribes this server node to the Redis channels for a room:
   * 1. collabarch:room:<roomId>:updates
   * 2. collabarch:room:<roomId>:awareness
   */
  async subscribeToRoom(roomId: string, handlers: RoomMessageHandler): Promise<void> {
    this.roomHandlers.set(roomId, handlers);

    if (this.subscribedRooms.has(roomId)) {
      // Already subscribed to Redis channels for this room on this node
      return;
    }

    const updatesChannel = getRoomUpdatesChannel(roomId);
    const awarenessChannel = getRoomAwarenessChannel(roomId);

    try {
      await this.subClient.subscribe(updatesChannel, awarenessChannel);
      this.subscribedRooms.add(roomId);
      this.logger.log(
        `[RedisPubSub] Node ${this.serverId} subscribed to room "${roomId}" channels [${updatesChannel}, ${awarenessChannel}]`
      );
    } catch (err) {
      this.logger.error(
        `[RedisPubSub] Failed to subscribe to Redis channels for room "${roomId}":`,
        err
      );
      throw err;
    }
  }

  /**
   * Unsubscribes this server node from Redis channels for a room when the last local client departs.
   */
  async unsubscribeFromRoom(roomId: string): Promise<void> {
    if (!this.subscribedRooms.has(roomId)) {
      return;
    }

    const updatesChannel = getRoomUpdatesChannel(roomId);
    const awarenessChannel = getRoomAwarenessChannel(roomId);

    try {
      await this.subClient.unsubscribe(updatesChannel, awarenessChannel);
      this.subscribedRooms.delete(roomId);
      this.roomHandlers.delete(roomId);
      this.logger.log(
        `[RedisPubSub] Node ${this.serverId} unsubscribed from room "${roomId}" channels`
      );
    } catch (err) {
      this.logger.error(
        `[RedisPubSub] Failed to unsubscribe from Redis channels for room "${roomId}":`,
        err
      );
    }
  }

  /**
   * Publishes a differential CRDT update to the cluster via Redis Pub/Sub.
   */
  async publishUpdate(
    roomId: string,
    message: Omit<RedisRoomUpdateMessage, 'originServerId'>
  ): Promise<void> {
    const fullMessage: RedisRoomUpdateMessage = {
      ...message,
      originServerId: this.serverId,
    };

    const channel = getRoomUpdatesChannel(roomId);
    try {
      await this.pubClient.publish(channel, JSON.stringify(fullMessage));
    } catch (err) {
      this.logger.error(
        `[RedisPubSub] Failed to publish update to channel "${channel}":`,
        err
      );
      throw err;
    }
  }

  /**
   * Publishes ephemeral cursor / awareness state to the cluster via Redis Pub/Sub.
   */
  async publishAwareness(
    roomId: string,
    message: Omit<RedisRoomAwarenessMessage, 'originServerId'>
  ): Promise<void> {
    const fullMessage: RedisRoomAwarenessMessage = {
      ...message,
      originServerId: this.serverId,
    };

    const channel = getRoomAwarenessChannel(roomId);
    try {
      await this.pubClient.publish(channel, JSON.stringify(fullMessage));
    } catch (err) {
      this.logger.error(
        `[RedisPubSub] Failed to publish awareness to channel "${channel}":`,
        err
      );
      throw err;
    }
  }

  /**
   * Sets up error logging and connection telemetry on both Redis clients.
   */
  private setupClientListeners(): void {
    this.pubClient.on('connect', () => {
      this.logger.log(`[RedisPubSub] Publisher client connected`);
    });
    this.pubClient.on('error', (err) => {
      this.logger.error(`[RedisPubSub] Publisher client error:`, err);
    });

    this.subClient.on('connect', () => {
      this.logger.log(`[RedisPubSub] Subscriber client connected`);
    });
    this.subClient.on('error', (err) => {
      this.logger.error(`[RedisPubSub] Subscriber client error:`, err);
    });
  }

  /**
   * Central subscriber message demultiplexer.
   * Incoming messages from all subscribed channels are dispatched to the appropriate room handler.
   */
  private registerSubscriberDispatcher(): void {
    this.subClient.on('message', (channel: string, messageStr: string) => {
      const parsed = parseRoomChannel(channel);
      if (!parsed) return;

      const { roomId, type } = parsed;
      const handler = this.roomHandlers.get(roomId);
      if (!handler) {
        return;
      }

      try {
        if (type === 'updates') {
          const updateMsg = JSON.parse(messageStr) as RedisRoomUpdateMessage;
          handler.onUpdate(updateMsg);
        } else if (type === 'awareness') {
          const awarenessMsg = JSON.parse(messageStr) as RedisRoomAwarenessMessage;
          handler.onAwareness(awarenessMsg);
        }
      } catch (err) {
        this.logger.error(
          `[RedisPubSub] Error decoding JSON message from channel "${channel}":`,
          err
        );
      }
    });
  }
}
