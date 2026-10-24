'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Trash2,
  Copy,
  Gauge,
  Clock,
  Activity,
  AlertTriangle,
  Tag,
  FileText,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Cable,
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';
import { ComponentType } from '@collabarch/shared-types';

export function NodeInspector() {
  const {
    selectedNodeId,
    selectedEdgeId,
    nodes,
    edges,
    updateNodeData,
    updateEdgeData,
    deleteNode,
    deleteEdge,
    duplicateNode,
    isInspectorOpen,
    toggleInspector,
    setSelectedNodeId,
    setSelectedEdgeId,
  } = useCanvasStore();

  const [newTagInput, setNewTagInput] = useState('');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  // Theoretical concurrency calculation (Little's Law approximation: L = lambda * W)
  const theoreticalConcurrency = selectedNode
    ? Math.round(
        (selectedNode.data.capacityRps * (selectedNode.data.latencyMs / 1000))
      )
    : 0;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim() && selectedNode) {
      e.preventDefault();
      const existingTags = selectedNode.data.tags || [];
      if (!existingTags.includes(newTagInput.trim().toLowerCase())) {
        updateNodeData(selectedNode.id, {
          tags: [...existingTags, newTagInput.trim().toLowerCase()],
        });
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedNode) return;
    const existingTags = selectedNode.data.tags || [];
    updateNodeData(selectedNode.id, {
      tags: existingTags.filter((t) => t !== tagToRemove),
    });
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col border-l border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/85 backdrop-blur-xl transition-all duration-300 z-10',
        isInspectorOpen ? 'w-84' : 'w-0 border-l-0'
      )}
    >
      {/* Floating Toggle Tab */}
      <button
        onClick={toggleInspector}
        className="absolute -left-7 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-l-md border border-r-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title={isInspectorOpen ? 'Collapse inspector' : 'Expand inspector'}
      >
        {isInspectorOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {isInspectorOpen && (
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 p-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-sky-500 dark:text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                {selectedNode ? 'Node Inspector' : selectedEdge ? 'Edge Inspector' : 'Inspector'}
              </h2>
            </div>
            {(selectedNode || selectedEdge) && (
              <button
                onClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Case 1: Node Selected */}
            {selectedNode && (
              <>
                {/* Node Identity & Type Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-300 font-mono uppercase">
                      {selectedNode.type}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {selectedNode.id}
                    </span>
                  </div>

                  {/* Label Input */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                      Component Name
                    </label>
                    <input
                      type="text"
                      value={selectedNode.data.label}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { label: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block flex items-center gap-1">
                      <FileText className="h-3 w-3 text-slate-400 dark:text-slate-500" /> Architectural Purpose
                    </label>
                    <textarea
                      rows={2}
                      value={selectedNode.data.description || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { description: e.target.value })
                      }
                      placeholder="Specify the role of this service..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                    />
                  </div>
                </div>

                {/* Performance Parameters (Architecture.md Specifications) */}
                <div className="space-y-4">
                  <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> Runtime Performance Specs
                  </div>

                  {/* 1. Capacity RPS */}
                  <div className="space-y-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Gauge className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" /> Throughput (RPS)
                      </span>
                      <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                        {selectedNode.data.capacityRps.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={25000}
                      step={100}
                      value={selectedNode.data.capacityRps}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          capacityRps: Number(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>100 RPS</span>
                      <span>25,000 RPS</span>
                    </div>
                  </div>

                  {/* 2. Processing Latency */}
                  <div className="space-y-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" /> Processing Latency
                      </span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {selectedNode.data.latencyMs} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={500}
                      step={1}
                      value={selectedNode.data.latencyMs}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          latencyMs: Number(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>1 ms</span>
                      <span>500 ms</span>
                    </div>
                  </div>

                  {/* 3. Queue Buffer Depth Limit */}
                  <div className="space-y-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Activity className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> Queue Depth Limit
                      </span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {selectedNode.data.queueDepthLimit.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100000}
                      step={50}
                      value={selectedNode.data.queueDepthLimit}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          queueDepthLimit: Number(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>50 items</span>
                      <span>100,000 items</span>
                    </div>
                  </div>

                  {/* 4. Simulated Failure Rate */}
                  <div className="space-y-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" /> Packet Failure Rate
                      </span>
                      <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {((selectedNode.data.failureRate || 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.2}
                      step={0.001}
                      value={selectedNode.data.failureRate || 0}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          failureRate: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>0.0% (Reliable)</span>
                      <span>20.0% (Degraded)</span>
                    </div>
                  </div>
                </div>

                {/* Theoretical Concurrency Preview */}
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/20 p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    Little&apos;s Law Capacity Preview
                  </div>
                  <div className="text-[12px] text-slate-600 dark:text-slate-300">
                    Max in-flight concurrency before queue saturation:
                  </div>
                  <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    ~{theoreticalConcurrency.toLocaleString()} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">active workers</span>
                  </div>
                </div>

                {/* Tags Editor */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Tag className="h-3 w-3 text-slate-400 dark:text-slate-500" /> Component Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedNode.data.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-transparent"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-500 dark:hover:text-rose-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Type tag and press Enter..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {/* Node Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={() => duplicateNode(selectedNode.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-200 transition-colors shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}

            {/* Case 2: Edge Selected */}
            {selectedEdge && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 font-mono">
                      EDGE CONNECTION
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {selectedEdge.id}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <div><span className="text-slate-400 dark:text-slate-500">From:</span> {selectedEdge.source}</div>
                    <div><span className="text-slate-400 dark:text-slate-500">To:</span> {selectedEdge.target}</div>
                  </div>
                </div>

                {/* Protocol Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Cable className="h-3 w-3 text-slate-400 dark:text-slate-500" /> Protocol
                  </label>
                  <select
                    value={selectedEdge.data?.protocol || 'HTTP'}
                    onChange={(e) =>
                      updateEdgeData(selectedEdge.id, { protocol: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="HTTP">HTTP/REST</option>
                    <option value="gRPC">gRPC / HTTP/2</option>
                    <option value="AMQP">AMQP (RabbitMQ)</option>
                    <option value="TCP">Raw TCP Socket</option>
                    <option value="WebSocket">WebSocket</option>
                  </select>
                </div>

                {/* Edge Latency */}
                <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Link Latency</span>
                    <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                      {selectedEdge.data?.latencyMs || 5} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={selectedEdge.data?.latencyMs || 5}
                    onChange={(e) =>
                      updateEdgeData(selectedEdge.id, {
                        latencyMs: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                {/* Delete Edge */}
                <button
                  onClick={() => deleteEdge(selectedEdge.id)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-200 transition-colors shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Connection
                </button>
              </div>
            )}

            {/* Case 3: Empty State */}
            {!selectedNode && !selectedEdge && (
              <div className="flex h-64 flex-col items-center justify-center text-center p-4">
                <div className="rounded-full bg-slate-100 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 mb-3">
                  <Sliders className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-300 mb-1">
                  No Component Selected
                </div>
                <p className="text-xs text-slate-500 max-w-[200px]">
                  Click any service, gateway, queue, or connection line on the canvas to configure its properties.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
