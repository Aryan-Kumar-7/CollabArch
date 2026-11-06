import { ReactFlowNode, ReactFlowEdge } from '@/store/canvas-store';
import {
  SimulationNode,
  SimulationEdge,
  TopologyGraph,
} from './types';

export const MAX_PACKET_HOPS = 16;

/**
 * Extracts an executable DAG topology from React Flow nodes and edges
 */
export function extractTopology(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): TopologyGraph {
  const nodeMap = new Map<string, SimulationNode>();
  const edgeMap = new Map<string, SimulationEdge>();
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  // 1. Initialize simulation nodes
  for (const node of nodes) {
    if (node.type === 'boundary') {
      continue; // Boundaries are grouping visual containers, not traffic processing nodes
    }
    const replicas = typeof node.data.replicas === 'number' && node.data.replicas > 0 ? node.data.replicas : 1;
    const baseCapacity = node.data.capacityRps || 1000;
    const effectiveCapacity = baseCapacity * replicas;

    nodeMap.set(node.id, {
      id: node.id,
      type: node.type || 'service',
      label: node.data.label || node.id,
      capacityRps: effectiveCapacity,
      latencyMs: node.data.latencyMs || 25,
      queueDepthLimit: node.data.queueDepthLimit || 500,
      failureRate: Math.max(0, Math.min(1, node.data.failureRate || 0)),
      replicas,
      cacheHitRatio: typeof node.data.cacheHitRatio === 'number' ? node.data.cacheHitRatio : undefined,
      inDegree: 0,
      outDegree: 0,
      outgoingEdgeIds: [],
      incomingEdgeIds: [],
      queue: [],
      processedThisTick: 0,
      droppedThisTick: 0,
      accumulatedProcessed: 0,
      accumulatedDropped: 0,
      fractionalCapacityCredit: 0,
      nextEdgeIndex: 0,
    });

    adjacency.set(node.id, []);
    reverseAdjacency.set(node.id, []);
  }

  // 2. Initialize simulation edges and build adjacency lists
  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      continue; // Skip dangling edges
    }

    const simEdge: SimulationEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      latencyMs: edge.data?.latencyMs || 15,
      bandwidthLimitRps: edge.data?.bandwidthLimitRps || 10000,
      packetLossRate: Math.max(0, Math.min(1, edge.data?.packetLossRate || 0)),
      protocol: edge.data?.protocol || 'HTTP',
      inFlightPackets: [],
      throughputCounter: 0,
      droppedCounter: 0,
    };

    edgeMap.set(edge.id, simEdge);

    const sourceNode = nodeMap.get(edge.source)!;
    const targetNode = nodeMap.get(edge.target)!;

    sourceNode.outgoingEdgeIds.push(edge.id);
    sourceNode.outDegree++;

    targetNode.incomingEdgeIds.push(edge.id);
    targetNode.inDegree++;

    adjacency.get(edge.source)?.push(edge.target);
    reverseAdjacency.get(edge.target)?.push(edge.source);
  }

  // 3. Classify Source and Sink Nodes
  const sourceNodeIds: string[] = [];
  const sinkNodeIds: string[] = [];

  for (const [nodeId, simNode] of Array.from(nodeMap.entries())) {
    // API Gateways, WebSockets, or nodes with no incoming edges act as ingress sources
    if (simNode.inDegree === 0 || simNode.type === 'api-gateway' || simNode.type === 'websocket') {
      sourceNodeIds.push(nodeId);
    }
    // Nodes with no outgoing edges act as terminal sinks (e.g. databases)
    if (simNode.outDegree === 0) {
      sinkNodeIds.push(nodeId);
    }
  }

  // Fallback: If no ingress node is found, use the first node
  if (sourceNodeIds.length === 0 && nodeMap.size > 0) {
    sourceNodeIds.push(nodeMap.keys().next().value!);
  }

  // 4. Cycle Detection using DFS 3-Coloring (White=0, Gray=1, Black=2)
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cyclesDetected: string[][] = [];

  for (const nodeId of Array.from(nodeMap.keys())) {
    color.set(nodeId, 0); // White
  }

  function dfsVisit(u: string, currentPath: string[]) {
    color.set(u, 1); // Gray (visiting)
    currentPath.push(u);

    const neighbors = adjacency.get(u) || [];
    for (const v of neighbors) {
      const vColor = color.get(v);
      if (vColor === 1) {
        // Back edge detected: cycle!
        const cycleStartIndex = currentPath.indexOf(v);
        if (cycleStartIndex !== -1) {
          cyclesDetected.push([...currentPath.slice(cycleStartIndex), v]);
        }
      } else if (vColor === 0) {
        parent.set(v, u);
        dfsVisit(v, currentPath);
      }
    }

    currentPath.pop();
    color.set(u, 2); // Black (visited)
  }

  for (const nodeId of Array.from(nodeMap.keys())) {
    if (color.get(nodeId) === 0) {
      dfsVisit(nodeId, []);
    }
  }

  const isValidDag = cyclesDetected.length === 0;

  return {
    nodes: nodeMap,
    edges: edgeMap,
    sourceNodeIds,
    sinkNodeIds,
    adjacency,
    reverseAdjacency,
    isValidDag,
    cyclesDetected,
  };
}

/**
 * Select the next outgoing edge from a node using round-robin distribution
 */
export function selectNextOutgoingEdge(
  node: SimulationNode,
  edgeMap: Map<string, SimulationEdge>
): SimulationEdge | null {
  if (node.outgoingEdgeIds.length === 0) return null;

  const edgeId = node.outgoingEdgeIds[node.nextEdgeIndex % node.outgoingEdgeIds.length];
  node.nextEdgeIndex++;
  return edgeMap.get(edgeId) || null;
}
