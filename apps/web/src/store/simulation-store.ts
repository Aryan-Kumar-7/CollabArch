import { create } from 'zustand';
import {
  SimulationMetrics,
  SimulationConfig,
  TelemetryHistoryPoint,
} from '@/lib/simulation/types';
import { SimulationEngine } from '@/lib/simulation/simulation-engine';
import { useCanvasStore } from './canvas-store';

const MAX_HISTORY_POINTS = 60; // 60 data points at 10 Hz = 6 seconds rolling window

const INITIAL_METRICS: SimulationMetrics = {
  totalRequests: 0,
  processedRequests: 0,
  droppedRequests: 0,
  activeRequests: 0,
  averageLatencyMs: 0,
  p50LatencyMs: 0,
  p95LatencyMs: 0,
  p99LatencyMs: 0,
  systemThroughputRps: 0,
  errorRatePercent: 0,
  bottleneckNodeIds: [],
  nodeMetrics: {},
  edgeMetrics: {},
};

const INITIAL_CONFIG: SimulationConfig = {
  isRunning: false,
  isPaused: false,
  trafficRateMultiplier: 1.0,
  simulationSpeed: 1.0,
  failureInjectionEnabled: true,
  burstModeEnabled: false,
  customArrivalRateRps: undefined,
  sourceNodeIds: undefined,
};

interface SimulationStoreState {
  // Engine Configuration & State
  config: SimulationConfig;
  metrics: SimulationMetrics;
  history: TelemetryHistoryPoint[];

  // UI Panels & Drawer State
  isTelemetryDrawerOpen: boolean;
  selectedMetricTab: 'overview' | 'nodes' | 'bottlenecks' | 'latency';

  // Engine Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  step: (deltaMs?: number) => void;

  // Parameter Controls
  setTrafficMultiplier: (multiplier: number) => void;
  setSimulationSpeed: (speed: number) => void;
  toggleFailureInjection: () => void;
  toggleBurstMode: () => void;
  setCustomArrivalRate: (rps?: number) => void;
  setSourceNodes: (sourceIds: string[]) => void;

  // UI Toggles
  setTelemetryDrawerOpen: (open: boolean) => void;
  toggleTelemetryDrawer: () => void;
  setSelectedMetricTab: (tab: 'overview' | 'nodes' | 'bottlenecks' | 'latency') => void;

  // Synchronization with React Flow Canvas
  syncTopologyWithCanvas: () => void;
  getEngine: () => SimulationEngine;
}

// Module-level simulation engine instance
let engineInstance: SimulationEngine | null = null;

function getOrCreateEngine(): SimulationEngine {
  if (!engineInstance) {
    const { nodes, edges } = useCanvasStore.getState();
    engineInstance = new SimulationEngine(nodes, edges);
  }
  return engineInstance;
}

export const useSimulationStore = create<SimulationStoreState>((set, get) => {
  const engine = getOrCreateEngine();

  // Attach throttled telemetry subscriber (runs at 10 Hz)
  engine.subscribeTelemetry((metrics, historyPoint) => {
    set((state) => {
      const nextHistory = [...state.history, historyPoint];
      if (nextHistory.length > MAX_HISTORY_POINTS) {
        nextHistory.shift();
      }
      return {
        metrics,
        history: nextHistory,
      };
    });
  });

  return {
    config: INITIAL_CONFIG,
    metrics: INITIAL_METRICS,
    history: [],
    isTelemetryDrawerOpen: false,
    selectedMetricTab: 'overview',

    start: () => {
      const eng = getOrCreateEngine();
      get().syncTopologyWithCanvas();
      eng.start();
      set({ config: { ...eng.getConfig() } });
    },

    pause: () => {
      const eng = getOrCreateEngine();
      eng.pause();
      set({ config: { ...eng.getConfig() } });
    },

    resume: () => {
      const eng = getOrCreateEngine();
      eng.resume();
      set({ config: { ...eng.getConfig() } });
    },

    stop: () => {
      const eng = getOrCreateEngine();
      eng.stop();
      set({ config: { ...eng.getConfig() } });
    },

    reset: () => {
      const eng = getOrCreateEngine();
      eng.reset();
      set({
        config: { ...eng.getConfig() },
        metrics: INITIAL_METRICS,
        history: [],
      });
    },

    step: (deltaMs = 50) => {
      const eng = getOrCreateEngine();
      get().syncTopologyWithCanvas();
      eng.step(deltaMs);
      set({ config: { ...eng.getConfig() } });
    },

    setTrafficMultiplier: (multiplier: number) => {
      const eng = getOrCreateEngine();
      eng.setConfig({ trafficRateMultiplier: multiplier });
      set({ config: { ...eng.getConfig() } });
    },

    setSimulationSpeed: (speed: number) => {
      const eng = getOrCreateEngine();
      eng.setConfig({ simulationSpeed: speed });
      set({ config: { ...eng.getConfig() } });
    },

    toggleFailureInjection: () => {
      const eng = getOrCreateEngine();
      const nextState = !get().config.failureInjectionEnabled;
      eng.setConfig({ failureInjectionEnabled: nextState });
      set({ config: { ...eng.getConfig() } });
    },

    toggleBurstMode: () => {
      const eng = getOrCreateEngine();
      const nextState = !get().config.burstModeEnabled;
      eng.setConfig({ burstModeEnabled: nextState });
      set({ config: { ...eng.getConfig() } });
    },

    setCustomArrivalRate: (rps?: number) => {
      const eng = getOrCreateEngine();
      eng.setConfig({ customArrivalRateRps: rps });
      set({ config: { ...eng.getConfig() } });
    },

    setSourceNodes: (sourceIds: string[]) => {
      const eng = getOrCreateEngine();
      eng.setConfig({ sourceNodeIds: sourceIds });
      set({ config: { ...eng.getConfig() } });
    },

    setTelemetryDrawerOpen: (open: boolean) => {
      set({ isTelemetryDrawerOpen: open });
    },

    toggleTelemetryDrawer: () => {
      set((state) => ({ isTelemetryDrawerOpen: !state.isTelemetryDrawerOpen }));
    },

    setSelectedMetricTab: (tab) => {
      set({ selectedMetricTab: tab });
    },

    syncTopologyWithCanvas: () => {
      const eng = getOrCreateEngine();
      const { nodes, edges } = useCanvasStore.getState();
      eng.updateTopology(nodes, edges);
    },

    getEngine: () => {
      return getOrCreateEngine();
    },
  };
});
