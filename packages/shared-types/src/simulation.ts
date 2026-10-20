/**
 * CollabArch Discrete-Event Network Simulation Engine Types
 * Used for modeling packet transit, queuing dynamics, and system bottlenecks.
 */

export type PacketStatus = 'transiting' | 'queuing' | 'processing' | 'dropped' | 'completed';

export type PacketDropReason = 'queue_overflow' | 'node_failure' | 'packet_loss' | 'ttl_exceeded';

export interface SimulationPacket {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeId: string;
  progress: number; // 0.0 to 1.0 along the edge SVG path
  status: PacketStatus;
  dropReason?: PacketDropReason;
  createdAt: number;
  startTime: number;
  latencyMs: number;
  dwellTimeMs: number;
  path: string[];
  currentHop: number;
  isDelayed?: boolean;
  payloadSizeKb?: number;
}

export interface NodeSimulationMetrics {
  nodeId: string;
  currentRps: number;
  currentQueueDepth: number;
  maxQueueDepth: number;
  droppedCount: number;
  processedCount: number;
  utilization: number; // 0.0 to 1.0 (saturation indicator)
  averageLatencyMs: number;
  errorRatePercent: number;
  isBottleneck: boolean;
}

export interface EdgeSimulationMetrics {
  edgeId: string;
  currentThroughputRps: number;
  activePacketsCount: number;
  droppedPacketsCount: number;
  averageTransitMs: number;
}

export interface SimulationMetrics {
  totalRequests: number;
  processedRequests: number;
  droppedRequests: number;
  activeRequests: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  systemThroughputRps: number;
  errorRatePercent: number;
  bottleneckNodeIds: string[];
  nodeMetrics: Record<string, NodeSimulationMetrics>;
  edgeMetrics: Record<string, EdgeSimulationMetrics>;
}

export interface SimulationConfig {
  isRunning: boolean;
  isPaused: boolean;
  trafficRateMultiplier: number; // 0.5x, 1x, 2x, 5x, 10x
  simulationSpeed: number; // visual speed factor (0.5 to 3.0)
  failureInjectionEnabled: boolean;
  burstModeEnabled: boolean;
  customArrivalRateRps?: number;
  sourceNodeIds?: string[]; // Origin generator nodes
}

