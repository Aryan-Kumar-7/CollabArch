export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export function getWsUrl(overrideWsUrl?: string): string {
  if (overrideWsUrl) return overrideWsUrl;
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== 'undefined') {
    try {
      const serverUrlObj = new URL(SERVER_URL);
      const wsProtocol = serverUrlObj.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${serverUrlObj.host}/ws`;
    } catch {
      const isHttps = window.location.protocol === 'https:';
      return `${isHttps ? 'wss:' : 'ws:'}//${window.location.hostname}:4000/ws`;
    }
  }
  return 'ws://localhost:4000/ws';
}

