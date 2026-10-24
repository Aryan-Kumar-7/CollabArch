'use client';

import React, { useState } from 'react';
import {
  Globe,
  Cpu,
  Database,
  Layers,
  Plus,
  GripVertical,
  Search,
  Sparkles,
  Layers3,
  Trash2,
  ChevronLeft,
  Info,
} from 'lucide-react';
import { ComponentType, DEFAULT_COMPONENT_CONFIGS } from '@collabarch/shared-types';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

const PALETTE_ITEMS = [
  {
    type: 'api-gateway' as ComponentType,
    title: 'API Gateway',
    category: 'Ingress & Network',
    badge: 'Edge Ingress',
    description: 'Reverse proxy, SSL termination, JWT validation, and upstream rate limiting.',
    icon: Globe,
    colorClass: 'text-sky-400',
    borderClass: 'hover:border-sky-500/50',
    bgClass: 'bg-sky-500/10',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  {
    type: 'service' as ComponentType,
    title: 'Microservice',
    category: 'Compute & Logic',
    badge: 'Stateless Worker',
    description: 'Containerized business logic service handling transactional API operations.',
    icon: Cpu,
    colorClass: 'text-indigo-400',
    borderClass: 'hover:border-indigo-500/50',
    bgClass: 'bg-indigo-500/10',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  {
    type: 'database' as ComponentType,
    title: 'Database Cluster',
    category: 'State & Storage',
    badge: 'ACID Store',
    description: 'Relational or document persistent database with connection pooling and replicas.',
    icon: Database,
    colorClass: 'text-emerald-400',
    borderClass: 'hover:border-emerald-500/50',
    bgClass: 'bg-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    type: 'queue' as ComponentType,
    title: 'Message Queue / Bus',
    category: 'Messaging & Streaming',
    badge: 'FIFO Buffer',
    description: 'High-throughput event bus (Kafka/SQS) for decoupled asynchronous event streaming.',
    icon: Layers,
    colorClass: 'text-amber-400',
    borderClass: 'hover:border-amber-500/50',
    bgClass: 'bg-amber-500/10',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
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
  } = useCanvasStore();

  const [searchQuery, setSearchQuery] = useState('');

  const onDragStart = (event: React.DragEvent, type: ComponentType) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (type: ComponentType) => {
    // Drop near viewport center with random jitter
    const x = 300 + Math.random() * 200;
    const y = 150 + Math.random() * 200;
    addNode(type, { x, y });
  };

  const filteredItems = PALETTE_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl transition-all duration-300 z-10',
        isSidebarOpen ? 'w-80' : 'w-0 border-r-0'
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
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2 mb-2">
              <Layers3 className="h-4 w-4 text-sky-500 dark:text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                Architecture Palette
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag components onto the infinite canvas or click to place.
            </p>

            {/* Search filter */}
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Palette Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Cloud Primitives ({filteredItems.length})
            </div>

            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type)}
                  className={cn(
                    'group relative flex flex-col rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/50 p-3 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-white dark:hover:bg-slate-900',
                    item.borderClass
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg border border-black/5 dark:border-white/5',
                          item.bgClass
                        )}
                      >
                        <Icon className={cn('h-4 w-4', item.colorClass)} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.category}
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
                        onClick={() => handleQuickAdd(item.type)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title="Add to Canvas"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/40 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-600" />
                      <span>Drag to canvas</span>
                    </div>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {DEFAULT_COMPONENT_CONFIGS[item.type].defaultData.capacityRps.toLocaleString()} RPS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions & Canvas Stats */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" /> Graph Topology
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
  );
}
