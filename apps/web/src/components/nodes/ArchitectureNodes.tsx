'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import {
  Globe,
  Split,
  GitFork,
  Cpu,
  Flame,
  ExternalLink,
  Database as DbIcon,
  Zap,
  HardDrive,
  Binary,
  Layers,
  Shield,
  ShieldCheck,
  Server,
  Box,
  Boxes,
  Cloud,
  Terminal,
  Workflow,
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Lock,
  Radio,
  Search,
} from 'lucide-react';
import { ComponentType, NodeData } from '@collabarch/shared-types';
import { cn } from '@/lib/utils';
import { ReactFlowNode, useCanvasStore } from '@/store/canvas-store';

export const ICON_MAP: Record<string, React.ElementType> = {
  Globe,
  Split,
  GitFork,
  Cpu,
  Flame,
  ExternalLink,
  Database: DbIcon,
  Zap,
  HardDrive,
  Binary,
  Layers,
  Shield,
  ShieldCheck,
  Server,
  Box,
  Boxes,
  Cloud,
  Terminal,
  Workflow,
  Activity,
  Radio,
  Search,
  Lock,
};

interface NodeStyleConfig {
  borderColor: string;
  selectedBorderColor: string;
  headerBg: string;
  glowClass: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  label: string;
  icon: React.ElementType;
}

const TYPE_CONFIGS: Record<Exclude<ComponentType, 'boundary'>, NodeStyleConfig> = {
  'api-gateway': {
    borderColor: 'border-sky-500/30',
    selectedBorderColor: 'border-sky-500 dark:border-sky-400',
    headerBg: 'bg-sky-50/80 dark:bg-sky-950/40',
    glowClass: 'shadow-glow-gateway',
    iconBg: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30 dark:border-sky-400/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeBg: 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20 dark:border-sky-500/30',
    badgeText: 'API GATEWAY',
    label: 'API Gateway',
    icon: Globe,
  },
  'load-balancer': {
    borderColor: 'border-sky-500/30',
    selectedBorderColor: 'border-sky-500 dark:border-sky-400',
    headerBg: 'bg-sky-50/80 dark:bg-sky-950/40',
    glowClass: 'shadow-glow-gateway',
    iconBg: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30 dark:border-sky-400/40',
    iconColor: 'text-sky-500 dark:text-sky-400',
    badgeBg: 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20 dark:border-sky-500/30',
    badgeText: 'LOAD BALANCER',
    label: 'Load Balancer',
    icon: Split,
  },
  websocket: {
    borderColor: 'border-cyan-500/30',
    selectedBorderColor: 'border-cyan-500 dark:border-cyan-400',
    headerBg: 'bg-cyan-50/80 dark:bg-cyan-950/40',
    glowClass: 'shadow-glow-gateway',
    iconBg: 'bg-cyan-500/15 dark:bg-cyan-500/20 border-cyan-500/30 dark:border-cyan-400/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 dark:border-cyan-500/30',
    badgeText: 'WEBSOCKET WSS',
    label: 'WebSocket Gateway',
    icon: Radio,
  },
  cdn: {
    borderColor: 'border-purple-500/30',
    selectedBorderColor: 'border-purple-500 dark:border-purple-400',
    headerBg: 'bg-purple-50/80 dark:bg-purple-950/40',
    glowClass: 'shadow-glow-service',
    iconBg: 'bg-purple-500/15 dark:bg-purple-500/20 border-purple-500/30 dark:border-purple-400/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30',
    badgeText: 'EDGE CDN',
    label: 'CDN Edge',
    icon: Globe,
  },
  service: {
    borderColor: 'border-indigo-500/30',
    selectedBorderColor: 'border-indigo-500 dark:border-indigo-400',
    headerBg: 'bg-indigo-50/80 dark:bg-indigo-950/40',
    glowClass: 'shadow-glow-service',
    iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/20 border-indigo-500/30 dark:border-indigo-400/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 dark:border-indigo-500/30',
    badgeText: 'MICROSERVICE',
    label: 'Microservice',
    icon: Cpu,
  },
  serverless: {
    borderColor: 'border-orange-500/30',
    selectedBorderColor: 'border-orange-500 dark:border-orange-400',
    headerBg: 'bg-orange-50/80 dark:bg-orange-950/40',
    glowClass: 'shadow-glow-service',
    iconBg: 'bg-orange-500/15 dark:bg-orange-500/20 border-orange-500/30 dark:border-orange-400/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20 dark:border-orange-500/30',
    badgeText: 'SERVERLESS',
    label: 'Serverless',
    icon: Flame,
  },
  auth: {
    borderColor: 'border-amber-500/30',
    selectedBorderColor: 'border-amber-500 dark:border-amber-400',
    headerBg: 'bg-amber-50/80 dark:bg-amber-950/40',
    glowClass: 'shadow-glow-service',
    iconBg: 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30 dark:border-amber-400/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30',
    badgeText: 'AUTH IDP',
    label: 'Auth & IdP',
    icon: ShieldCheck,
  },
  'external-api': {
    borderColor: 'border-slate-500/30',
    selectedBorderColor: 'border-slate-500 dark:border-slate-400',
    headerBg: 'bg-slate-100/80 dark:bg-slate-900/60',
    glowClass: 'shadow-glow-service',
    iconBg: 'bg-slate-500/15 dark:bg-slate-500/20 border-slate-500/30 dark:border-slate-400/40',
    iconColor: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-500/10 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20 dark:border-slate-500/30',
    badgeText: 'EXTERNAL API',
    label: 'External API',
    icon: ExternalLink,
  },
  database: {
    borderColor: 'border-emerald-500/30',
    selectedBorderColor: 'border-emerald-500 dark:border-emerald-400',
    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    glowClass: 'shadow-glow-database',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-400/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30',
    badgeText: 'RELATIONAL DB',
    label: 'Database',
    icon: DbIcon,
  },
  nosql: {
    borderColor: 'border-emerald-600/30',
    selectedBorderColor: 'border-emerald-600 dark:border-emerald-500',
    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    glowClass: 'shadow-glow-database',
    iconBg: 'bg-emerald-600/15 dark:bg-emerald-600/20 border-emerald-600/30 dark:border-emerald-500/40',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    badgeBg: 'bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/20 dark:border-emerald-600/30',
    badgeText: 'NOSQL DOC',
    label: 'NoSQL Document Store',
    icon: DbIcon,
  },
  cache: {
    borderColor: 'border-rose-500/30',
    selectedBorderColor: 'border-rose-500 dark:border-rose-400',
    headerBg: 'bg-rose-50/80 dark:bg-rose-950/40',
    glowClass: 'shadow-glow-database',
    iconBg: 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/30 dark:border-rose-400/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20 dark:border-rose-500/30',
    badgeText: 'CACHE (REDIS)',
    label: 'Cache',
    icon: Zap,
  },
  storage: {
    borderColor: 'border-cyan-500/30',
    selectedBorderColor: 'border-cyan-500 dark:border-cyan-400',
    headerBg: 'bg-cyan-50/80 dark:bg-cyan-950/40',
    glowClass: 'shadow-glow-database',
    iconBg: 'bg-cyan-500/15 dark:bg-cyan-500/20 border-cyan-500/30 dark:border-cyan-400/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 dark:border-cyan-500/30',
    badgeText: 'OBJECT STORAGE',
    label: 'Storage',
    icon: HardDrive,
  },
  'vector-db': {
    borderColor: 'border-teal-500/30',
    selectedBorderColor: 'border-teal-500 dark:border-teal-400',
    headerBg: 'bg-teal-50/80 dark:bg-teal-950/40',
    glowClass: 'shadow-glow-database',
    iconBg: 'bg-teal-500/15 dark:bg-teal-500/20 border-teal-500/30 dark:border-teal-400/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
    badgeBg: 'bg-teal-500/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20 dark:border-teal-500/30',
    badgeText: 'VECTOR DB',
    label: 'Vector DB',
    icon: Binary,
  },
  search: {
    borderColor: 'border-rose-600/30',
    selectedBorderColor: 'border-rose-600 dark:border-rose-500',
    headerBg: 'bg-rose-50/80 dark:bg-rose-950/40',
    glowClass: 'shadow-glow-database',
    iconBg: 'bg-rose-600/15 dark:bg-rose-600/20 border-rose-600/30 dark:border-rose-500/40',
    iconColor: 'text-rose-700 dark:text-rose-400',
    badgeBg: 'bg-rose-600/10 dark:bg-rose-600/15 text-rose-800 dark:text-rose-300 border-rose-600/20 dark:border-rose-600/30',
    badgeText: 'SEARCH ENGINE',
    label: 'Search Engine',
    icon: Search,
  },
  queue: {
    borderColor: 'border-amber-500/30',
    selectedBorderColor: 'border-amber-500 dark:border-amber-400',
    headerBg: 'bg-amber-50/80 dark:bg-amber-950/40',
    glowClass: 'shadow-glow-queue',
    iconBg: 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30 dark:border-amber-400/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30',
    badgeText: 'MESSAGE QUEUE',
    label: 'Queue',
    icon: Layers,
  },
};

export const ArchitectureNodeComponent = memo(function ArchitectureNodeComponent({
  id,
  type,
  data,
  selected,
}: NodeProps<ReactFlowNode>) {
  const nodeType = (type && type !== 'boundary' ? type : 'service') as Exclude<ComponentType, 'boundary'>;
  const config = TYPE_CONFIGS[nodeType] || TYPE_CONFIGS.service;

  // Custom icon & color support for Custom Components
  const Icon = (data.customIcon && ICON_MAP[data.customIcon]) || config.icon;
  const failureRatePercent = ((data.failureRate || 0) * 100).toFixed(1);

  // Simulation Engine State & Chaos Monkey Hooks
  const isSimulating = useCanvasStore((s) => s.isSimulating);
  const isSimPaused = useCanvasStore((s) => s.isSimPaused);
  const simMetrics = useCanvasStore((s) => s.simMetrics);
  const simBottleneckNodeIds = useCanvasStore((s) => s.simBottleneckNodeIds);
  const injectChaos = useCanvasStore((s) => s.injectChaos);

  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const chaosMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isChaosOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (chaosMenuRef.current && !chaosMenuRef.current.contains(e.target as Node)) {
        setIsChaosOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isChaosOpen]);

  const nodeMetric = isSimulating ? simMetrics?.nodeMetrics?.[id] : undefined;
  const isBottleneck = isSimulating && !isSimPaused && simBottleneckNodeIds.includes(id);

  const queuePercent = nodeMetric
    ? Math.min(100, Math.round((nodeMetric.currentQueueDepth / Math.max(1, nodeMetric.maxQueueDepth)) * 100))
    : 0;

  // Dynamic custom accent border/glow when user customized color
  const customBorder = data.customColor ? { borderColor: data.customColor } : undefined;
  const customHeader = data.customColor ? { borderBottomColor: `${data.customColor}40` } : undefined;

  return (
    <div
      style={customBorder}
      className={cn(
        'group relative min-w-[270px] rounded-xl border bg-white/95 dark:bg-slate-900/90 backdrop-blur-md transition-all duration-200 shadow-sm dark:shadow-md',
        isBottleneck
          ? 'animate-pulse border-rose-500 shadow-rose-500/50 ring-2 ring-rose-500/60'
          : selected
            ? cn(config.selectedBorderColor, config.glowClass, 'ring-1 ring-sky-400/40 dark:ring-white/20')
            : cn(config.borderColor, 'hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-lg')
      )}
    >
      {/* Target & Source Handles (Top, Bottom, Left, Right) */}
      <Handle
        type="target"
        position={Position.Top}
        id="t-top"
        className="!h-2.5 !w-2.5 !bg-slate-400 dark:!bg-slate-500 !border-white dark:!border-slate-950 hover:!bg-sky-500 dark:hover:!bg-sky-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        className="!h-2.5 !w-2.5 !bg-slate-400 dark:!bg-slate-500 !border-white dark:!border-slate-950 hover:!bg-sky-500 dark:hover:!bg-sky-400"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        className="!h-2.5 !w-2.5 !bg-slate-400 dark:!bg-slate-500 !border-white dark:!border-slate-950 hover:!bg-sky-500 dark:hover:!bg-sky-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        className="!h-2.5 !w-2.5 !bg-slate-400 dark:!bg-slate-500 !border-white dark:!border-slate-950 hover:!bg-sky-500 dark:hover:!bg-sky-400"
      />

      {/* Header Bar */}
      <div
        style={customHeader}
        className={cn(
          'flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-3.5 py-2.5 rounded-t-xl',
          config.headerBg
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={data.customColor ? { borderColor: `${data.customColor}60`, color: data.customColor } : undefined}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm',
              config.iconBg
            )}
          >
            <Icon className={cn('h-4 w-4', !data.customColor && config.iconColor)} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {data.label || config.label}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              {id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chaos Monkey Injection Button & Menu */}
          <div className="relative" ref={chaosMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsChaosOpen(!isChaosOpen);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-xs hover:scale-110 active:scale-95 transition-all shadow-sm cursor-pointer select-none"
              title="Chaos Monkey Failure Injection"
            >
              💣
            </button>

            {isChaosOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl text-xs"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  Chaos Monkey
                </div>
                <button
                  type="button"
                  onClick={() => {
                    injectChaos(id, 'latency');
                    setIsChaosOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>⚡</span>
                  <span className="font-medium">Spike Latency (+500ms)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    injectChaos(id, 'crash');
                    setIsChaosOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>💥</span>
                  <span className="font-medium">Crash Node (100% Fail)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    injectChaos(id, 'restore');
                    setIsChaosOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>🔄</span>
                  <span className="font-medium">Restore Normal</span>
                </button>
              </div>
            )}
          </div>

          <span
            style={data.customColor ? { borderColor: `${data.customColor}40`, color: data.customColor } : undefined}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase',
              config.badgeBg
            )}
          >
            {data.isCustom ? 'CUSTOM' : config.badgeText}
          </span>
        </div>
      </div>

      {/* Body: Spec Metrics */}
      <div className="p-3 space-y-2 text-xs">
        {isSimulating && (
          <div className="rounded-xl border border-sky-500/30 dark:border-sky-500/40 bg-sky-500/10 dark:bg-sky-500/15 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Throughput
              </span>
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                ~{(nodeMetric?.currentRps ?? 0).toLocaleString()} RPS
              </span>
            </div>

            {/* Live Queue Depth Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Queue: {nodeMetric?.currentQueueDepth ?? 0} / {nodeMetric?.maxQueueDepth ?? data.queueDepthLimit ?? 500}
                </span>
                <span
                  className={cn(
                    'font-mono font-bold',
                    queuePercent >= 80
                      ? 'text-rose-600 dark:text-rose-400'
                      : queuePercent >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {queuePercent}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-150 rounded-full',
                    queuePercent >= 80
                      ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      : queuePercent >= 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  )}
                  style={{ width: `${queuePercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {data.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
            {data.description}
          </p>
        )}

        {/* Specialized Cloud Specs for Databases & Caches */}
        {nodeType === 'database' && (
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-emerald-700 dark:text-emerald-300 font-mono">
              {data.engine || 'PostgreSQL'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {data.replicas && data.replicas > 1
                ? `1 Primary + ${data.replicas - 1} Replicas`
                : '1 Primary (Standalone)'}
            </span>
          </div>
        )}

        {nodeType === 'nosql' && (
          <div className="flex items-center justify-between rounded-lg bg-emerald-600/10 border border-emerald-600/20 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-emerald-800 dark:text-emerald-300 font-mono">
              {data.engine || 'MongoDB (Document)'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {data.replicas ? `${data.replicas} Shards` : 'Replica Set'}
            </span>
          </div>
        )}

        {nodeType === 'search' && (
          <div className="flex items-center justify-between rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-rose-700 dark:text-rose-300 font-mono">
              {data.engine || 'Elasticsearch'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Inverted Index
            </span>
          </div>
        )}

        {nodeType === 'auth' && (
          <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-amber-700 dark:text-amber-300 font-mono">
              {data.engine || 'OAuth 2.0 / OIDC'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              JWT Sessions
            </span>
          </div>
        )}

        {nodeType === 'websocket' && (
          <div className="flex items-center justify-between rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-cyan-700 dark:text-cyan-300 font-mono">
              Full-Duplex WSS
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Sub / Pub
            </span>
          </div>
        )}

        {nodeType === 'cache' && (
          <div className="flex items-center justify-between rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-rose-700 dark:text-rose-300 font-mono">
              Hit Ratio: {Math.round(((data.cacheHitRatio as number) ?? 0.85) * 100)}%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              TTL: {data.ttl ? `${data.ttl}s` : '3600s'}
            </span>
          </div>
        )}

        {nodeType === 'vector-db' && (
          <div className="flex items-center justify-between rounded-lg bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-teal-700 dark:text-teal-300 font-mono">
              {data.engine || 'Pinecone / pgvector'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Cosine Metric
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* RPS Capacity */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 dark:bg-slate-950/60 p-2 border border-slate-200/80 dark:border-slate-800/60">
            <Gauge className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Capacity</div>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">
                {data.capacityRps?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 dark:text-slate-500">RPS</span>
              </div>
            </div>
          </div>

          {/* Base Latency */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 dark:bg-slate-950/60 p-2 border border-slate-200/80 dark:border-slate-800/60">
            <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Latency</div>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">
                {data.latencyMs || 0} <span className="text-[10px] text-slate-400 dark:text-slate-500">ms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Queue Depth Limit */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 dark:bg-slate-950/60 p-2 border border-slate-200/80 dark:border-slate-800/60">
            <Activity className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Queue Max</div>
              <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">
                {data.queueDepthLimit?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          {/* Failure Rate */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-100/70 dark:bg-slate-950/60 p-2 border border-slate-200/80 dark:border-slate-800/60">
            <AlertTriangle
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                Number(failureRatePercent) > 1 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Err Rate</div>
              <div
                className={cn(
                  'text-[12px] font-semibold font-mono truncate',
                  Number(failureRatePercent) > 1 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                )}
              >
                {failureRatePercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-transparent px-1.5 py-0.5 text-[9px] text-slate-700 dark:text-slate-300 font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pulsing online status indicator */}
      <div className="absolute top-3 right-3 flex items-center">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
    </div>
  );
});

/**
 * BoundaryNode: Renders a dashed/bordered semi-transparent container
 * with a top-left badge (e.g. [ VPC: us-east-1 ]) and supports resizing handles.
 */
export const BoundaryNode = memo(function BoundaryNode({
  id,
  data,
  selected,
}: NodeProps<ReactFlowNode>) {
  const boundaryType = data.boundaryType || 'vpc';

  // Distinct styling based on boundaryType
  const getBoundaryTheme = () => {
    switch (boundaryType) {
      case 'subnet':
        return {
          border: 'border-emerald-500/50 dark:border-emerald-400/40',
          bg: 'bg-emerald-50/20 dark:bg-emerald-950/15',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
          badgeText: `[ SUBNET: ${data.label || 'Private Subnet'} ]`,
          icon: Shield,
        };
      case 'k8s-cluster':
        return {
          border: 'border-sky-500/50 dark:border-sky-400/40',
          bg: 'bg-sky-50/20 dark:bg-sky-950/15',
          badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300',
          badgeText: `[ K8S: ${data.label || 'Production Cluster'} ]`,
          icon: Boxes,
        };
      case 'security-group':
        return {
          border: 'border-amber-500/50 dark:border-amber-400/40',
          bg: 'bg-amber-50/20 dark:bg-amber-950/15',
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
          badgeText: `[ SEC-GRP: ${data.label || 'Default SG'} ]`,
          icon: Lock,
        };
      case 'vpc':
      default:
        return {
          border: 'border-indigo-500/50 dark:border-indigo-400/40',
          bg: 'bg-indigo-50/20 dark:bg-indigo-950/15',
          badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300',
          badgeText: `[ VPC: ${data.label || 'us-east-1'} ]`,
          icon: Cloud,
        };
    }
  };

  const theme = getBoundaryTheme();
  const Icon = theme.icon;

  return (
    <div
      className={cn(
        'group relative h-full w-full min-w-[340px] min-h-[220px] rounded-2xl border-2 border-dashed transition-all duration-200 backdrop-blur-[1px]',
        theme.border,
        theme.bg,
        selected
          ? 'ring-2 ring-indigo-500/50 shadow-xl'
          : 'hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-md'
      )}
    >
      {/* Resizing handles */}
      <NodeResizer
        minWidth={300}
        minHeight={180}
        isVisible={Boolean(selected)}
        lineClassName="!border-indigo-500/80"
        handleClassName="!h-3 !w-3 !bg-white dark:!bg-slate-900 !border-2 !border-indigo-500 !rounded-sm shadow-md"
      />

      {/* Top-Left Badge Header */}
      <div className="absolute top-3 left-3 flex items-center gap-2 select-none pointer-events-auto">
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg border backdrop-blur-md shadow-sm text-xs font-mono font-semibold',
            theme.badgeBg
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{theme.badgeText}</span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          {id}
        </span>
      </div>

      {/* Description / Subtitle in top right if set */}
      {data.description && (
        <div className="absolute top-3 right-4 max-w-[240px] truncate text-[11px] text-slate-400 dark:text-slate-500 font-mono italic select-none">
          {data.description}
        </div>
      )}
    </div>
  );
});

// Concrete node components registered in React Flow nodeTypes
export const ApiGatewayNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="api-gateway" />
));

export const LoadBalancerNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="load-balancer" />
));

export const WebSocketNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="websocket" />
));

export const CdnNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="cdn" />
));

export const ServiceNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="service" />
));

export const ServerlessNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="serverless" />
));

export const AuthNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="auth" />
));

export const ExternalApiNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="external-api" />
));

export const DatabaseNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="database" />
));

export const NoSqlNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="nosql" />
));

export const CacheNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="cache" />
));

export const StorageNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="storage" />
));

export const VectorDbNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="vector-db" />
));

export const SearchNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="search" />
));

export const QueueNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="queue" />
));
