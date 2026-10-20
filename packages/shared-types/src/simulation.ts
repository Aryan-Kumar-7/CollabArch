/**
 * CollabArch Discrete-Event Network Simulation Engine Types
 * Used for modeling packet transit, queuing dynamics, and system bottlenecks.
 */

export type PacketStatus = 'transiting' | 'processing' | 'dropped' | 'completed';

export interface SimulationPacket {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeId: string;
  progress: number; // 0.0 to 1.0 along the edge SVG path
  status: PacketStatus;
  createdAt: number;
  payloadSizeKb?: number;
  latencyMs: number;
}

export interface NodeSimulationMetrics {
  currentRps: number;
  currentQueueDepth: number;
  droppedCount: number;
  processedCount: number;
  utilization: number; // 0.0 to 1.0 (saturation indicator)
  averageLatencyMs: number;
  isBottleneck: boolean;
}

export interface EdgeSimulationMetrics {
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
  systemThroughputRps: number;
  errorRatePercent: number;
  nodeMetrics: Record<string, NodeSimulationMetrics>;
  edgeMetrics: Record<string, EdgeSimulationMetrics>;
}

export interface SimulationConfig {
  isRunning: boolean;
  trafficRateMultiplier: number; // 1x, 2x, 5x, 10x
  simulationSpeed: number; // visual speed factor
  failureInjectionEnabled: boolean;
  sourceNodeId?: string; // Origin generator node
}
