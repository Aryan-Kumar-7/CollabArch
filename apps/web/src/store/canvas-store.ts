import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import {
  ComponentType,
  NodeData,
  DEFAULT_COMPONENT_CONFIGS,
} from '@collabarch/shared-types';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export type ReactFlowNode = Node<NodeData, ComponentType>;
export type ReactFlowEdge = Edge<{
  latencyMs?: number;
  bandwidthLimitRps?: number;
  packetLossRate?: number;
  protocol?: string;
}>;

export type CanvasStudioMode = 'whiteboard' | 'simulator';

export interface CollaboratorPresence {
  userId: string;
  userName: string;
  color: string;
  isCurrentUser?: boolean;
  email?: string;
  avatarUrl?: string | null;
  isGuest?: boolean;
}

export interface UserProfile {
  name: string;
  color: string;
}

export interface CustomComponentDefinition {
  id: string;
  name: string;
  type?: ComponentType;
  baseRps: number;
  latencyMs: number;
  queueDepthLimit?: number;
  failureRate?: number;
  iconName: string;
  accentColor: string;
  description?: string;
}

interface CanvasState {
  // Studio Mode & Room Metadata
  activeMode: CanvasStudioMode;
  roomId: string;
  userProfile: UserProfile;
  collaborators: CollaboratorPresence[];
  isConnected: boolean;
  setActiveMode: (mode: CanvasStudioMode) => void;
  setRoomId: (roomId: string) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  setCollaborators: (collaborators: CollaboratorPresence[]) => void;
  setIsConnected: (connected: boolean) => void;
  userRole: 'owner' | 'editor' | 'viewer';
  setUserRole: (role: 'owner' | 'editor' | 'viewer') => void;

  // Theme State
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Graph State
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Custom Components Palette State
  customComponents: CustomComponentDefinition[];
  addCustomComponent: (component: Omit<CustomComponentDefinition, 'id'>) => CustomComponentDefinition;
  removeCustomComponent: (id: string) => void;

  // Viewport State
  viewport: ViewportState;

  // UI Panels
  isSidebarOpen: boolean;
  isInspectorOpen: boolean;

  // Graph Mutations
  setNodes: (nodes: ReactFlowNode[]) => void;
  setEdges: (edges: ReactFlowEdge[]) => void;
  onNodesChange: (changes: NodeChange<ReactFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ReactFlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Canvas Actions
  addNode: (type: ComponentType, position: { x: number; y: number }, customData?: Partial<NodeData>) => string;
  updateNodeData: (id: string, partialData: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;

  // Edge Actions
  updateEdgeData: (id: string, partialData: Record<string, unknown>) => void;
  deleteEdge: (id: string) => void;

  // Selection
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;

  // Viewport
  setViewport: (viewport: ViewportState) => void;

  // UI Toggles
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;

  // History & Comments Tooling
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  toggleHistory: () => void;

  isCommentMode: boolean;
  setIsCommentMode: (active: boolean) => void;
  toggleCommentMode: () => void;
  newCommentTarget: { nodeId?: string; posX?: number; posY?: number } | null;
  setNewCommentTarget: (target: { nodeId?: string; posX?: number; posY?: number } | null) => void;

  // Canvas Templates
  loadStarterTemplate: () => void;
  clearCanvas: () => void;
}

const INITIAL_NODES: ReactFlowNode[] = [
  {
    id: 'node-gateway',
    type: 'api-gateway',
    position: { x: 60, y: 260 },
    data: {
      label: 'Edge Gateway',
      capacityRps: 5000,
      latencyMs: 15,
      queueDepthLimit: 1000,
      failureRate: 0.001,
      description: 'Public ingress terminating TLS and rate-limiting upstream callers.',
      tags: ['ingress', 'nginx', 'edge'],
    },
  },
  {
    id: 'node-order-svc',
    type: 'service',
    position: { x: 480, y: 80 },
    data: {
      label: 'Order Service',
      capacityRps: 1500,
      latencyMs: 40,
      queueDepthLimit: 600,
      failureRate: 0.008,
      description: 'Handles order placement, idempotency validation, and checkout orchestration.',
      tags: ['core', 'golang', 'orders'],
    },
  },
  {
    id: 'node-payment-svc',
    type: 'service',
    position: { x: 480, y: 440 }, // 360px vertical separation from Order Service
    data: {
      label: 'Payment Service',
      capacityRps: 800,
      latencyMs: 65,
      queueDepthLimit: 400,
      failureRate: 0.015,
      description: 'Third-party gateway reconciliation & fraud verification processor.',
      tags: ['stripe', 'pci-dss', 'payments'],
    },
  },
  {
    id: 'node-db',
    type: 'database',
    position: { x: 920, y: 80 }, // 440px horizontal separation
    data: {
      label: 'Orders DB',
      capacityRps: 1000,
      latencyMs: 25,
      queueDepthLimit: 450,
      failureRate: 0.002,
      description: 'Primary PostgreSQL cluster with read replicas and pgvector index.',
      tags: ['postgres', 'storage', 'aurora'],
    },
  },
  {
    id: 'node-queue',
    type: 'queue',
    position: { x: 920, y: 440 }, // 360px vertical separation from Orders DB
    data: {
      label: 'Order Events Bus',
      capacityRps: 12000,
      latencyMs: 5,
      queueDepthLimit: 50000,
      failureRate: 0.0001,
      description: 'Partitioned Kafka log fanning out transaction events to analytics & notifications.',
      tags: ['kafka', 'streaming', 'pubsub'],
    },
  },
];

const INITIAL_EDGES: ReactFlowEdge[] = [
  {
    id: 'edge-gateway-order',
    source: 'node-gateway',
    target: 'node-order-svc',
    animated: true,
    data: {
      protocol: 'HTTP',
      latencyMs: 5,
      bandwidthLimitRps: 4000,
    },
  },
  {
    id: 'edge-gateway-payment',
    source: 'node-gateway',
    target: 'node-payment-svc',
    animated: true,
    data: {
      protocol: 'gRPC',
      latencyMs: 3,
      bandwidthLimitRps: 2000,
    },
  },
  {
    id: 'edge-order-db',
    source: 'node-order-svc',
    target: 'node-db',
    animated: true,
    data: {
      protocol: 'TCP',
      latencyMs: 2,
      bandwidthLimitRps: 1500,
    },
  },
  {
    id: 'edge-order-queue',
    source: 'node-order-svc',
    target: 'node-queue',
    animated: true,
    data: {
      protocol: 'AMQP',
      latencyMs: 2,
      bandwidthLimitRps: 8000,
    },
  },
];

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  try {
    const stored = localStorage.getItem('collabarch_theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Fallback if localStorage or matchMedia is inaccessible
  }
  return 'light';
}

function applyThemeToDom(newTheme: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    try {
      localStorage.setItem('collabarch_theme', newTheme);
    } catch {
      // Fallback
    }
  }
}

function getInitialCustomComponents(): CustomComponentDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('collabarch_custom_components');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return [];
}

const initialTheme = getInitialTheme();
if (typeof document !== 'undefined') {
  applyThemeToDom(initialTheme);
}

const DEFAULT_ROOM_ID = 'arch-main';
const DEFAULT_USER_PROFILE: UserProfile = { name: 'Aryan', color: '#38bdf8' };

export const useCanvasStore = create<CanvasState>((set, get) => ({
  activeMode: 'whiteboard',
  roomId: DEFAULT_ROOM_ID,
  userProfile: DEFAULT_USER_PROFILE,
  collaborators: [
    {
      userId: 'user-me',
      userName: `${DEFAULT_USER_PROFILE.name} (You)`,
      color: DEFAULT_USER_PROFILE.color,
      isCurrentUser: true,
    },
  ],
  isConnected: false,
  userRole: 'editor',
  setUserRole: (role) => set({ userRole: role }),
  theme: initialTheme,
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  customComponents: getInitialCustomComponents(),
  selectedNodeId: null,
  selectedEdgeId: null,
  viewport: { x: 100, y: 80, zoom: 0.9 },
  isSidebarOpen: false,
  isInspectorOpen: false,

  addCustomComponent: (comp) => {
    const newComponent: CustomComponentDefinition = {
      ...comp,
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...get().customComponents, newComponent];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('collabarch_custom_components', JSON.stringify(updated));
      } catch {}
    }
    set({ customComponents: updated });
    return newComponent;
  },

  removeCustomComponent: (id) => {
    const updated = get().customComponents.filter((c) => c.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('collabarch_custom_components', JSON.stringify(updated));
      } catch {}
    }
    set({ customComponents: updated });
  },

  setActiveMode: (mode) => set({ activeMode: mode }),
  setRoomId: (roomId) => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('room') !== roomId) {
          url.searchParams.set('room', roomId);
          window.history.pushState(null, '', url.toString());
        }
      } catch {}
    }
    set({ roomId });
  },
  setUserProfile: (profile) => {
    const current = get().userProfile;
    const updated = { ...current, ...profile };
    if (typeof window !== 'undefined') {
      try {
        if (profile.name) localStorage.setItem('collabarch_user_name', profile.name);
        if (profile.color) localStorage.setItem('collabarch_user_color', profile.color);
      } catch {}
    }
    const updatedCollaborators = get().collaborators.map((c) =>
      c.isCurrentUser
        ? { ...c, userName: `${updated.name} (You)`, color: updated.color }
        : c
    );
    set({ userProfile: updated, collaborators: updatedCollaborators });
  },
  setCollaborators: (collaborators) => set({ collaborators }),
  setIsConnected: (isConnected) => set({ isConnected }),

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    applyThemeToDom(newTheme);
    set({ theme: newTheme });
  },

  setTheme: (theme) => {
    applyThemeToDom(theme);
    set({ theme });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const newEdge: ReactFlowEdge = {
      ...connection,
      id: `edge-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      animated: true,
      data: {
        protocol: 'HTTP',
        latencyMs: 5,
        bandwidthLimitRps: 2000,
      },
    };
    set({
      edges: addEdge(newEdge, get().edges),
    });
  },

  addNode: (type, position, customData) => {
    const id = `node-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const config = DEFAULT_COMPONENT_CONFIGS[type] || DEFAULT_COMPONENT_CONFIGS.service;
    const isBoundary = type === 'boundary';

    const newNode: ReactFlowNode = {
      id,
      type,
      position,
      style: isBoundary ? { width: 500, height: 340, zIndex: -1 } : undefined,
      data: {
        ...config.defaultData,
        ...customData,
      },
    };

    set((state) => ({
      // Place boundary nodes at the start of nodes list so they render behind other nodes
      nodes: isBoundary ? [newNode, ...state.nodes] : [...state.nodes, newNode],
      selectedNodeId: id,
      isInspectorOpen: true,
    }));

    return id;
  },

  updateNodeData: (id, partialData) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...partialData,
            },
          };
        }
        return node;
      }),
    }));
  },

  deleteNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  duplicateNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;

    const newId = `node-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicatedNode: ReactFlowNode = {
      ...node,
      id: newId,
      position: {
        x: node.position.x + 40,
        y: node.position.y + 40,
      },
      data: {
        ...node.data,
        label: `${node.data.label} (Copy)`,
      },
    };

    set((state) => ({
      nodes: [...state.nodes, duplicatedNode],
      selectedNodeId: newId,
    }));
  },

  updateEdgeData: (id, partialData) => {
    set((state) => ({
      edges: state.edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: {
              ...edge.data,
              ...partialData,
            },
          };
        }
        return edge;
      }),
    }));
  },

  deleteEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    }));
  },

  setSelectedNodeId: (id) => {
    set({
      selectedNodeId: id,
      selectedEdgeId: null,
      isInspectorOpen: Boolean(id),
    });
  },

  setSelectedEdgeId: (id) => {
    set({
      selectedEdgeId: id,
      selectedNodeId: null,
    });
  },

  setViewport: (viewport) => set({ viewport }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleInspector: () => set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setInspectorOpen: (open) => set({ isInspectorOpen: open }),

  isHistoryOpen: false,
  setIsHistoryOpen: (open) => set({ isHistoryOpen: open }),
  toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),

  isCommentMode: false,
  setIsCommentMode: (active) => set({ isCommentMode: active }),
  toggleCommentMode: () => set((state) => ({ isCommentMode: !state.isCommentMode })),
  newCommentTarget: null,
  setNewCommentTarget: (target) => set({ newCommentTarget: target }),

  loadStarterTemplate: () =>
    set({
      nodes: INITIAL_NODES,
      edges: INITIAL_EDGES,
      selectedNodeId: null,
      selectedEdgeId: null,
      isInspectorOpen: false,
    }),

  clearCanvas: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    }),
}));
