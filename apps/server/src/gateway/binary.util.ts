/**
 * Utility functions for binary Uint8Array <-> Base64 encoding/decoding
 * Ensures portable serialization across WebSockets, JSON payloads, and Redis Pub/Sub channels.
 */

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}

export function base64ToUint8Array(base64Str: string): Uint8Array {
  if (!base64Str || typeof base64Str !== 'string') {
    return new Uint8Array(0);
  }
  const buf = Buffer.from(base64Str, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') {
    return base64ToUint8Array(data);
  }
  if (Array.isArray(data)) {
    const merged =
      data.length > 0 && Buffer.isBuffer(data[0])
        ? Buffer.concat(data as Buffer[])
        : Buffer.from(data);
    return new Uint8Array(merged.buffer, merged.byteOffset, merged.byteLength);
  }
  throw new Error(`Cannot convert ${typeof data} to Uint8Array`);
}
