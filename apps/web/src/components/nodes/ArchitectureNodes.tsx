'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Globe,
  Cpu,
  Database as DbIcon,
  Layers,
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
} from 'lucide-react';
import { ComponentType, NodeData } from '@collabarch/shared-types';
import { cn } from '@/lib/utils';
import { ReactFlowNode } from '@/store/canvas-store';

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

const TYPE_CONFIGS: Record<ComponentType, NodeStyleConfig> = {
  'api-gateway': {
    borderColor: 'border-sky-500/30',
    selectedBorderColor: 'border-sky-400',
    headerBg: 'bg-sky-950/40',
    glowClass: 'shadow-glow-gateway',
    iconBg: 'bg-sky-500/20 border-sky-400/40',
    iconColor: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    badgeText: 'API GATEWAY',
    label: 'API Gateway',
    icon: Globe,
  },
  service: {
    borderColor: 'border-indigo-500/30',
    selectedBorderColor: 'border-indigo-400',
    headerBg: 'bg-indigo-950/40',
    glowClass: 'shadow-glow-service',
    iconBg: 'bg-indigo-500/20 border-indigo-400/40',
    iconColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    badgeText: 'MICROSERVICE',
    label: 'Microservice',
    icon: Cpu,
  },
  database: {
    borderColor: 'border-emerald-500/30',
    selectedBorderColor: 'border-emerald-400',
    headerBg: 'bg-emerald-950/40',
    glowClass: 'shadow-glow-database',
    iconBg: 'bg-emerald-500/20 border-emerald-400/40',
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    badgeText: 'DATABASE',
    label: 'Database',
    icon: DbIcon,
  },
  queue: {
    borderColor: 'border-amber-500/30',
    selectedBorderColor: 'border-amber-400',
    headerBg: 'bg-amber-950/40',
    glowClass: 'shadow-glow-queue',
    iconBg: 'bg-amber-500/20 border-amber-400/40',
    iconColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
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
  const nodeType = (type || 'service') as ComponentType;
  const config = TYPE_CONFIGS[nodeType] || TYPE_CONFIGS.service;
  const Icon = config.icon;

  const failureRatePercent = ((data.failureRate || 0) * 100).toFixed(1);

  return (
    <div
      className={cn(
        'group relative min-w-[260px] rounded-xl border bg-slate-900/90 backdrop-blur-md transition-all duration-200',
        config.borderColor,
        selected
          ? cn(config.selectedBorderColor, config.glowClass, 'ring-1 ring-white/20')
          : 'hover:border-slate-500 hover:shadow-lg'
      )}
    >
      {/* Target & Source Handles (Top, Bottom, Left, Right) */}
      <Handle
        type="target"
        position={Position.Top}
        id="t-top"
        className="!h-2.5 !w-2.5 !bg-slate-400 !border-slate-950 hover:!bg-sky-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        className="!h-2.5 !w-2.5 !bg-slate-400 !border-slate-950 hover:!bg-sky-400"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        className="!h-2.5 !w-2.5 !bg-slate-400 !border-slate-950 hover:!bg-sky-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        className="!h-2.5 !w-2.5 !bg-slate-400 !border-slate-950 hover:!bg-sky-400"
      />

      {/* Header Bar */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2.5 rounded-t-xl',
          config.headerBg
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm',
              config.iconBg
            )}
          >
            <Icon className={cn('h-4 w-4', config.iconColor)} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 tracking-tight leading-tight">
              {data.label || config.label}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {id}
            </div>
          </div>
        </div>

        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase',
            config.badgeBg
          )}
        >
          {config.badgeText}
        </span>
      </div>

      {/* Body: Spec Metrics */}
      <div className="p-3 space-y-2 text-xs">
        {data.description && (
          <p className="text-[11px] text-slate-400 line-clamp-1 italic">
            {data.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* RPS Capacity */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
            <Gauge className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Capacity</div>
              <div className="text-[12px] font-semibold text-slate-200 font-mono truncate">
                {data.capacityRps?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">RPS</span>
              </div>
            </div>
          </div>

          {/* Base Latency */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
            <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Latency</div>
              <div className="text-[12px] font-semibold text-slate-200 font-mono truncate">
                {data.latencyMs || 0} <span className="text-[10px] text-slate-400">ms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Queue Depth Limit */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
            <Activity className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Queue Max</div>
              <div className="text-[12px] font-semibold text-slate-200 font-mono truncate">
                {data.queueDepthLimit?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          {/* Failure Rate */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
            <AlertTriangle
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                Number(failureRatePercent) > 1 ? 'text-rose-400' : 'text-slate-400'
              )}
            />
            <div className="overflow-hidden">
              <div className="text-[10px] text-slate-400 uppercase font-medium">Err Rate</div>
              <div
                className={cn(
                  'text-[12px] font-semibold font-mono truncate',
                  Number(failureRatePercent) > 1 ? 'text-rose-400' : 'text-slate-200'
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
                className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[9px] text-slate-300 font-mono"
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

// Concrete node components registered in React Flow nodeTypes
export const ApiGatewayNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="api-gateway" />
));

export const ServiceNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="service" />
));

export const DatabaseNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="database" />
));

export const QueueNode = memo((props: NodeProps<ReactFlowNode>) => (
  <ArchitectureNodeComponent {...props} type="queue" />
));
