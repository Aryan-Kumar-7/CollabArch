import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ComponentType,
  CanvasNode,
  CanvasEdge,
  NetworkProtocol,
  NodeData,
  DEFAULT_COMPONENT_CONFIGS,
  ArchitectureReviewResult,
  ArchitectureFinding,
  ReviewSeverity,
  ReviewCategory,
  AutoTuneTelemetry,
  AutoTuneAdjustment,
  AutoTuneResult,
} from '@collabarch/shared-types';
import { RoomManagerService } from '../gateway/room-manager.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import { uint8ArrayToBase64 } from '../gateway/binary.util';

export interface ArchitectureResponse {
  title: string;
  summary: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface WhiteboardResponse {
  title: string;
  summary: string;
  elements: any[]; // ExcalidrawElement[]
}

interface RawWhiteboardDiagram {
  title: string;
  summary: string;
  nodes: Array<{
    id: string;
    shape: 'rectangle' | 'ellipse' | 'diamond';
    label: string;
    color?: 'blue' | 'purple' | 'green' | 'amber' | 'rose' | 'slate';
  }>;
  connections: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
}

interface RawGeminiArchitecture {
  title: string;
  summary: string;
  nodes: Array<{
    id: string;
    type: ComponentType;
    label: string;
    capacityRps: number;
    latencyMs: number;
    description: string;
    engine?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    protocol: NetworkProtocol;
  }>;
}

const ALLOWED_COMPONENT_TYPES: ComponentType[] = [
  'api-gateway',
  'load-balancer',
  'websocket',
  'cdn',
  'service',
  'serverless',
  'auth',
  'external-api',
  'database',
  'nosql',
  'cache',
  'storage',
  'vector-db',
  'search',
  'queue',
];

const ALLOWED_PROTOCOLS: NetworkProtocol[] = ['HTTP', 'gRPC', 'AMQP', 'TCP', 'WebSocket'];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly roomManager: RoomManagerService,
    private readonly redisPubSub: RedisPubSubService
  ) {}

  /**
   * Generates a complete distributed architecture diagram using Google Gemini API,
   * performs topological layered auto-layout, and synchronizes into Yjs CRDT room.
   */
  async generateArchitecture(prompt: string, roomSlug?: string): Promise<ArchitectureResponse> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new BadRequestException('Prompt description is required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not defined in environment');
      throw new BadRequestException(
        'GEMINI_API_KEY is not configured in apps/server/.env. Please add your Google Gemini API key to proceed.'
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Model candidate list prioritizing latest fast flash models
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter(Boolean) as string[];

    let rawData: RawGeminiArchitecture | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        this.logger.log(`[AiService] Generating architecture with Gemini model "${model}"...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: `You are an expert Principal Cloud Solutions Architect and Distributed Systems Engineer.
Your task is to design robust, high-performance, resilient, and scalable software architectures based on user requirements.
You must produce a valid architecture composed strictly of the 15 allowed component types:
- Ingress/Edge (Layer 0): 'api-gateway', 'load-balancer', 'websocket', 'cdn'
- Compute & Logic (Layer 1): 'service', 'serverless', 'auth', 'external-api'
- State, Storage & Queues (Layer 2): 'database', 'nosql', 'cache', 'storage', 'vector-db', 'search', 'queue'

Design rules:
1. Provide realistic component names, capacities in Requests Per Second (capacityRps), and base latencies in milliseconds (latencyMs) according to Little's Law and cloud architecture best practices.
2. Provide engines where appropriate (e.g. "PostgreSQL", "Redis", "Kafka", "DynamoDB", "Elasticsearch", "Pinecone", "S3", "Go/gRPC").
3. Connect components using realistic directed edges and appropriate protocols ('HTTP' | 'gRPC' | 'AMQP' | 'TCP' | 'WebSocket').
4. The architecture should be cohesive: ingress routes to compute; compute accesses databases, caches, queues, and external APIs. Ensure all edge references point to valid node IDs.
5. Provide a clear, professional title and a concise 1-2 sentence architectural summary explaining your choices.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'Descriptive title of the generated architecture, e.g. "Uber Real-Time Ridesharing Backend"',
                },
                summary: {
                  type: Type.STRING,
                  description: '1-2 sentence architectural summary explaining key design choices and Little\'s Law sizing',
                },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: 'Unique node ID, e.g. "node-gateway", "node-order-svc"' },
                      type: {
                        type: Type.STRING,
                        enum: ALLOWED_COMPONENT_TYPES,
                        description: 'Component type strictly from the allowed 15 types',
                      },
                      label: { type: Type.STRING, description: 'Display name, e.g. "Ride Dispatch Service"' },
                      capacityRps: { type: Type.INTEGER, description: 'Max sustained RPS capacity' },
                      latencyMs: { type: Type.INTEGER, description: 'Mean response latency in ms' },
                      description: { type: Type.STRING, description: 'Brief description of component role' },
                      engine: { type: Type.STRING, description: 'Engine/technology, e.g. "Redis", "PostgreSQL", "Kafka"' },
                    },
                    required: ['id', 'type', 'label', 'capacityRps', 'latencyMs', 'description'],
                  },
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source: { type: Type.STRING, description: 'Source node ID' },
                      target: { type: Type.STRING, description: 'Target node ID' },
                      protocol: {
                        type: Type.STRING,
                        enum: ALLOWED_PROTOCOLS,
                        description: 'Communication network protocol between components',
                      },
                    },
                    required: ['source', 'target', 'protocol'],
                  },
                },
              },
              required: ['title', 'summary', 'nodes', 'edges'],
            },
          },
        });

        const text = response.text;
        if (text) {
          rawData = JSON.parse(text) as RawGeminiArchitecture;
          this.logger.log(
            `[AiService] Gemini successfully generated "${rawData.title}" with ${rawData.nodes?.length} nodes and ${rawData.edges?.length} edges.`
          );
          break;
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`[AiService] Model "${model}" failed: ${err?.message || err}. Trying next fallback...`);
      }
    }

    if (!rawData) {
      this.logger.error(`[AiService] All Gemini models failed:`, lastError);
      throw this.formatAiError(
        lastError,
        'Failed to generate architecture with Google Gemini API'
      );
    }

    // 1. Topological Auto-Layout Algorithm
    const { nodes, edges } = this.applyTopologicalLayout(rawData.nodes, rawData.edges);

    const architecture: ArchitectureResponse = {
      title: rawData.title || 'Generated Distributed Architecture',
      summary: rawData.summary || 'Architecture generated with Google Gemini API.',
      nodes,
      edges,
    };

    // 2. Multi-Peer Live CRDT Synchronization
    if (roomSlug) {
      await this.syncToRoom(roomSlug, architecture);
    }

    return architecture;
  }

  /**
   * Topological Auto-Layout Algorithm
   * Categorizes nodes into 3 distinct architectural layers:
   * - Layer 0 (Ingress / Edge): cdn, load-balancer, api-gateway, websocket -> x = 60
   * - Layer 1 (Compute & Logic): service, serverless, auth, external-api -> x = 520
   * - Layer 2 (State, Storage & Queues): cache, database, nosql, storage, vector-db, search, queue -> x = 980
   * Nodes within each layer are spaced vertically: y = 80 + (index * 280)
   */
  private applyTopologicalLayout(
    rawNodes: RawGeminiArchitecture['nodes'] = [],
    rawEdges: RawGeminiArchitecture['edges'] = []
  ): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
    const layerIndices = { 0: 0, 1: 0, 2: 0 };
    const layerX = { 0: 60, 1: 520, 2: 980 };

    const getLayer = (type: ComponentType): 0 | 1 | 2 => {
      if (['cdn', 'load-balancer', 'api-gateway', 'websocket'].includes(type)) return 0;
      if (['service', 'serverless', 'auth', 'external-api'].includes(type)) return 1;
      return 2;
    };

    const nodes: CanvasNode[] = rawNodes.map((rawNode, rawIdx) => {
      // Validate type or fallback to service
      const type: ComponentType = ALLOWED_COMPONENT_TYPES.includes(rawNode.type)
        ? rawNode.type
        : 'service';

      const layer = getLayer(type);
      const indexInLayer = layerIndices[layer]++;

      const position = {
        x: layerX[layer],
        y: 80 + indexInLayer * 280,
      };

      const defaultConfig = DEFAULT_COMPONENT_CONFIGS[type]?.defaultData;
      const nodeId = rawNode.id || `node-${type}-${rawIdx + 1}`;

      const nodeData: NodeData = {
        label: rawNode.label || defaultConfig?.label || type,
        capacityRps: Number(rawNode.capacityRps) || defaultConfig?.capacityRps || 2500,
        latencyMs: Number(rawNode.latencyMs) || defaultConfig?.latencyMs || 25,
        queueDepthLimit: defaultConfig?.queueDepthLimit || 1000,
        failureRate: defaultConfig?.failureRate || 0.001,
        description: rawNode.description || defaultConfig?.description || '',
        tags: defaultConfig?.tags || [type],
        ...(rawNode.engine ? { engine: rawNode.engine } : {}),
      };

      return {
        id: nodeId,
        type,
        position,
        data: nodeData,
      };
    });

    const validNodeIds = new Set(nodes.map((n) => n.id));

    const edges: CanvasEdge[] = rawEdges
      .filter((rawEdge) => validNodeIds.has(rawEdge.source) && validNodeIds.has(rawEdge.target))
      .map((rawEdge, edgeIdx) => {
        const protocol: NetworkProtocol = ALLOWED_PROTOCOLS.includes(rawEdge.protocol)
          ? rawEdge.protocol
          : 'HTTP';

        let defaultLatency = 5;
        let defaultBandwidth = 3000;

        switch (protocol) {
          case 'gRPC':
            defaultLatency = 3;
            defaultBandwidth = 5000;
            break;
          case 'TCP':
            defaultLatency = 2;
            defaultBandwidth = 2500;
            break;
          case 'AMQP':
            defaultLatency = 2;
            defaultBandwidth = 8000;
            break;
          case 'WebSocket':
            defaultLatency = 2;
            defaultBandwidth = 6000;
            break;
          case 'HTTP':
          default:
            defaultLatency = 5;
            defaultBandwidth = 4000;
            break;
        }

        return {
          id: `edge-${rawEdge.source}-${rawEdge.target}-${edgeIdx}`,
          source: rawEdge.source,
          target: rawEdge.target,
          animated: true,
          data: {
            protocol,
            latencyMs: defaultLatency,
            bandwidthLimitRps: defaultBandwidth,
          },
        };
      });

    return { nodes, edges };
  }

  /**
   * Transacts generated architecture directly into the active room's Y.Doc (CRDT)
   * and broadcasts real-time differential updates to connected peers.
   */
  private async syncToRoom(roomSlug: string, architecture: ArchitectureResponse): Promise<void> {
    try {
      let room = this.roomManager.getRoom(roomSlug);
      if (!room) {
        room = await this.roomManager.getOrCreateRoom(roomSlug);
      }

      if (!room) {
        this.logger.warn(`[AiService] Room "${roomSlug}" could not be retrieved or initialized for CRDT sync.`);
        return;
      }

      const yNodes = room.doc.getMap<CanvasNode>('nodes');
      const yEdges = room.doc.getMap<CanvasEdge>('edges');

      let updateDiff: Uint8Array | null = null;
      const captureUpdate = (update: Uint8Array) => {
        updateDiff = update;
      };

      room.doc.on('update', captureUpdate);
      try {
        room.doc.transact(() => {
          // Clear previous canvas elements and populate AI generated ones
          yNodes.clear();
          yEdges.clear();

          for (const node of architecture.nodes) {
            if (node && node.id) {
              yNodes.set(node.id, node);
            }
          }
          for (const edge of architecture.edges) {
            if (edge && edge.id) {
              yEdges.set(edge.id, edge);
            }
          }
        }, 'ai-generation');
      } finally {
        room.doc.off('update', captureUpdate);
      }

      if (updateDiff) {
        const payloadBase64 = uint8ArrayToBase64(updateDiff);

        // Broadcast binary differential update to locally connected sockets
        this.roomManager.broadcastToRoom(roomSlug, {
          event: 'sync-message',
          data: {
            type: 'sync-update',
            roomId: roomSlug,
            payload: payloadBase64,
          },
        });

        // Broadcast through Redis Pub/Sub mesh to other cluster nodes
        try {
          await this.redisPubSub.publishUpdate(roomSlug, {
            roomId: roomSlug,
            type: 'sync-update',
            payload: payloadBase64,
            originSocketId: 'server-ai',
            originUserId: 'ai-architect',
            timestamp: Date.now(),
          });
        } catch (redisErr) {
          this.logger.warn(`[AiService] Could not publish AI update to Redis mesh:`, redisErr);
        }
      }

      // Broadcast custom architecture-generated event
      this.roomManager.broadcastToRoom(roomSlug, {
        event: 'architecture-generated',
        data: architecture,
      });

      // Trigger trailing debounced snapshot auto-save to PostgreSQL
      this.roomManager.scheduleRoomSnapshot(roomSlug);

      this.logger.log(
        `[AiService] CRDT synchronized architecture into room "${roomSlug}" (${architecture.nodes.length} nodes, ${architecture.edges.length} edges).`
      );
    } catch (syncErr: any) {
      this.logger.error(`[AiService] Error synchronizing architecture to room "${roomSlug}":`, syncErr);
    }
  }

  /**
   * Generates a freehand flowchart/diagram using Google Gemini,
   * converts semantic nodes to valid Excalidraw elements, and syncs into Yjs CRDT room.
   */
  async generateWhiteboardDiagram(prompt: string, roomSlug?: string): Promise<WhiteboardResponse> {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new BadRequestException('Prompt description is required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY is not configured in apps/server/.env.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter(Boolean) as string[];

    let rawData: RawWhiteboardDiagram | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        this.logger.log(`[AiService] Generating whiteboard diagram with model "${model}"...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: `You are an expert Software Architect and Technical Visualizer.
Your task is to design clear, intuitive technical diagrams, flowcharts, sequence diagrams, and architecture sketches for a whiteboard.
Produce a structured diagram with 4 to 12 clear steps/nodes and connections.
Assign shapes:
- 'rectangle' for processes, services, actors, clients
- 'ellipse' for databases, start/end terminals, caches
- 'diamond' for conditional decisions or branches
Assign colors from: 'blue', 'purple', 'green', 'amber', 'rose', 'slate'.
Ensure every connection 'from' and 'to' refers to a valid node 'id'.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      shape: { type: Type.STRING, enum: ['rectangle', 'ellipse', 'diamond'] },
                      label: { type: Type.STRING },
                      color: { type: Type.STRING, enum: ['blue', 'purple', 'green', 'amber', 'rose', 'slate'] },
                    },
                    required: ['id', 'shape', 'label'],
                  },
                },
                connections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      from: { type: Type.STRING },
                      to: { type: Type.STRING },
                      label: { type: Type.STRING },
                    },
                    required: ['from', 'to'],
                  },
                },
              },
              required: ['title', 'summary', 'nodes', 'connections'],
            },
          },
        });

        if (response.text) {
          rawData = JSON.parse(response.text) as RawWhiteboardDiagram;
          break;
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`[AiService] Whiteboard model "${model}" failed: ${err?.message || err}.`);
      }
    }

    if (!rawData) {
      throw this.formatAiError(lastError, 'Failed to generate whiteboard diagram.');
    }

    // Convert semantic nodes & connections into Excalidraw Elements
    const elements = this.convertToExcalidrawElements(rawData);

    // Sync to Yjs CRDT room if roomSlug is present
    if (roomSlug) {
      await this.syncWhiteboardToRoom(roomSlug, elements);
    }

    return {
      title: rawData.title || 'Generated Whiteboard Diagram',
      summary: rawData.summary || 'Whiteboard diagram synthesized with Google Gemini.',
      elements,
    };
  }

  private convertToExcalidrawElements(data: RawWhiteboardDiagram): any[] {
    const elements: any[] = [];
    const nodeMap = new Map<string, { x: number; y: number; w: number; h: number }>();

    const colorPalette: Record<string, { bg: string; stroke: string }> = {
      blue: { bg: '#dbeafe', stroke: '#2563eb' },
      purple: { bg: '#f3e8ff', stroke: '#7c3aed' },
      green: { bg: '#dcfce7', stroke: '#16a34a' },
      amber: { bg: '#fef3c7', stroke: '#d97706' },
      rose: { bg: '#ffe4e6', stroke: '#e11d48' },
      slate: { bg: '#f1f5f9', stroke: '#475569' },
    };

    const startX = 120;
    const startY = 120;
    const nodeWidth = 200;
    const nodeHeight = 85;
    const gapX = 100;
    const gapY = 140;

    // Grid layout (max 4 columns)
    data.nodes.forEach((node, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = startX + col * (nodeWidth + gapX);
      const y = startY + row * (nodeHeight + gapY);
      const shapeType = node.shape === 'ellipse' ? 'ellipse' : node.shape === 'diamond' ? 'diamond' : 'rectangle';
      const colors = colorPalette[node.color || 'blue'] || colorPalette.blue;

      const shapeId = `excal-${node.id}`;
      const textId = `text-${node.id}`;

      nodeMap.set(node.id, { x, y, w: nodeWidth, h: nodeHeight });

      // 1. Shape container
      elements.push({
        id: shapeId,
        type: shapeType,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        angle: 0,
        strokeColor: colors.stroke,
        backgroundColor: colors.bg,
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: [{ id: textId, type: 'text' }],
        updated: Date.now(),
        link: null,
        locked: false,
      });

      // 2. Bound Text label
      elements.push({
        id: textId,
        type: 'text',
        x: x + 10,
        y: y + nodeHeight / 2 - 10,
        width: nodeWidth - 20,
        height: 20,
        angle: 0,
        strokeColor: '#0f172a',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        text: node.label || 'Step',
        fontSize: 14,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: shapeId,
        originalText: node.label || 'Step',
        lineHeight: 1.25,
        updated: Date.now(),
        link: null,
        locked: false,
      });
    });

    // 3. Directed Arrows
    data.connections.forEach((conn, connIdx) => {
      const fromNode = nodeMap.get(conn.from);
      const toNode = nodeMap.get(conn.to);
      if (!fromNode || !toNode) return;

      const startX = fromNode.x + fromNode.w / 2;
      const startY = fromNode.y + fromNode.h;
      const endX = toNode.x + toNode.w / 2;
      const endY = toNode.y;

      elements.push({
        id: `arrow-${conn.from}-${conn.to}-${connIdx}`,
        type: 'arrow',
        x: startX,
        y: startY,
        width: endX - startX,
        height: endY - startY,
        angle: 0,
        strokeColor: '#64748b',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: { type: 2 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        points: [
          [0, 0],
          [endX - startX, endY - startY],
        ],
        startBinding: { elementId: `excal-${conn.from}`, focus: 0, gap: 4 },
        endBinding: { elementId: `excal-${conn.to}`, focus: 0, gap: 4 },
        startArrowhead: null,
        endArrowhead: 'arrow',
        updated: Date.now(),
        link: null,
        locked: false,
      });
    });

    return elements;
  }

  private async syncWhiteboardToRoom(roomSlug: string, elements: any[]): Promise<void> {
    try {
      let room = this.roomManager.getRoom(roomSlug);
      if (!room) room = await this.roomManager.getOrCreateRoom(roomSlug);
      if (!room) return;

      const yElements = room.doc.getMap<any>('excalidraw-elements');
      const yWhiteboard = room.doc.getMap<any>('whiteboard_elements');
      let updateDiff: Uint8Array | null = null;
      const capture = (u: Uint8Array) => {
        updateDiff = u;
      };
      room.doc.on('update', capture);
      try {
        room.doc.transact(() => {
          for (const el of elements) {
            yElements.set(el.id, el);
            yWhiteboard.set(el.id, el);
          }
        }, 'ai-whiteboard-generation');
      } finally {
        room.doc.off('update', capture);
      }

      if (updateDiff) {
        const payloadBase64 = uint8ArrayToBase64(updateDiff);
        this.roomManager.broadcastToRoom(roomSlug, {
          event: 'sync-message',
          data: { type: 'sync-update', roomId: roomSlug, payload: payloadBase64 },
        });
        try {
          await this.redisPubSub.publishUpdate(roomSlug, {
            roomId: roomSlug,
            type: 'sync-update',
            payload: payloadBase64,
            originSocketId: 'server-ai',
            originUserId: 'ai-whiteboard',
            timestamp: Date.now(),
          });
        } catch {}
      }
      this.roomManager.scheduleRoomSnapshot(roomSlug);
    } catch (err) {
      this.logger.error(`[AiService] Failed syncing whiteboard elements to room:`, err);
    }
  }

  /**
   * Evaluates active canvas architecture against distributed systems reliability patterns,
   * Little's Law capacities, and security boundaries using Google Gemini.
   */
  async reviewArchitecture(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    roomSlug?: string
  ): Promise<ArchitectureReviewResult> {
    if (!nodes || nodes.length === 0) {
      throw new BadRequestException('Canvas has no nodes to evaluate.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY is not configured in apps/server/.env.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter(Boolean) as string[];

    // Prepare a compact topology payload for the LLM
    const topologyContext = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label || n.type,
        capacityRps: n.data?.capacityRps,
        latencyMs: n.data?.latencyMs,
        engine: n.data?.engine,
        replicas: n.data?.replicas,
        boundaryType: n.data?.boundaryType,
      })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
        protocol: e.data?.protocol || 'HTTP',
      })),
    };

    let reviewData: ArchitectureReviewResult | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        this.logger.log(`[AiService] Reviewing architecture with model "${model}"...`);
        const response = await ai.models.generateContent({
          model,
          contents: JSON.stringify(topologyContext),
          config: {
            systemInstruction: `You are a Principal Distributed Systems and Site Reliability Solutions Architect.
Audit the provided cloud architecture topology against enterprise production standards:
1. Resilience & SPOFs: Identify any single points of failure without redundancy (e.g. single database, single service instance).
2. Performance & Little's Law: Detect capacity mismatches where an upstream node pushes higher RPS than a downstream node can handle, or slow synchronous DB calls block client threads.
3. Caching: Identify high-throughput read paths missing a Redis/Memcached cache layer.
4. Queuing: Identify bursty ingress or 3rd-party external API calls that lack message queue buffers (Kafka/RabbitMQ).
5. Security: Identify direct exposure of databases or internal services to edge gateways without auth or VPC boundaries.
6. Strengths: Acknowledge well-designed patterns.

Scoring Rules:
- Start from 100. Deduct 15-20 points per Critical SPOF, 8-12 per Warning, add 0 for Strengths.
- Minimum score: 20, Maximum: 100.
- Reference exact node IDs in 'affectedNodeIds'.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                healthScore: { type: Type.INTEGER, description: 'Overall system health score between 0 and 100' },
                summary: { type: Type.STRING, description: '2-sentence executive summary of architecture quality' },
                findings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      severity: { type: Type.STRING, enum: ['critical', 'warning', 'info', 'strength'] },
                      category: { type: Type.STRING, enum: ['resilience', 'performance', 'caching', 'queuing', 'security'] },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      recommendation: { type: Type.STRING },
                      affectedNodeIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['id', 'severity', 'category', 'title', 'description', 'recommendation', 'affectedNodeIds'],
                  },
                },
              },
              required: ['healthScore', 'summary', 'findings'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          reviewData = {
            healthScore: Math.min(100, Math.max(0, parsed.healthScore ?? 75)),
            summary: parsed.summary || 'Architecture review completed.',
            findings: parsed.findings || [],
            evaluatedNodeCount: nodes.length,
            evaluatedEdgeCount: edges.length,
            reviewedAt: Date.now(),
          };
          break;
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`[AiService] Review model "${model}" failed: ${err?.message || err}.`);
      }
    }

    if (!reviewData) {
      throw this.formatAiError(lastError, 'Failed to review architecture.');
    }

    return reviewData;
  }

  /**
   * Superpower 3: AI Capacity Auto-Tuner & Simulation AI
   * Analyzes live discrete-event simulation telemetry (ingress RPS, queue saturation, p99 latency, packet drop rate)
   * and computes Little's Law capacity upgrades (replicas, cache hit ratio, queue depth limit, capacity RPS).
   */
  async autoTuneCapacity(
    payload: {
      nodes: CanvasNode[];
      edges: CanvasEdge[];
      telemetry: AutoTuneTelemetry;
    },
    roomSlug?: string
  ): Promise<AutoTuneResult> {
    const { nodes, edges, telemetry } = payload;

    if (!nodes || nodes.length === 0) {
      throw new BadRequestException('Canvas has no nodes to auto-tune.');
    }

    if (!telemetry) {
      throw new BadRequestException('Simulation telemetry is required for auto-tuning.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is missing. Using Little\'s Law deterministic auto-tune engine.');
      const fallback = this.computeDeterministicAutoTuneFallback(payload);
      if (roomSlug) {
        await this.syncAdjustmentsToRoom(roomSlug, fallback.adjustments);
      }
      return fallback;
    }

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter(Boolean) as string[];

    const telemetryContext = {
      telemetry: {
        ingressRps: telemetry.ingressRps,
        currentThroughputRps: telemetry.currentThroughputRps,
        p99LatencyMs: telemetry.p99LatencyMs,
        dropRatePct: telemetry.dropRatePct,
        bottleneckNodeIds: telemetry.bottleneckNodeIds || [],
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label || n.type,
        capacityRps: n.data?.capacityRps,
        latencyMs: n.data?.latencyMs,
        queueDepthLimit: n.data?.queueDepthLimit,
        replicas: n.data?.replicas,
        cacheHitRatio: n.data?.cacheHitRatio,
        engine: n.data?.engine,
      })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
        protocol: e.data?.protocol || 'HTTP',
      })),
    };

    let result: AutoTuneResult | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        this.logger.log(`[AiService] Auto-tuning simulation capacity with model "${model}"...`);
        const response = await ai.models.generateContent({
          model,
          contents: JSON.stringify(telemetryContext),
          config: {
            systemInstruction: `You are an expert Principal Site Reliability Engineer (SRE) and Distributed Systems Capacity Architect.
Your task is to inspect live discrete-event network simulation telemetry (Ingress RPS, queue saturation, p99 latency, and packet drop rate) and calculate precise Little's Law capacity upgrades across canvas nodes to eliminate packet drops and normalize latency.

Little's Law Principles:
- Little's Law: L = λ * W (Average queue length = arrival rate * waiting time).
- When arrival rate (ingressRps) exceeds node processing service rate (capacityRps), queue buffers fill to capacity and cause tail drops (dropRatePct > 0) and high p99 latency.
- To maintain queue stability and prevent buffer bloat or tail drops under stochastic Poisson traffic, utilization ρ = λ / (k * μ) must satisfy ρ <= 0.75, where k is replicas and μ is single-replica capacity.

Optimization Rules:
1. Scale Compute Service Replicas:
   - For saturated compute services ('service', 'serverless', 'auth', etc.), calculate required replicas:
     replicas = ceil(ingressRps / (individualCapacity * 0.75)).
     Ensure ingressRps / replicas <= individualCapacity.
2. Redis Cache Hit Ratio & Offloading:
   - For cache nodes ('cache') or database read paths, set cacheHitRatio to 0.85 (85% hit ratio) to absorb DB read spikes, reducing downstream database load by up to 85%.
3. Ingress & Gateways:
   - For 'api-gateway', 'load-balancer', or edge ingress nodes, upgrade capacityRps to >= ingressRps * 1.3 and queueDepthLimit >= 2500.
4. Queue Depth Buffers:
   - Increase queueDepthLimit (e.g. 1500 to 5000) for nodes handling high concurrency or Poisson bursts to eliminate drop-tail queue overflow.
5. Provide technical rationale for each change:
   - Reference Little's Law math, arrival rate vs service rate, and queue saturation.
6. Predict post-tuning outcomes:
   - predictedDropRatePct: 0 (or <= 0.1% under optimal capacity).
   - predictedP99Ms: expected normalized p99 latency in milliseconds (typically 15-45ms under optimal capacity).
7. SRE Executive Summary:
   - Provide a concise 1-2 sentence executive explanation of the root cause bottleneck and the Little's Law capacity resolution.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: '1-2 sentence SRE explanation of the bottleneck and Little\'s Law resolution',
                },
                predictedDropRatePct: {
                  type: Type.NUMBER,
                  description: 'Expected packet drop rate percentage after applying adjustments (e.g. 0)',
                },
                predictedP99Ms: {
                  type: Type.NUMBER,
                  description: 'Expected p99 latency in ms after applying adjustments (e.g. 25)',
                },
                adjustments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nodeId: { type: Type.STRING, description: 'Target canvas node ID' },
                      nodeLabel: { type: Type.STRING, description: 'Display name of the node' },
                      changes: {
                        type: Type.OBJECT,
                        properties: {
                          capacityRps: { type: Type.INTEGER, description: 'Upgraded capacity in RPS' },
                          replicas: { type: Type.INTEGER, description: 'Scaled replica count' },
                          cacheHitRatio: { type: Type.NUMBER, description: 'Cache hit ratio between 0.0 and 1.0' },
                          queueDepthLimit: { type: Type.INTEGER, description: 'Upgraded queue depth limit' },
                        },
                      },
                      rationale: { type: Type.STRING, description: 'Technical Little\'s Law SRE rationale' },
                    },
                    required: ['nodeId', 'nodeLabel', 'changes', 'rationale'],
                  },
                },
              },
              required: ['summary', 'predictedDropRatePct', 'predictedP99Ms', 'adjustments'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          result = {
            summary: parsed.summary || 'Capacity auto-tuning recommendations computed with Little\'s Law.',
            predictedDropRatePct: Math.max(0, Number(parsed.predictedDropRatePct) || 0),
            predictedP99Ms: Math.max(1, Math.round(Number(parsed.predictedP99Ms) || 25)),
            adjustments: (parsed.adjustments || []).map((adj: any) => ({
              nodeId: adj.nodeId,
              nodeLabel: adj.nodeLabel || adj.nodeId,
              changes: {
                ...(adj.changes?.capacityRps !== undefined ? { capacityRps: Number(adj.changes.capacityRps) } : {}),
                ...(adj.changes?.replicas !== undefined ? { replicas: Number(adj.changes.replicas) } : {}),
                ...(adj.changes?.cacheHitRatio !== undefined ? { cacheHitRatio: Number(adj.changes.cacheHitRatio) } : {}),
                ...(adj.changes?.queueDepthLimit !== undefined ? { queueDepthLimit: Number(adj.changes.queueDepthLimit) } : {}),
              },
              rationale: adj.rationale || 'Little\'s Law capacity upgrade to prevent queue saturation.',
            })),
          };
          break;
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`[AiService] AutoTune model "${model}" failed: ${err?.message || err}.`);
      }
    }

    if (!result || !result.adjustments || result.adjustments.length === 0) {
      this.logger.warn(`[AiService] Gemini model calls failed or returned empty adjustments. Using deterministic SRE fallback. Error:`, lastError);
      result = this.computeDeterministicAutoTuneFallback(payload);
    }

    if (roomSlug && result.adjustments.length > 0) {
      await this.syncAdjustmentsToRoom(roomSlug, result.adjustments);
    }

    return result;
  }

  /**
   * Deterministic Little's Law SRE Auto-Tune Fallback Engine
   * Mathematically computes queue-draining adjustments based on arrival rate λ and bottleneck nodes.
   */
  private computeDeterministicAutoTuneFallback(payload: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    telemetry: AutoTuneTelemetry;
  }): AutoTuneResult {
    const { nodes, telemetry } = payload;
    const targetIngress = Math.max(telemetry.ingressRps, telemetry.currentThroughputRps, 5000);
    const bottleneckSet = new Set(telemetry.bottleneckNodeIds || []);
    const adjustments: AutoTuneAdjustment[] = [];

    for (const node of nodes) {
      const isBottleneck = bottleneckSet.has(node.id);
      const isIngress = node.type === 'api-gateway' || node.type === 'load-balancer';
      const isCompute = node.type === 'service' || node.type === 'serverless' || node.type === 'auth';
      const isCache = node.type === 'cache';
      const isDatabase = node.type === 'database' || node.type === 'nosql';

      if (isCompute) {
        const singleCapacity = node.data?.capacityRps || 1000;
        const requiredReplicas = Math.max(3, Math.ceil(targetIngress / (singleCapacity * 0.75)));
        adjustments.push({
          nodeId: node.id,
          nodeLabel: node.data?.label || node.id,
          changes: {
            replicas: requiredReplicas,
            queueDepthLimit: Math.max(node.data?.queueDepthLimit || 500, 2500),
          },
          rationale: `Little's Law indicates arrival rate λ=${targetIngress} RPS exceeds single-instance capacity (${singleCapacity} RPS). Scaling to ${requiredReplicas} replicas satisfies λ / k <= individualCapacity with 25% safety headroom.`,
        });
      } else if (isCache) {
        adjustments.push({
          nodeId: node.id,
          nodeLabel: node.data?.label || node.id,
          changes: {
            cacheHitRatio: 0.85,
            capacityRps: Math.max(node.data?.capacityRps || 2000, Math.round(targetIngress * 1.2)),
            queueDepthLimit: Math.max(node.data?.queueDepthLimit || 500, 3000),
          },
          rationale: `Configured Redis cache hit ratio to 85% to absorb upstream read spikes and reduce downstream database traffic by 85%.`,
        });
      } else if (isIngress && (isBottleneck || (node.data?.capacityRps || 5000) < targetIngress * 1.2)) {
        const upgradedCap = Math.max(node.data?.capacityRps || 5000, Math.round(targetIngress * 1.4));
        adjustments.push({
          nodeId: node.id,
          nodeLabel: node.data?.label || node.id,
          changes: {
            capacityRps: upgradedCap,
            queueDepthLimit: 5000,
          },
          rationale: `Upgraded ingress throughput capacity to ${upgradedCap} RPS and expanded queue depth to 5,000 to eliminate edge packet drops under burst conditions.`,
        });
      } else if (isDatabase && isBottleneck) {
        adjustments.push({
          nodeId: node.id,
          nodeLabel: node.data?.label || node.id,
          changes: {
            replicas: Math.max(node.data?.replicas || 1, 3),
            capacityRps: Math.max(node.data?.capacityRps || 1000, Math.round(targetIngress * 0.3)),
            queueDepthLimit: 2000,
          },
          rationale: `Added read replicas and expanded database connection pool to eliminate query queuing delays.`,
        });
      }
    }

    return {
      summary: `Identified queue saturation under ${targetIngress.toLocaleString()} RPS ingress traffic. Applied Little's Law replica scaling and 85% cache hit ratio absorption to eliminate tail drops.`,
      predictedDropRatePct: 0,
      predictedP99Ms: 24,
      adjustments,
    };
  }

  /**
   * Synchronizes applied auto-tune node adjustments directly into the Yjs CRDT room
   * and broadcasts the binary update diff to all connected collaborative peers.
   */
  async syncAdjustmentsToRoom(roomSlug: string, adjustments: AutoTuneAdjustment[]): Promise<void> {
    try {
      let room = this.roomManager.getRoom(roomSlug);
      if (!room) room = await this.roomManager.getOrCreateRoom(roomSlug);
      if (!room) return;

      const yNodes = room.doc.getMap<CanvasNode>('nodes');
      let updateDiff: Uint8Array | null = null;
      const capture = (u: Uint8Array) => {
        updateDiff = u;
      };
      room.doc.on('update', capture);
      try {
        room.doc.transact(() => {
          for (const adj of adjustments) {
            const existing = yNodes.get(adj.nodeId);
            if (existing) {
              yNodes.set(adj.nodeId, {
                ...existing,
                data: {
                  ...existing.data,
                  ...adj.changes,
                },
              });
            }
          }
        }, 'ai-auto-tune');
      } finally {
        room.doc.off('update', capture);
      }

      if (updateDiff) {
        const payloadBase64 = uint8ArrayToBase64(updateDiff);
        this.roomManager.broadcastToRoom(roomSlug, {
          event: 'sync-message',
          data: { type: 'sync-update', roomId: roomSlug, payload: payloadBase64 },
        });
        try {
          await this.redisPubSub.publishUpdate(roomSlug, {
            roomId: roomSlug,
            type: 'sync-update',
            payload: payloadBase64,
            originSocketId: 'server-ai-autotune',
            originUserId: 'ai-sre-autotune',
            timestamp: Date.now(),
          });
        } catch {}
      }
      this.roomManager.scheduleRoomSnapshot(roomSlug);
    } catch (err) {
      this.logger.error(`[AiService] Failed syncing auto-tune adjustments to room "${roomSlug}":`, err);
    }
  }

  private formatAiError(err: any, fallbackMessage: string): Error {
    const msg = err?.message || String(err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return new BadRequestException(
        'Google Gemini rate limit reached. Please wait 30 seconds before generating again.'
      );
    }
    if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
      return new InternalServerErrorException(
        'AI service is currently experiencing high demand. Please try again shortly.'
      );
    }
    return new InternalServerErrorException(fallbackMessage || msg);
  }
}


