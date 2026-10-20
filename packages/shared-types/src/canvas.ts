/**
 * CollabArch Canvas & Architecture Component Types
 * Defines node and edge schemas stored in CRDT (Y.Doc) and rendered via React Flow.
 */

export type ComponentType = 'api-gateway' | 'service' | 'database' | 'queue';

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData extends Record<string, unknown> {
  label: string;
  capacityRps: number;
  latencyMs: number;
  queueDepthLimit: number;
  failureRate: number; // Float between 0.0 and 1.0
  description?: string;
  tags?: string[];
}

export interface CanvasNode {
  id: string;
  type: ComponentType;
  position: NodePosition;
  data: NodeData;
  selected?: boolean;
}

export type NetworkProtocol = 'HTTP' | 'gRPC' | 'AMQP' | 'TCP' | 'WebSocket';

export interface EdgeData extends Record<string, unknown> {
  latencyMs?: number;
  bandwidthLimitRps?: number;
  packetLossRate?: number; // Float between 0.0 and 1.0
  protocol?: NetworkProtocol;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  animated?: boolean;
  selected?: boolean;
  data?: EdgeData;
}

export interface ComponentPaletteItem {
  type: ComponentType;
  title: string;
  description: string;
  defaultData: NodeData;
  iconName: string;
  category: 'networking' | 'compute' | 'storage' | 'messaging';
  accentColor: string;
}

/**
 * Standard default configurations for architectural components
 */
export const DEFAULT_COMPONENT_CONFIGS: Record<ComponentType, ComponentPaletteItem> = {
  'api-gateway': {
    type: 'api-gateway',
    title: 'API Gateway',
    description: 'Ingress traffic router, SSL termination & rate limiter',
    defaultData: {
      label: 'API Gateway',
      capacityRps: 5000,
      latencyMs: 15,
      queueDepthLimit: 1000,
      failureRate: 0.001,
      description: 'Public reverse proxy routing incoming client traffic.',
    },
    iconName: 'Network',
    category: 'networking',
    accentColor: '#38bdf8', // sky-400
  },
  service: {
    type: 'service',
    title: 'Microservice',
    description: 'Stateless business logic container and API worker',
    defaultData: {
      label: 'Order Service',
      capacityRps: 1200,
      latencyMs: 45,
      queueDepthLimit: 500,
      failureRate: 0.01,
      description: 'Core microservice handling transactional workflows.',
    },
    iconName: 'Cpu',
    category: 'compute',
    accentColor: '#818cf8', // indigo-400
  },
  database: {
    type: 'database',
    title: 'Database',
    description: 'Persistent relational or document data store',
    defaultData: {
      label: 'Postgres Cluster',
      capacityRps: 800,
      latencyMs: 30,
      queueDepthLimit: 300,
      failureRate: 0.005,
      description: 'Primary ACID database instance with replica read pool.',
    },
    iconName: 'Database',
    category: 'storage',
    accentColor: '#34d399', // emerald-400
  },
  queue: {
    type: 'queue',
    title: 'Message Queue',
    description: 'Asynchronous event streaming & FIFO buffer',
    defaultData: {
      label: 'Kafka / SQS',
      capacityRps: 10000,
      latencyMs: 5,
      queueDepthLimit: 50000,
      failureRate: 0.0001,
      description: 'Distributed event bus for decoupled asynchronous tasks.',
    },
    iconName: 'Layers',
    category: 'messaging',
    accentColor: '#fbbf24', // amber-400
  },
};
