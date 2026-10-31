/**
 * CollabArch Canvas & Architecture Component Types
 * Defines node and edge schemas stored in CRDT (Y.Doc) and rendered via React Flow.
 */

export type ComponentType =
  | 'api-gateway'
  | 'load-balancer'
  | 'websocket'
  | 'cdn'
  | 'service'
  | 'serverless'
  | 'auth'
  | 'external-api'
  | 'database'
  | 'nosql'
  | 'cache'
  | 'storage'
  | 'vector-db'
  | 'search'
  | 'queue'
  | 'boundary';

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
  // Advanced specs:
  engine?: string; // e.g. "PostgreSQL" | "DynamoDB" | "Redis"
  replicas?: number; // e.g. 1 Primary + 2 Read Replicas
  cacheHitRatio?: number; // e.g. 0.85 (85%)
  boundaryType?: 'vpc' | 'subnet' | 'k8s-cluster' | 'security-group';
  ttl?: number; // Time to Live in seconds (e.g. 3600)
  customIcon?: string;
  customColor?: string;
  isCustom?: boolean;
  width?: number;
  height?: number;
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

export type ComponentCategory =
  | 'networking'
  | 'compute'
  | 'storage'
  | 'databases-caches'
  | 'messaging'
  | 'boundaries'
  | 'custom';

export interface ComponentPaletteItem {
  type: ComponentType;
  title: string;
  description: string;
  defaultData: NodeData;
  iconName: string;
  category: ComponentCategory;
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
      tags: ['ingress', 'nginx', 'edge'],
    },
    iconName: 'Globe',
    category: 'networking',
    accentColor: '#38bdf8', // sky-400
  },
  'load-balancer': {
    type: 'load-balancer',
    title: 'Load Balancer',
    description: 'Layer 4/7 traffic distribution and automated health-check failover',
    defaultData: {
      label: 'Load Balancer',
      capacityRps: 15000,
      latencyMs: 5,
      queueDepthLimit: 5000,
      failureRate: 0.0005,
      description: 'High-availability load balancer distributing ingress to healthy compute pools.',
      tags: ['networking', 'alb', 'ha'],
    },
    iconName: 'Split',
    category: 'networking',
    accentColor: '#0ea5e9', // sky-500
  },
  websocket: {
    type: 'websocket',
    title: 'WebSocket Gateway',
    description: 'Full-duplex real-time bidirectional connection gateway (WSS)',
    defaultData: {
      label: 'WebSocket Gateway',
      capacityRps: 20000,
      latencyMs: 2,
      queueDepthLimit: 25000,
      failureRate: 0.0005,
      description: 'Persistent bidirectional WebSocket gateway managing client subscriptions and broadcast.',
      tags: ['websocket', 'realtime', 'duplex'],
    },
    iconName: 'Radio',
    category: 'networking',
    accentColor: '#06b6d4', // cyan-500
  },
  cdn: {
    type: 'cdn',
    title: 'CDN Edge',
    description: 'Global content delivery network caching static and dynamic web assets',
    defaultData: {
      label: 'CloudFront CDN',
      capacityRps: 25000,
      latencyMs: 8,
      queueDepthLimit: 10000,
      failureRate: 0.0002,
      description: 'Edge points of presence caching static assets and API responses.',
      tags: ['edge', 'cdn', 'cache'],
    },
    iconName: 'Globe',
    category: 'networking',
    accentColor: '#a855f7', // purple-500
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
      tags: ['core', 'golang', 'orders'],
    },
    iconName: 'Cpu',
    category: 'compute',
    accentColor: '#818cf8', // indigo-400
  },
  serverless: {
    type: 'serverless',
    title: 'Serverless Function',
    description: 'Event-driven on-demand compute with rapid horizontal scaling',
    defaultData: {
      label: 'Lambda Function',
      capacityRps: 3000,
      latencyMs: 80,
      queueDepthLimit: 2000,
      failureRate: 0.012,
      description: 'Ephemeral serverless runtime triggered by async events and webhooks.',
      tags: ['serverless', 'lambda', 'event-driven'],
    },
    iconName: 'Flame',
    category: 'compute',
    accentColor: '#f97316', // orange-500
  },
  auth: {
    type: 'auth',
    title: 'Auth & Identity Service',
    description: 'OAuth 2.0 / OIDC identity provider, JWT sessions, and RBAC policy gateway',
    defaultData: {
      label: 'Auth Service (IdP)',
      capacityRps: 2500,
      latencyMs: 20,
      queueDepthLimit: 1200,
      failureRate: 0.001,
      engine: 'OAuth 2.0 / OIDC',
      description: 'Centralized authentication authority validating tokens and issuing identity credentials.',
      tags: ['auth', 'security', 'oauth', 'jwt'],
    },
    iconName: 'ShieldCheck',
    category: 'compute',
    accentColor: '#f59e0b', // amber-500
  },
  'external-api': {
    type: 'external-api',
    title: 'External 3rd-Party API',
    description: 'Downstream SaaS vendor integration endpoint (Payment, Email, Auth)',
    defaultData: {
      label: 'External API',
      capacityRps: 500,
      latencyMs: 120,
      queueDepthLimit: 200,
      failureRate: 0.02,
      description: 'Downstream partner API subject to rate limits and network jitter.',
      tags: ['saas', 'external', 'third-party'],
    },
    iconName: 'ExternalLink',
    category: 'compute',
    accentColor: '#64748b', // slate-500
  },
  database: {
    type: 'database',
    title: 'Relational Database',
    description: 'Persistent relational or document data store with ACID guarantees',
    defaultData: {
      label: 'Postgres Cluster',
      capacityRps: 800,
      latencyMs: 30,
      queueDepthLimit: 300,
      failureRate: 0.005,
      engine: 'PostgreSQL (ACID)',
      replicas: 1,
      description: 'Primary ACID database instance with replica read pool.',
      tags: ['postgres', 'storage', 'aurora'],
    },
    iconName: 'Database',
    category: 'databases-caches',
    accentColor: '#10b981', // emerald-500
  },
  nosql: {
    type: 'nosql',
    title: 'NoSQL Document Store',
    description: 'Schema-less document database with auto-sharding and horizontal scaling',
    defaultData: {
      label: 'Document DB (MongoDB)',
      capacityRps: 3500,
      latencyMs: 15,
      queueDepthLimit: 1500,
      failureRate: 0.002,
      engine: 'MongoDB (Document)',
      replicas: 3,
      description: 'High-throughput document and key-value store with flexible schema modeling.',
      tags: ['nosql', 'mongodb', 'document'],
    },
    iconName: 'Database',
    category: 'databases-caches',
    accentColor: '#059669', // emerald-600
  },
  cache: {
    type: 'cache',
    title: 'In-Memory Cache (Redis)',
    description: 'Sub-millisecond in-memory key-value cache reducing database load',
    defaultData: {
      label: 'Redis Cache',
      capacityRps: 20000,
      latencyMs: 2,
      queueDepthLimit: 15000,
      failureRate: 0.0005,
      engine: 'Redis',
      cacheHitRatio: 0.85,
      ttl: 3600,
      description: 'In-memory distributed key-value cache cluster reducing database load.',
      tags: ['redis', 'cache', 'fast'],
    },
    iconName: 'Zap',
    category: 'databases-caches',
    accentColor: '#f43f5e', // rose-500
  },
  storage: {
    type: 'storage',
    title: 'Object Storage (S3)',
    description: 'Distributed cloud object store for files, blobs, and static assets',
    defaultData: {
      label: 'S3 Object Storage',
      capacityRps: 4000,
      latencyMs: 25,
      queueDepthLimit: 2000,
      failureRate: 0.001,
      description: 'Highly resilient blob store for static media, backups, and user uploads.',
      tags: ['s3', 'storage', 'blobs'],
    },
    iconName: 'HardDrive',
    category: 'databases-caches',
    accentColor: '#06b6d4', // cyan-500
  },
  'vector-db': {
    type: 'vector-db',
    title: 'Vector Database',
    description: 'High-dimensional embeddings store for AI/RAG semantic search',
    defaultData: {
      label: 'Vector DB (Pinecone)',
      capacityRps: 1500,
      latencyMs: 35,
      queueDepthLimit: 800,
      failureRate: 0.003,
      engine: 'Pinecone / pgvector',
      description: 'Indexed high-dimensional vector embeddings store for semantic similarity.',
      tags: ['vector', 'ai', 'embeddings'],
    },
    iconName: 'Binary',
    category: 'databases-caches',
    accentColor: '#14b8a6', // teal-500
  },
  search: {
    type: 'search',
    title: 'Search Engine',
    description: 'Distributed inverted index for full-text search, filtering, and aggregation',
    defaultData: {
      label: 'Elasticsearch Cluster',
      capacityRps: 2200,
      latencyMs: 25,
      queueDepthLimit: 1000,
      failureRate: 0.002,
      engine: 'Elasticsearch',
      description: 'Distributed full-text search engine indexing structured and unstructured documents.',
      tags: ['search', 'elasticsearch', 'lucene'],
    },
    iconName: 'Search',
    category: 'databases-caches',
    accentColor: '#e11d48', // rose-600
  },
  queue: {
    type: 'queue',
    title: 'Message Queue / Bus',
    description: 'Asynchronous event streaming & FIFO buffer',
    defaultData: {
      label: 'Kafka / SQS',
      capacityRps: 10000,
      latencyMs: 5,
      queueDepthLimit: 50000,
      failureRate: 0.0001,
      description: 'Distributed event bus for decoupled asynchronous tasks.',
      tags: ['kafka', 'streaming', 'pubsub'],
    },
    iconName: 'Layers',
    category: 'messaging',
    accentColor: '#fbbf24', // amber-400
  },
  boundary: {
    type: 'boundary',
    title: 'Cloud Boundary Container',
    description: 'Logical isolation boundary (VPC, Subnet, or K8s Cluster)',
    defaultData: {
      label: 'VPC: us-east-1',
      capacityRps: 100000,
      latencyMs: 0,
      queueDepthLimit: 100000,
      failureRate: 0,
      boundaryType: 'vpc',
      description: 'Virtual Private Cloud network boundary isolating private cloud services.',
      tags: ['vpc', 'network', 'boundary'],
    },
    iconName: 'Shield',
    category: 'boundaries',
    accentColor: '#6366f1', // indigo-500
  },
};
