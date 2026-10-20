export const REDIS_PUB_CLIENT = 'REDIS_PUB_CLIENT';
export const REDIS_SUB_CLIENT = 'REDIS_SUB_CLIENT';

/**
 * Constructs the Redis Pub/Sub channel for Yjs binary and incremental updates.
 * Channel: collabarch:room:<roomId>:updates
 */
export function getRoomUpdatesChannel(roomId: string): string {
  return `collabarch:room:${roomId}:updates`;
}

/**
 * Constructs the Redis Pub/Sub channel for ephemeral awareness (cursors, presence).
 * Channel: collabarch:room:<roomId>:awareness
 */
export function getRoomAwarenessChannel(roomId: string): string {
  return `collabarch:room:${roomId}:awareness`;
}

/**
 * Parses an incoming Redis channel name into its roomId and message subchannel type.
 */
export function parseRoomChannel(
  channel: string
): { roomId: string; type: 'updates' | 'awareness' } | null {
  const match = channel.match(/^collabarch:room:(.+):(updates|awareness)$/);
  if (!match) return null;
  return {
    roomId: match[1],
    type: match[2] as 'updates' | 'awareness',
  };
}
