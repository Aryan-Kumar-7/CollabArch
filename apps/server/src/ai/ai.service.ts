import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ComponentType,
  CanvasNode,
  CanvasEdge,
  NetworkProtocol,
  NodeData,
  DEFAULT_COMPONENT_CONFIGS,
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
      throw new InternalServerErrorException(
        lastError?.message || 'Failed to generate architecture with Google Gemini API'
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

      room.doc.transact(() => {
        // Clear previous canvas elements and populate AI generated ones
        yNodes.clear();
        yEdges.clear();

        for (const node of architecture.nodes) {
          yNodes.set(node.id, node);
        }
        for (const edge of architecture.edges) {
          yEdges.set(edge.id, edge);
        }
      }, 'ai-generation');

      room.doc.off('update', captureUpdate);

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
}

