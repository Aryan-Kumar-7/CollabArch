'use client';

import React, { useState } from 'react';
import {
  Globe,
  Split,
  Cpu,
  Flame,
  ExternalLink,
  Database,
  Zap,
  HardDrive,
  Binary,
  Layers,
  Shield,
  Boxes,
  Cloud,
  Plus,
  GripVertical,
  Search,
  Sparkles,
  Layers3,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Info,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { ComponentType, NodeData, DEFAULT_COMPONENT_CONFIGS } from '@collabarch/shared-types';
import { useCanvasStore, CustomComponentDefinition } from '@/store/canvas-store';
import { cn } from '@/lib/utils';
import { ICON_MAP } from '@/components/nodes/ArchitectureNodes';
import { CustomComponentModal } from './CustomComponentModal';

interface PaletteItemDefinition {
  type: ComponentType;
  title: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  badgeBg: string;
  borderClass: string;
  capacityText: string;
  customData?: Partial<NodeData>;
}

interface PaletteSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: PaletteItemDefinition[];
}

const SECTIONS: PaletteSection[] = [
  {
    id: 'networking',
    title: 'Networking & Ingress',
    icon: Network,
    items: [
      {
        type: 'api-gateway',
        title: 'API Gateway',
        badge: 'Edge Ingress',
        description: 'Reverse proxy, SSL termination, JWT validation, and upstream rate limiting.',
        icon: Globe,
        colorClass: 'text-sky-400',
        bgClass: 'bg-sky-500/10',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        borderClass: 'hover:border-sky-500/50',
        capacityText: '5,000 RPS',
      },
      {
        type: 'load-balancer',
        title: 'Load Balancer',
        badge: 'L4/L7 Balancer',
        description: 'High-availability traffic distributor & automated health check balancer.',
        icon: Split,
        colorClass: 'text-sky-400',
        bgClass: 'bg-sky-500/10',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        borderClass: 'hover:border-sky-500/50',
        capacityText: '15,000 RPS',
      },
      {
        type: 'websocket',
        title: 'WebSocket Gateway',
        badge: 'Full-Duplex',
        description: 'Persistent bidirectional WebSocket gateway managing client subscriptions and broadcast.',
        icon: Radio,
        colorClass: 'text-cyan-400',
        bgClass: 'bg-cyan-500/10',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        borderClass: 'hover:border-cyan-500/50',
        capacityText: '20,000 RPS',
      },
      {
        type: 'cdn',
        title: 'CDN Edge',
        badge: 'Edge PoP',
        description: 'Global content delivery network caching static assets and dynamic API routes.',
        icon: Globe,
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-500/10',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        borderClass: 'hover:border-purple-500/50',
        capacityText: '25,000 RPS',
      },
    ],
  },
  {
    id: 'compute',
    title: 'Compute',
    icon: Cpu,
    items: [
      {
        type: 'service',
        title: 'Microservice',
        badge: 'Stateless Worker',
        description: 'Containerized business logic service handling transactional API operations.',
        icon: Cpu,
        colorClass: 'text-indigo-400',
        bgClass: 'bg-indigo-500/10',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        borderClass: 'hover:border-indigo-500/50',
        capacityText: '1,200 RPS',
      },
      {
        type: 'serverless',
        title: 'Serverless Function',
        badge: 'On-Demand',
        description: 'Event-driven on-demand compute function with autoscaling and low idle cost.',
        icon: Flame,
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-500/10',
        badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        borderClass: 'hover:border-orange-500/50',
        capacityText: '3,000 RPS',
      },
      {
        type: 'auth',
        title: 'Auth & Identity (IdP)',
        badge: 'OAuth / OIDC',
        description: 'Centralized authentication authority validating tokens and issuing identity credentials.',
        icon: ShieldCheck,
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-500/10',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        borderClass: 'hover:border-amber-500/50',
        capacityText: '2,500 RPS',
        customData: {
          label: 'Auth Service (IdP)',
          engine: 'OAuth 2.0 / OIDC',
        },
      },
      {
        type: 'external-api',
        title: 'External 3rd-Party API',
        badge: 'Vendor API',
        description: 'Downstream partner SaaS or vendor endpoint subject to rate limits & latency.',
        icon: ExternalLink,
        colorClass: 'text-slate-400',
        bgClass: 'bg-slate-500/10',
        badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        borderClass: 'hover:border-slate-500/50',
        capacityText: '500 RPS',
      },
    ],
  },
  {
    id: 'databases-caches',
    title: 'Databases & Caches',
    icon: Database,
    items: [
      {
        type: 'database',
        title: 'Relational DB',
        badge: 'ACID Store',
        description: 'Relational or document persistent database with connection pooling and replicas.',
        icon: Database,
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        borderClass: 'hover:border-emerald-500/50',
        capacityText: '800 RPS',
        customData: {
          label: 'Postgres Cluster',
          engine: 'PostgreSQL (ACID)',
          replicas: 1,
        },
      },
      {
        type: 'nosql',
        title: 'NoSQL Document Store',
        badge: 'Document DB',
        description: 'High-throughput document and key-value store with flexible schema modeling.',
        icon: Database,
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-600/10',
        badgeBg: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
        borderClass: 'hover:border-emerald-600/50',
        capacityText: '3,500 RPS',
        customData: {
          label: 'Document DB (MongoDB)',
          engine: 'MongoDB (Document)',
          replicas: 3,
        },
      },
      {
        type: 'cache',
        title: 'In-Memory Cache (Redis)',
        badge: 'Sub-MS Cache',
        description: 'Ultra-fast sub-millisecond in-memory key-value cache reducing database load.',
        icon: Zap,
        colorClass: 'text-rose-400',
        bgClass: 'bg-rose-500/10',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        borderClass: 'hover:border-rose-500/50',
        capacityText: '20,000 RPS',
        customData: {
          label: 'Redis Cache',
          engine: 'Redis',
          cacheHitRatio: 0.85,
          ttl: 3600,
        },
      },
      {
        type: 'storage',
        title: 'Object Storage (S3)',
        badge: 'Blob Store',
        description: 'Highly resilient distributed blob store for static media, backups, and user uploads.',
        icon: HardDrive,
        colorClass: 'text-cyan-400',
        bgClass: 'bg-cyan-500/10',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        borderClass: 'hover:border-cyan-500/50',
        capacityText: '4,000 RPS',
      },
      {
        type: 'vector-db',
        title: 'Vector DB',
        badge: 'AI Embeddings',
        description: 'High-dimensional vector embeddings store for AI/RAG similarity search.',
        icon: Binary,
        colorClass: 'text-teal-400',
        bgClass: 'bg-teal-500/10',
        badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        borderClass: 'hover:border-teal-500/50',
        capacityText: '1,500 RPS',
        customData: {
          label: 'Vector DB (Pinecone)',
          engine: 'Pinecone / pgvector',
        },
      },
      {
        type: 'search',
        title: 'Search Engine',
        badge: 'Full-Text',
        description: 'Distributed full-text search engine indexing structured and unstructured documents.',
        icon: Search,
        colorClass: 'text-rose-500',
        bgClass: 'bg-rose-500/10',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        borderClass: 'hover:border-rose-500/50',
        capacityText: '2,200 RPS',
        customData: {
          label: 'Elasticsearch Cluster',
          engine: 'Elasticsearch',
        },
      },
    ],
  },
  {
    id: 'streaming',
    title: 'Event Streaming',
    icon: Layers,
    items: [
      {
        type: 'queue',
        title: 'Message Queue (Kafka/SQS)',
        badge: 'FIFO Buffer',
        description: 'Distributed event bus for decoupled asynchronous tasks and event stream buffering.',
        icon: Layers,
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-500/10',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        borderClass: 'hover:border-amber-500/50',
        capacityText: '10,000 RPS',
      },
    ],
  },
  {
    id: 'boundaries',
    title: 'Cloud Boundaries',
    icon: Cloud,
    items: [
      {
        type: 'boundary',
        title: 'VPC Container',
        badge: 'VPC Boundary',
        description: 'Virtual Private Cloud boundary isolating subnets, security groups, and cloud services.',
        icon: Cloud,
        colorClass: 'text-indigo-400',
        bgClass: 'bg-indigo-500/10',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        borderClass: 'hover:border-indigo-500/50',
        capacityText: 'VPC us-east-1',
        customData: {
          label: 'VPC: us-east-1',
          boundaryType: 'vpc',
          description: 'Virtual Private Cloud Network Isolation',
        },
      },
      {
        type: 'boundary',
        title: 'Private Subnet',
        badge: 'Subnet CIDR',
        description: 'Isolated network partition inside a VPC with dedicated routing tables.',
        icon: Shield,
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        borderClass: 'hover:border-emerald-500/50',
        capacityText: '10.0.1.0/24',
        customData: {
          label: 'Private Subnet (10.0.1.0/24)',
          boundaryType: 'subnet',
          description: 'Private Subnet Boundary',
        },
      },
      {
        type: 'boundary',
        title: 'Kubernetes Cluster',
        badge: 'K8s Cluster',
        description: 'Container orchestration cluster enclosing namespaces, pods, and ingress controllers.',
        icon: Boxes,
        colorClass: 'text-sky-400',
        bgClass: 'bg-sky-500/10',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        borderClass: 'hover:border-sky-500/50',
        capacityText: 'EKS / GKE',
        customData: {
          label: 'K8s Cluster (Production)',
          boundaryType: 'k8s-cluster',
          description: 'Kubernetes Workload Cluster',
        },
      },
    ],
  },
];

export function ComponentPalette() {
  const {
    isSidebarOpen,
    toggleSidebar,
    addNode,
    nodes,
    edges,
    loadStarterTemplate,
    clearCanvas,
    customComponents,
    removeCustomComponent,
    setIsAiModalOpen,
  } = useCanvasStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const onDragStart = (
    event: React.DragEvent,
    type: ComponentType,
    customData?: Partial<NodeData>
  ) => {
    event.dataTransfer.setData('application/reactflow', type);
    if (customData) {
      event.dataTransfer.setData(
        'application/collabarch-node-data',
        JSON.stringify(customData)
      );
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (type: ComponentType, customData?: Partial<NodeData>) => {
    const x = 300 + Math.random() * 200;
    const y = 150 + Math.random() * 200;
    addNode(type, { x, y }, customData);
  };

  const handleCustomDragStart = (
    event: React.DragEvent,
    comp: CustomComponentDefinition
  ) => {
    event.dataTransfer.setData('application/reactflow', comp.type || 'service');
    event.dataTransfer.setData(
      'application/collabarch-node-data',
      JSON.stringify({
        label: comp.name,
        capacityRps: comp.baseRps,
        latencyMs: comp.latencyMs,
        queueDepthLimit: comp.queueDepthLimit || comp.baseRps * 2,
        failureRate: comp.failureRate || 0.005,
        customIcon: comp.iconName,
        customColor: comp.accentColor,
        isCustom: true,
        description: comp.description,
      })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCustomQuickAdd = (comp: CustomComponentDefinition) => {
    const x = 300 + Math.random() * 200;
    const y = 150 + Math.random() * 200;
    addNode(comp.type || 'service', { x, y }, {
      label: comp.name,
      capacityRps: comp.baseRps,
      latencyMs: comp.latencyMs,
      queueDepthLimit: comp.queueDepthLimit || comp.baseRps * 2,
      failureRate: comp.failureRate || 0.005,
      customIcon: comp.iconName,
      customColor: comp.accentColor,
      isCustom: true,
      description: comp.description,
    });
  };

  // Filter sections by search query
  const query = searchQuery.trim().toLowerCase();

  const filteredSections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.badge.toLowerCase().includes(query)
    ),
  })).filter((section) => section.items.length > 0);

  const filteredCustom = customComponents.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query))
  );

  return (
    <>
      <CustomComponentModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />

      <aside
        className={cn(
          'relative flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/85 backdrop-blur-xl transition-all duration-300 z-10',
          isSidebarOpen ? 'w-84' : 'w-0 border-r-0'
        )}
      >
        {/* Outside Floating Toggle Tab - Visible when Palette is Open */}
        {isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute -right-7 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-r-md border border-l-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {isSidebarOpen && (
          <div className="flex h-full flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                  <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                    Component Studio
                  </h2>
                </div>
              </div>

              {/* ✨ AI Architect Primary Card / Trigger Button */}
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-sky-500/10 via-indigo-500/15 to-purple-500/10 hover:from-sky-500/20 hover:via-indigo-500/25 hover:to-purple-500/20 hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all duration-200 group text-left cursor-pointer active:scale-[0.99]"
                title="Generate complete architecture with Google Gemini (Cmd+K / Ctrl+K)"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        AI Architect
                      </span>
                      <span className="rounded bg-indigo-500/20 border border-indigo-500/30 px-1 py-0.2 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300">
                        Gemini
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      Prompt-to-Diagram Generator
                    </p>
                  </div>
                </div>
                <kbd className="hidden sm:inline-flex items-center rounded border border-indigo-300 dark:border-indigo-700/60 bg-white/70 dark:bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600 dark:text-indigo-300 shrink-0 shadow-xs">
                  ⌘K
                </kbd>
              </button>

              {/* ➕ Custom Component Primary Button */}
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs transition-all duration-150 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4 text-sky-500" />
                <span>Custom Component</span>
              </button>

              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter cloud catalog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Collapsible Sections List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Custom Components Section (if any exist or matching search) */}
              {(filteredCustom.length > 0 || customComponents.length > 0) && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
                  <button
                    onClick={() => toggleSection('custom')}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Custom Components
                      </span>
                      <span className="rounded-full bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.2 text-[9px] font-mono text-pink-600 dark:text-pink-400">
                        {customComponents.length}
                      </span>
                    </div>
                    {collapsedSections['custom'] ? (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>

                  {!collapsedSections['custom'] && (
                    <div className="p-2 space-y-2 border-t border-slate-200/80 dark:border-slate-800/60">
                      {filteredCustom.map((comp) => {
                        const Icon = (comp.iconName && ICON_MAP[comp.iconName]) || Cpu;
                        return (
                          <div
                            key={comp.id}
                            draggable
                            onDragStart={(e) => handleCustomDragStart(e, comp)}
                            className="group relative flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-2.5 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md"
                            style={{ borderColor: `${comp.accentColor}40` }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  style={{
                                    backgroundColor: `${comp.accentColor}15`,
                                    borderColor: `${comp.accentColor}30`,
                                    color: comp.accentColor,
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border"
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {comp.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {comp.baseRps.toLocaleString()} RPS • {comp.latencyMs}ms
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleCustomQuickAdd(comp)}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
                                  title="Add to canvas"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => removeCustomComponent(comp.id)}
                                  className="rounded p-1 text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
                                  title="Delete custom component"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 5 Architectural Sections */}
              {filteredSections.map((section) => {
                const isCollapsed = collapsedSections[section.id];
                const SectionIcon = section.icon;

                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden transition-all"
                  >
                    {/* Section Collapsible Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <SectionIcon className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {section.title}
                        </span>
                        <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-600 dark:text-slate-400">
                          {section.items.length}
                        </span>
                      </div>
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Section Items */}
                    {!isCollapsed && (
                      <div className="p-2 space-y-2 border-t border-slate-200/80 dark:border-slate-800/60">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <div
                              key={item.title}
                              draggable
                              onDragStart={(e) => onDragStart(e, item.type, item.customData)}
                              className={cn(
                                'group relative flex flex-col rounded-xl border border-slate-200/80 dark:border-slate-800/70 bg-white dark:bg-slate-900/80 p-2.5 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-white dark:hover:bg-slate-900',
                                item.borderClass
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={cn(
                                      'flex h-7 w-7 items-center justify-center rounded-lg border border-black/5 dark:border-white/5',
                                      item.bgClass
                                    )}
                                  >
                                    <ItemIcon className={cn('h-3.5 w-3.5', item.colorClass)} />
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                      {item.title}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {item.capacityText}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <span
                                    className={cn(
                                      'rounded px-1.5 py-0.5 text-[9px] font-medium border',
                                      item.badgeBg
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                  <button
                                    onClick={() => handleQuickAdd(item.type, item.customData)}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
                                    title="Add to canvas"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>

                              <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/40 text-[9px] text-slate-400">
                                <div className="flex items-center gap-1">
                                  <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-600" />
                                  <span>Drag to canvas</span>
                                </div>
                                <span className="font-mono text-slate-500">
                                  {item.type}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Actions & Canvas Stats */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" /> Topology Stats
                </span>
                <div className="flex gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <span>{nodes.length} nodes</span>
                  <span>•</span>
                  <span>{edges.length} edges</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={loadStarterTemplate}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                  Template
                </button>
                <button
                  onClick={clearCanvas}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-200 transition-all shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
