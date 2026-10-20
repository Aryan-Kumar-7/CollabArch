import {
  SimulationPacket,
  PacketStatus,
  PacketDropReason,
  NodeSimulationMetrics,
  EdgeSimulationMetrics,
  SimulationMetrics,
  SimulationConfig,
  ComponentType,
  NodeData,
  EdgeData,
} from '@collabarch/shared-types';

export type {
  SimulationPacket,
  PacketStatus,
  PacketDropReason,
  NodeSimulationMetrics,
  EdgeSimulationMetrics,
  SimulationMetrics,
  SimulationConfig,
};

/**
 * Internal representation of a node in the simulation execution graph
 */
export interface SimulationNode {
  id: string;
  type: ComponentType;
  label: string;
  capacityRps: number;
  latencyMs: number;
  queueDepthLimit: number;
  failureRate: number; // 0.0 - 1.0
  inDegree: number;
  outDegree: number;
  outgoingEdgeIds: string[];
  incomingEdgeIds: string[];
  // Runtime Queue & State
  queue: SimulationPacket[];
  processedThisTick: number;
  droppedThisTick: number;
  accumulatedProcessed: number;
  accumulatedDropped: number;
  fractionalCapacityCredit: number; // For sub-tick fractional processing precision
  nextEdgeIndex: number; // Round-robin pointer for outgoing edges
}

/**
 * Internal representation of an edge in the simulation execution graph
 */
export interface SimulationEdge {
  id: string;
  source: string;
  target: string;
  latencyMs: number;
  bandwidthLimitRps: number;
  packetLossRate: number; // 0.0 - 1.0
  protocol: string;
  // Runtime State
  inFlightPackets: SimulationPacket[];
  throughputCounter: number;
  droppedCounter: number;
}

/**
 * Extracted DAG topology ready for discrete-event execution
 */
export interface TopologyGraph {
  nodes: Map<string, SimulationNode>;
  edges: Map<string, SimulationEdge>;
  sourceNodeIds: string[];
  sinkNodeIds: string[];
  adjacency: Map<string, string[]>; // node -> downstream node IDs
  reverseAdjacency: Map<string, string[]>; // node -> upstream node IDs
  isValidDag: boolean;
  cyclesDetected: string[][];
}

/**
 * Historical telemetry sample for rolling sparklines and health charts
 */
export interface TelemetryHistoryPoint {
  timestamp: number;
  systemThroughputRps: number;
  p95LatencyMs: number;
  averageLatencyMs: number;
  errorRatePercent: number;
  activePacketsCount: number;
  droppedPacketsCount: number;
  bottlenecksCount: number;
}

/**
 * Simulation lifecycle event listener
 */
export type SimulationEventListener = (event: {
  type: 'packet_born' | 'packet_queued' | 'packet_dropped' | 'packet_completed' | 'bottleneck_detected';
  packet?: SimulationPacket;
  nodeId?: string;
  edgeId?: string;
  timestamp: number;
}) => void;

/**
 * Telemetry update callback fired at fixed intervals (e.g. 10 Hz)
 */
export type TelemetryCallback = (metrics: SimulationMetrics, historyPoint: TelemetryHistoryPoint) => void;
