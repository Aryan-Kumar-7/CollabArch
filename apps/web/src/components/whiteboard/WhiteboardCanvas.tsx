'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';
import * as Y from 'yjs';
import { Loader2, Users, Wifi, WifiOff } from 'lucide-react';
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles,
  Collaborator,
  SocketId,
} from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useCanvasStore, type CollaboratorPresence } from '@/store/canvas-store';

// Dynamically import Excalidraw with SSR disabled to prevent 'window is not defined'
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <span className="text-sm font-medium tracking-wide">
          Loading Freehand Whiteboard Canvas...
        </span>
      </div>
    ),
  }
);

interface WhiteboardCanvasProps {
  roomId?: string;
  userName?: string;
  userColor?: string;
  wsUrl?: string;
}

// Browser-safe Base64 <-> Uint8Array utilities
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Persistent User ID to survive remounts and mode switches without duplicate registration
function getPersistentUserId(): string {
  if (typeof window === 'undefined') {
    return 'user-local';
  }
  let id = sessionStorage.getItem('collabarch_user_id');
  if (!id) {
    id = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    sessionStorage.setItem('collabarch_user_id', id);
  }
  return id;
}

export function WhiteboardCanvas({
  roomId = 'demo-room',
  userName = 'Architect',
  userColor = '#38bdf8',
  wsUrl,
}: WhiteboardCanvasProps) {
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [peerCount, setPeerCount] = useState<number>(1);

  // Yjs CRDT Document & Elements Map
  const yDocRef = useRef<Y.Doc | null>(null);
  const yElementsMapRef = useRef<Y.Map<ExcalidrawElement> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Guard against re-broadcasting remote updates in a loop
  const isRemoteUpdatingRef = useRef<boolean>(false);
  const localUserIdRef = useRef<string>(getPersistentUserId());

  // Synchronize peer count to canvas store
  const syncPeerCountToStore = useCallback(
    (count: number) => {
      const safeCount = Math.max(1, count);
      setPeerCount(safeCount);
      const list: CollaboratorPresence[] = [
        {
          userId: localUserIdRef.current,
          userName: `${userName} (You)`,
          color: userColor,
          isCurrentUser: true,
        },
      ];
      for (let i = 1; i < safeCount; i++) {
        list.push({
          userId: `peer-${i}`,
          userName: `Architect ${i + 1}`,
          color: ['#818cf8', '#34d399', '#fbbf24', '#f472b6'][(i - 1) % 4],
          isCurrentUser: false,
        });
      }
      useCanvasStore.getState().setCollaborators(list);
    },
    [userName, userColor]
  );

  // Initialize shared Y.Doc & WebSocket synchronization
  useEffect(() => {
    const doc = new Y.Doc();
    yDocRef.current = doc;
    const yElementsMap = doc.getMap<ExcalidrawElement>('whiteboard_elements');
    yElementsMapRef.current = yElementsMap;

    // Listen to remote changes inside Y.Doc and reconcile into Excalidraw scene
    const handleYjsChange = (event: Y.YMapEvent<ExcalidrawElement>) => {
      if (event.transaction.origin === 'local-canvas-edit') {
        return;
      }

      const api = excalidrawApiRef.current;
      if (!api) return;

      const currentRemoteElements = Array.from(yElementsMap.values());
      if (currentRemoteElements.length === 0) return;

      isRemoteUpdatingRef.current = true;
      api.updateScene({
        elements: currentRemoteElements,
      });

      requestAnimationFrame(() => {
        isRemoteUpdatingRef.current = false;
      });
    };

    yElementsMap.observe(handleYjsChange);

    // Resolve WebSocket endpoint (fallback to localhost:4000 if not specified)
    const socketEndpoint =
      wsUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4000/ws`
        : 'ws://localhost:4000/ws');

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectWebSocket = () => {
      if (isDisposed) return;

      try {
        ws = new WebSocket(socketEndpoint);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) {
            try {
              ws?.close();
            } catch {}
            return;
          }
          setIsConnected(true);

          // Perform Room Handshake with state vector
          const stateVector = Y.encodeStateVector(doc);
          const joinPayload = {
            event: 'join-room',
            data: {
              roomId,
              userId: localUserIdRef.current,
              userName,
              color: userColor,
              stateVector: uint8ArrayToBase64(stateVector),
            },
          };
          ws?.send(JSON.stringify(joinPayload));
        };

        ws.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const message = JSON.parse(event.data);
            const { event: eventName, data } = message;

            if (eventName === 'room-joined') {
              syncPeerCountToStore(data.peerCount || 1);
            } else if (eventName === 'peer-joined') {
              syncPeerCountToStore(data.peerCount || 1);
            } else if (eventName === 'peer-left') {
              syncPeerCountToStore(data.remainingPeerCount || 1);
            } else if (eventName === 'sync-message') {
              const { type, payload } = data;
              if (type === 'sync-step-1') {
                // Server state vector received, send differential step-2
                const serverVector = base64ToUint8Array(payload);
                const diffUpdate = Y.encodeStateAsUpdate(doc, serverVector);
                if (diffUpdate.length > 0) {
                  ws?.send(
                    JSON.stringify({
                      event: 'sync-message',
                      data: {
                        type: 'sync-step-2',
                        roomId,
                        payload: uint8ArrayToBase64(diffUpdate),
                      },
                    })
                  );
                }
              } else if (type === 'sync-step-2' || type === 'sync-update') {
                // Apply remote update to local Y.Doc
                const updateBytes = base64ToUint8Array(payload);
                Y.applyUpdate(doc, updateBytes, 'remote-server');
              } else if (type === 'awareness') {
                // Parse awareness for collaborator cursor display
                try {
                  const awarenessData = typeof payload === 'string' ? JSON.parse(payload) : payload;
                  const api = excalidrawApiRef.current;
                  if (awarenessData && awarenessData.userId !== localUserIdRef.current && api) {
                    const collaborators = new Map<SocketId, Collaborator>();
                    collaborators.set(awarenessData.userId as SocketId, {
                      username: awarenessData.userName || 'Peer Architect',
                      color: {
                        background: awarenessData.color || '#818cf8',
                        stroke: awarenessData.color || '#818cf8',
                      },
                      pointer: awarenessData.cursor
                        ? {
                            x: awarenessData.cursor.x,
                            y: awarenessData.cursor.y,
                            tool: 'pointer',
                          }
                        : undefined,
                    });
                    api.updateScene({ collaborators });
                  }
                } catch {
                  // Ignore awareness parsing errors
                }
              }
            }
          } catch {
            // Not a JSON message or parse error
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Listen to local Y.Doc updates and dispatch to WebSocket
    const handleLocalDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote-server') {
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: 'sync-message',
            data: {
              type: 'sync-update',
              roomId,
              payload: uint8ArrayToBase64(update),
            },
          })
        );
      }
    };

    doc.on('update', handleLocalDocUpdate);

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      doc.off('update', handleLocalDocUpdate);
      yElementsMap.unobserve(handleYjsChange);
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                event: 'leave-room',
                data: { roomId, userId: localUserIdRef.current },
              })
            );
          }
          ws.close();
        } catch {
          // Ignore close error
        }
      }
      doc.destroy();
    };
  }, [roomId, userName, userColor, wsUrl, syncPeerCountToStore]);

  // Handle local drawing changes from Excalidraw UI
  const handleExcalidrawChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (isRemoteUpdatingRef.current) return;

      const yDoc = yDocRef.current;
      const yElementsMap = yElementsMapRef.current;
      if (!yDoc || !yElementsMap) return;

      // Efficiently propagate modified elements into the Y.Map
      yDoc.transact(() => {
        for (const el of elements) {
          const existing = yElementsMap.get(el.id);
          // Only update if element has higher version or was freshly created
          if (!existing || existing.version < el.version) {
            yElementsMap.set(el.id, el);
          }
        }
      }, 'local-canvas-edit');
    },
    []
  );

  // Broadcast cursor presence to peers
  const handlePointerUpdate = useCallback(
    (payload: {
      pointer: { x: number; y: number; tool: 'pointer' | 'laser' };
      button: 'down' | 'up';
    }) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: 'sync-message',
            data: {
              type: 'awareness',
              roomId,
              payload: JSON.stringify({
                userId: localUserIdRef.current,
                userName,
                color: userColor,
                cursor: payload.pointer,
              }),
            },
          })
        );
      }
    },
    [roomId, userName, userColor]
  );

  return (
    <div className="relative flex-1 h-full w-full overflow-hidden bg-slate-950">
      {/* Real-time Collaboration Status Badge */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2 rounded-xl border border-slate-800/90 bg-slate-900/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">Live Sync</span>
            </>
          ) : (
            <>
              <span className="flex h-2 w-2 rounded-full bg-amber-400" />
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-400">Local Only</span>
            </>
          )}
        </div>
        <div className="h-3 w-[1px] bg-slate-800" />
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5 text-sky-400" />
          <span>
            {peerCount} {peerCount === 1 ? 'collaborator' : 'collaborators'}
          </span>
        </div>
      </div>

      {/* Full-bleed Excalidraw Whiteboard Container */}
      <div className="h-full w-full">
        <Excalidraw
          excalidrawAPI={(api) => {
            setExcalidrawApi(api);
            excalidrawApiRef.current = api;
          }}
          onChange={handleExcalidrawChange}
          onPointerUpdate={handlePointerUpdate}
          initialData={{
            appState: {
              theme: 'light',
              viewBackgroundColor: '#ffffff',
              currentItemStrokeColor: '#1e1e1e',
              currentItemBackgroundColor: 'transparent',
              currentItemFillStyle: 'solid',
              currentItemStrokeWidth: 2,
              currentItemRoughness: 1,
              currentItemFontFamily: 1,
              gridSize: 20,
            },
          }}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: { saveFileToDisk: true },
              loadScene: true,
              saveToActiveFile: false,
              toggleTheme: true,
              saveAsImage: true,
            },
          }}
        />
      </div>
    </div>
  );
}
