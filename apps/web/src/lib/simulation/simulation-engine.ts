import { ReactFlowNode, ReactFlowEdge } from '@/store/canvas-store';
import {
  SimulationPacket,
  SimulationMetrics,
  SimulationConfig,
  NodeSimulationMetrics,
  EdgeSimulationMetrics,
  TopologyGraph,
  SimulationNode,
  SimulationEdge,
  TelemetryHistoryPoint,
  TelemetryCallback,
  SimulationEventListener,
} from './types';
import { extractTopology, selectNextOutgoingEdge, MAX_PACKET_HOPS } from './topology';
import {
  samplePoissonArrivals,
  sampleProcessingLatency,
  calculatePercentiles,
} from './queuing-math';

const DEFAULT_CONFIG: SimulationConfig = {
  isRunning: false,
  isPaused: false,
  trafficRateMultiplier: 1.0,
  simulationSpeed: 1.0,
  failureInjectionEnabled: true,
  burstModeEnabled: false,
  customArrivalRateRps: undefined,
  sourceNodeIds: undefined,
};

const ROLLING_LATENCY_BUFFER_SIZE = 1500;
const MAX_ACTIVE_PACKETS = 5000;
const TELEMETRY_EMIT_INTERVAL_MS = 100; // 10 Hz telemetry update rate

export class SimulationEngine {
  private config: SimulationConfig = { ...DEFAULT_CONFIG };
  private topology: TopologyGraph;
  private animationFrameId: number | null = null;
  private lastTickTime = 0;
  private lastTelemetryEmitTime = 0;

  // Active in-flight packets transiting edges (read directly by 60 FPS animation canvas)
  private transitingPackets: SimulationPacket[] = [];

  // Packet ID generator
  private packetIdCounter = 0;

  // Telemetry rolling counters
  private totalRequests = 0;
  private processedRequests = 0;
  private droppedRequests = 0;
  private latencySamples: number[] = [];

  // Per-window counters for rate calculation (refreshed every telemetry window)
  private windowProcessedCount = 0;
  private windowDroppedCount = 0;
  private windowStartTime = performance.now();

  // Callbacks
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private eventListeners: Set<SimulationEventListener> = new Set();

  // Chaos Monkey original specs tracking
  private originalNodeSpecs = new Map<string, { latencyMs: number; failureRate: number; capacityRps: number }>();

  constructor(nodes: ReactFlowNode[] = [], edges: ReactFlowEdge[] = []) {
    this.topology = extractTopology(nodes, edges);
  }

  // =========================================================================
  // Public Lifecycle & Control API
  // =========================================================================

  public start(): void {
    if (this.config.isRunning && !this.config.isPaused) return;

    this.config.isRunning = true;
    this.config.isPaused = false;
    this.lastTickTime = performance.now();
    this.lastTelemetryEmitTime = performance.now();
    this.windowStartTime = performance.now();

    this.runLoop();
  }

  public pause(): void {
    this.config.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume(): void {
    if (!this.config.isRunning) {
      this.start();
      return;
    }
    this.config.isPaused = false;
    this.lastTickTime = performance.now();
    this.runLoop();
  }

  public stop(): void {
    this.config.isRunning = false;
    this.config.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset(): void {
    this.stop();
    this.transitingPackets = [];
    this.latencySamples = [];
    this.totalRequests = 0;
    this.processedRequests = 0;
    this.droppedRequests = 0;
    this.windowProcessedCount = 0;
    this.windowDroppedCount = 0;
    this.packetIdCounter = 0;

    // Reset node queues
    for (const node of Array.from(this.topology.nodes.values())) {
      node.queue = [];
      node.processedThisTick = 0;
      node.droppedThisTick = 0;
      node.accumulatedProcessed = 0;
      node.accumulatedDropped = 0;
      node.fractionalCapacityCredit = 0;
    }

    // Reset edge in-flight packets
    for (const edge of Array.from(this.topology.edges.values())) {
      edge.inFlightPackets = [];
      edge.throughputCounter = 0;
      edge.droppedCounter = 0;
    }

    // Reset chaos monkey injection
    for (const [nodeId, original] of Array.from(this.originalNodeSpecs.entries())) {
      const node = this.topology.nodes.get(nodeId);
      if (node) {
        node.latencyMs = original.latencyMs;
        node.failureRate = original.failureRate;
        node.capacityRps = original.capacityRps;
      }
    }
    this.originalNodeSpecs.clear();

    this.emitTelemetry();
  }

  public step(deltaTimeMs = 50): void {
    this.executeTick(deltaTimeMs);
    this.emitTelemetry();
  }

  public setConfig(partial: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public getConfig(): Readonly<SimulationConfig> {
    return this.config;
  }

  public updateTopology(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): void {
    // Retain existing queues where node IDs persist
    const previousNodes = this.topology.nodes;
    this.topology = extractTopology(nodes, edges);

    for (const [nodeId, newNode] of Array.from(this.topology.nodes.entries())) {
      const prev = previousNodes.get(nodeId);
      if (prev) {
        newNode.queue = prev.queue;
        newNode.accumulatedProcessed = prev.accumulatedProcessed;
        newNode.accumulatedDropped = prev.accumulatedDropped;
        if (this.originalNodeSpecs.has(nodeId)) {
          newNode.latencyMs = prev.latencyMs;
          newNode.failureRate = prev.failureRate;
          newNode.capacityRps = prev.capacityRps;
        }
      }
    }

    // Purge in-flight packets if their edge no longer exists
    this.transitingPackets = this.transitingPackets.filter((p) =>
      this.topology.edges.has(p.edgeId)
    );
  }

  public injectChaos(nodeId: string, type: 'latency' | 'crash' | 'restore'): void {
    const node = this.topology.nodes.get(nodeId);
    if (!node) return;

    if (!this.originalNodeSpecs.has(nodeId)) {
      this.originalNodeSpecs.set(nodeId, {
        latencyMs: node.latencyMs,
        failureRate: node.failureRate,
        capacityRps: node.capacityRps,
      });
    }

    const original = this.originalNodeSpecs.get(nodeId)!;

    if (type === 'latency') {
      node.latencyMs = original.latencyMs + 500;
      node.capacityRps = Math.max(20, Math.round(original.capacityRps * (original.latencyMs / (original.latencyMs + 500))));
    } else if (type === 'crash') {
      node.failureRate = 1.0;
    } else if (type === 'restore') {
      node.latencyMs = original.latencyMs;
      node.failureRate = original.failureRate;
      node.capacityRps = original.capacityRps;
      this.originalNodeSpecs.delete(nodeId);
    }

    this.emitTelemetry();
  }

  /**
   * Fast access for decoupled 60 FPS animation canvas.
   * Returns transiting packets without React state re-render overhead.
   */
  public getActivePackets(): readonly SimulationPacket[] {
    return this.transitingPackets;
  }

  public subscribeTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(callback);
    return () => this.telemetryCallbacks.delete(callback);
  }

  public addEventListener(listener: SimulationEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  // =========================================================================
  // Discrete-Event Simulation Loop
  // =========================================================================

  private runLoop = (): void => {
    if (!this.config.isRunning || this.config.isPaused) return;

    const now = performance.now();
    // Clamp delta time to max 100ms to prevent simulation jumps on tab backgrounding
    const rawDeltaMs = now - this.lastTickTime;
    const deltaMs = Math.min(Math.max(rawDeltaMs, 1), 100);
    this.lastTickTime = now;

    this.executeTick(deltaMs);

    // Periodically emit telemetry
    if (now - this.lastTelemetryEmitTime >= TELEMETRY_EMIT_INTERVAL_MS) {
      this.emitTelemetry();
      this.lastTelemetryEmitTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.runLoop);
  };

  /**
   * Main discrete-event execution step for a given delta time
   */
  public executeTick(deltaMs: number): void {
    const deltaSeconds = (deltaMs / 1000) * this.config.simulationSpeed;
    const now = performance.now();

    // 1. Ingress Generation: Generate traffic at source nodes (API Gateways or root nodes)
    this.generateIngressTraffic(deltaSeconds, now);

    // 2. Node Queue Processing: Process queued packets according to capacity & latency
    this.processNodeQueues(deltaSeconds, now);

    // 3. Edge Transit: Advance packets in flight along edge paths
    this.advanceTransitingPackets(deltaMs, now);
  }

  // =========================================================================
  // Simulation Subsystems
  // =========================================================================

  /**
   * 1. Traffic Generation at Ingress Nodes
   */
  private generateIngressTraffic(deltaSeconds: number, now: number): void {
    // If active packets exceed safety threshold, throttle generation to prevent memory saturation
    if (this.transitingPackets.length >= MAX_ACTIVE_PACKETS) {
      return;
    }

    const sourceIds =
      this.config.sourceNodeIds && this.config.sourceNodeIds.length > 0
        ? this.config.sourceNodeIds
        : this.topology.sourceNodeIds;

    for (const sourceId of sourceIds) {
      const sourceNode = this.topology.nodes.get(sourceId);
      if (!sourceNode) continue;

      // Calculate effective Poisson arrival rate
      const baseRps =
        this.config.customArrivalRateRps ?? Math.max(100, sourceNode.capacityRps * 0.4);
      let effectiveRate = baseRps * this.config.trafficRateMultiplier;

      // Burst mode injection: random bursts up to 3x base
      if (this.config.burstModeEnabled && Math.random() < 0.15) {
        effectiveRate *= 2.5;
      }

      const arrivals = samplePoissonArrivals(effectiveRate, deltaSeconds);

      for (let i = 0; i < arrivals; i++) {
        if (this.transitingPackets.length >= MAX_ACTIVE_PACKETS) break;

        this.packetIdCounter++;
        const packet: SimulationPacket = {
          id: `pkt-${this.packetIdCounter}-${now.toFixed(0)}`,
          sourceNodeId: sourceId,
          targetNodeId: sourceId,
          edgeId: '',
          progress: 0,
          status: 'queuing',
          createdAt: now,
          startTime: now,
          latencyMs: 0,
          dwellTimeMs: 0,
          path: [sourceId],
          currentHop: 0,
          isDelayed: false,
        };

        this.totalRequests++;
        this.enqueuePacketAtNode(sourceNode, packet, now);
      }
    }
  }

  /**
   * Enqueue a packet at a node, enforcing Drop-Tail buffer overflow & node failure rates
   */
  private enqueuePacketAtNode(
    node: SimulationNode,
    packet: SimulationPacket,
    now: number
  ): void {
    // Check 1: Drop-Tail Buffer Overflow
    if (node.queue.length >= node.queueDepthLimit) {
      packet.status = 'dropped';
      packet.dropReason = 'queue_overflow';
      node.droppedThisTick++;
      node.accumulatedDropped++;
      this.droppedRequests++;
      this.windowDroppedCount++;
      this.emitEvent('packet_dropped', packet, node.id);
      return;
    }

    // Check 2: Transient Node Failure / 5xx Error Injection
    if (
      this.config.failureInjectionEnabled &&
      node.failureRate > 0 &&
      Math.random() < node.failureRate
    ) {
      packet.status = 'dropped';
      packet.dropReason = 'node_failure';
      node.droppedThisTick++;
      node.accumulatedDropped++;
      this.droppedRequests++;
      this.windowDroppedCount++;
      this.emitEvent('packet_dropped', packet, node.id);
      return;
    }

    // Accept packet into FIFO buffer
    packet.status = 'queuing';
    packet.targetNodeId = node.id;

    // Check for buffer bloat delay indication (queue saturation > 60%)
    if (node.queue.length / node.queueDepthLimit > 0.6) {
      packet.isDelayed = true;
    }

    node.queue.push(packet);
    this.emitEvent('packet_queued', packet, node.id);
  }

  /**
   * 2. Node Queue Processing (Service Capacity mu & Base Latency T_proc)
   */
  private processNodeQueues(deltaSeconds: number, now: number): void {
    for (const node of Array.from(this.topology.nodes.values())) {
      node.processedThisTick = 0;
      node.droppedThisTick = 0;

      if (node.queue.length === 0) {
        node.fractionalCapacityCredit = 0;
        continue;
      }

      // Calculate number of packets this node can process in this tick
      const rawServiceCount =
        node.capacityRps * deltaSeconds + node.fractionalCapacityCredit;
      const countToProcess = Math.min(node.queue.length, Math.floor(rawServiceCount));
      node.fractionalCapacityCredit = rawServiceCount - countToProcess;

      for (let i = 0; i < countToProcess; i++) {
        const packet = node.queue.shift();
        if (!packet) break;

        // Apply processing latency with Gaussian jitter
        const processingLatency = sampleProcessingLatency(node.latencyMs);
        packet.latencyMs += processingLatency;
        packet.dwellTimeMs += processingLatency;
        packet.status = 'processing';

        node.processedThisTick++;
        node.accumulatedProcessed++;

        // Route packet to next stage
        this.routePacketFromNode(node, packet, now);
      }
    }
  }

  /**
   * Route packet from current node to downstream edge or complete if sink
   */
  private routePacketFromNode(
    node: SimulationNode,
    packet: SimulationPacket,
    now: number
  ): void {
    // TTL protection against infinite cycles
    if (packet.currentHop >= MAX_PACKET_HOPS) {
      packet.status = 'dropped';
      packet.dropReason = 'ttl_exceeded';
      this.droppedRequests++;
      this.windowDroppedCount++;
      this.emitEvent('packet_dropped', packet, node.id);
      return;
    }

    // Check if this node is a terminal sink (no outgoing edges)
    if (node.outgoingEdgeIds.length === 0) {
      packet.status = 'completed';
      this.processedRequests++;
      this.windowProcessedCount++;
      this.recordLatencySample(packet.latencyMs);
      this.emitEvent('packet_completed', packet, node.id);
      return;
    }

    // Select downstream edge using round-robin distribution
    const nextEdge = selectNextOutgoingEdge(node, this.topology.edges);
    if (!nextEdge) {
      packet.status = 'completed';
      this.processedRequests++;
      this.windowProcessedCount++;
      this.recordLatencySample(packet.latencyMs);
      this.emitEvent('packet_completed', packet, node.id);
      return;
    }

    // Check link-level packet loss
    if (nextEdge.packetLossRate > 0 && Math.random() < nextEdge.packetLossRate) {
      packet.status = 'dropped';
      packet.dropReason = 'packet_loss';
      nextEdge.droppedCounter++;
      this.droppedRequests++;
      this.windowDroppedCount++;
      this.emitEvent('packet_dropped', packet, undefined, nextEdge.id);
      return;
    }

    // Transition to transiting state along selected edge
    packet.status = 'transiting';
    packet.edgeId = nextEdge.id;
    packet.sourceNodeId = node.id;
    packet.targetNodeId = nextEdge.target;
    packet.progress = 0.0;
    packet.currentHop++;
    packet.path.push(nextEdge.target);

    nextEdge.inFlightPackets.push(packet);
    nextEdge.throughputCounter++;
    this.transitingPackets.push(packet);
  }

  /**
   * 3. Advance In-Flight Transiting Packets along SVG Edge Vectors
   */
  private advanceTransitingPackets(deltaMs: number, now: number): void {
    const remainingTransiting: SimulationPacket[] = [];

    for (const packet of this.transitingPackets) {
      const edge = this.topology.edges.get(packet.edgeId);
      if (!edge) {
        continue; // Edge was removed
      }

      // Edge transit duration in ms
      const transitDurationMs = Math.max(10, edge.latencyMs);
      const progressDelta = (deltaMs / transitDurationMs) * this.config.simulationSpeed;
      packet.progress += progressDelta;

      if (packet.progress >= 1.0) {
        // Packet arrived at target node!
        packet.progress = 1.0;
        packet.latencyMs += transitDurationMs;

        // Remove from edge in-flight list
        const idx = edge.inFlightPackets.indexOf(packet);
        if (idx !== -1) edge.inFlightPackets.splice(idx, 1);

        // Enqueue at target node
        const targetNode = this.topology.nodes.get(packet.targetNodeId);
        if (targetNode) {
          this.enqueuePacketAtNode(targetNode, packet, now);
        } else {
          // Target disappeared, mark completed
          packet.status = 'completed';
          this.processedRequests++;
          this.windowProcessedCount++;
          this.recordLatencySample(packet.latencyMs);
        }
      } else {
        remainingTransiting.push(packet);
      }
    }

    this.transitingPackets = remainingTransiting;
  }

  // =========================================================================
  // Telemetry Calculation & Dispatch
  // =========================================================================

  private recordLatencySample(latencyMs: number): void {
    if (this.latencySamples.length >= ROLLING_LATENCY_BUFFER_SIZE) {
      this.latencySamples.shift();
    }
    this.latencySamples.push(latencyMs);
  }

  public getMetrics(): SimulationMetrics {
    const now = performance.now();
    const windowDurationSeconds = Math.max(0.001, (now - this.windowStartTime) / 1000);

    // Calculate rolling throughput
    const systemThroughputRps = Math.round(
      this.windowProcessedCount / windowDurationSeconds
    );

    // Compute latency percentiles
    const percentiles = calculatePercentiles(this.latencySamples);

    // Compute global error rate
    const totalAttempted = this.processedRequests + this.droppedRequests;
    const errorRatePercent =
      totalAttempted > 0
        ? Math.round((this.droppedRequests / totalAttempted) * 1000) / 10
        : 0;

    // Node Metrics
    const nodeMetrics: Record<string, NodeSimulationMetrics> = {};
    const bottleneckNodeIds: string[] = [];

    for (const [nodeId, node] of Array.from(this.topology.nodes.entries())) {
      const nodeRps = Math.round(node.processedThisTick * 10); // Extrapolated RPS
      const currentQueueDepth = node.queue.length;
      const maxQueueDepth = node.queueDepthLimit;
      const utilization = Math.min(
        1.0,
        Math.round((currentQueueDepth / maxQueueDepth) * 100) / 100
      );

      const nodeTotal = node.accumulatedProcessed + node.accumulatedDropped;
      const nodeErrorRate =
        nodeTotal > 0
          ? Math.round((node.accumulatedDropped / nodeTotal) * 1000) / 10
          : 0;

      // A node is a bottleneck if queue is >= 80% saturated or utilization >= 0.85
      const isBottleneck =
        currentQueueDepth / maxQueueDepth >= 0.8 || utilization >= 0.85;

      if (isBottleneck) {
        bottleneckNodeIds.push(nodeId);
      }

      nodeMetrics[nodeId] = {
        nodeId,
        currentRps: nodeRps,
        currentQueueDepth,
        maxQueueDepth,
        droppedCount: node.accumulatedDropped,
        processedCount: node.accumulatedProcessed,
        utilization,
        averageLatencyMs: node.latencyMs,
        errorRatePercent: nodeErrorRate,
        isBottleneck,
      };
    }

    // Edge Metrics
    const edgeMetrics: Record<string, EdgeSimulationMetrics> = {};
    for (const [edgeId, edge] of Array.from(this.topology.edges.entries())) {
      edgeMetrics[edgeId] = {
        edgeId,
        currentThroughputRps: edge.throughputCounter,
        activePacketsCount: edge.inFlightPackets.length,
        droppedPacketsCount: edge.droppedCounter,
        averageTransitMs: edge.latencyMs,
      };
    }

    // Reset short rolling window counters
    this.windowProcessedCount = 0;
    this.windowDroppedCount = 0;
    this.windowStartTime = now;

    return {
      totalRequests: this.totalRequests,
      processedRequests: this.processedRequests,
      droppedRequests: this.droppedRequests,
      activeRequests: this.transitingPackets.length,
      averageLatencyMs: percentiles.mean,
      p50LatencyMs: percentiles.p50,
      p95LatencyMs: percentiles.p95,
      p99LatencyMs: percentiles.p99,
      systemThroughputRps,
      errorRatePercent,
      bottleneckNodeIds,
      nodeMetrics,
      edgeMetrics,
    };
  }

  private emitTelemetry(): void {
    if (this.telemetryCallbacks.size === 0) return;

    const metrics = this.getMetrics();
    const historyPoint: TelemetryHistoryPoint = {
      timestamp: Date.now(),
      systemThroughputRps: metrics.systemThroughputRps,
      p95LatencyMs: metrics.p95LatencyMs,
      averageLatencyMs: metrics.averageLatencyMs,
      errorRatePercent: metrics.errorRatePercent,
      activePacketsCount: metrics.activeRequests,
      droppedPacketsCount: metrics.droppedRequests,
      bottlenecksCount: metrics.bottleneckNodeIds.length,
    };

    for (const callback of Array.from(this.telemetryCallbacks)) {
      callback(metrics, historyPoint);
    }
  }

  private emitEvent(
    type: 'packet_born' | 'packet_queued' | 'packet_dropped' | 'packet_completed' | 'bottleneck_detected',
    packet?: SimulationPacket,
    nodeId?: string,
    edgeId?: string
  ): void {
    if (this.eventListeners.size === 0) return;
    const event = {
      type,
      packet,
      nodeId,
      edgeId,
      timestamp: performance.now(),
    };
    for (const listener of Array.from(this.eventListeners)) {
      listener(event);
    }
  }
}
