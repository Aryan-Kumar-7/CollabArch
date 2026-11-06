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
  X,
  Zap,
  Cable,
  Database,
  Layers,
  Shield,
  Boxes,
  Cloud,
  Percent,
  Timer,
  Server,
  Lock,
  Radio,
  Search as SearchIcon,
  Key,
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

  const isBoundary = selectedNode?.type === 'boundary';
  const isDatabase = selectedNode?.type === 'database';
  const isNoSql = selectedNode?.type === 'nosql';
  const isCache = selectedNode?.type === 'cache';
  const isSearch = selectedNode?.type === 'search';
  const isAuth = selectedNode?.type === 'auth';
  const isWebSocket = selectedNode?.type === 'websocket';

  return (
    <aside
      className={cn(
        'relative flex flex-col border-l border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/85 backdrop-blur-xl transition-all duration-300 z-30',
        isInspectorOpen ? 'w-84' : 'w-0 border-l-0'
      )}
    >
      {/* Outside Floating Toggle Tab - Visible when Inspector is Open */}
      {isInspectorOpen && (
        <button
          onClick={toggleInspector}
          className="absolute -left-7 top-4 z-30 flex h-7 w-7 items-center justify-center rounded-l-md border border-r-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Collapse inspector"
          aria-label="Collapse inspector"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {isInspectorOpen && (
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 p-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                {selectedNode
                  ? isBoundary
                    ? 'Boundary Inspector'
                    : 'Node Inspector'
                  : selectedEdge
                  ? 'Edge Inspector'
                  : 'Inspector'}
              </h2>
            </div>
            {(selectedNode || selectedEdge) && (
              <button
                onClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title="Deselect"
                aria-label="Deselect element"
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

                  {/* Component Name */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                      {isBoundary ? 'Boundary Label' : 'Component Name'}
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
                      <FileText className="h-3 w-3 text-slate-400 dark:text-slate-500" />{' '}
                      {isBoundary ? 'Network Boundary Scope' : 'Architectural Purpose'}
                    </label>
                    <textarea
                      rows={2}
                      value={selectedNode.data.description || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { description: e.target.value })
                      }
                      placeholder={
                        isBoundary
                          ? 'e.g. Production VPC with multi-AZ private subnets...'
                          : 'Specify the role of this service...'
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                    />
                  </div>
                </div>

                {/* SPECIALIZED DEEP CONFIGURATION: BOUNDARY NODE */}
                {isBoundary && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />{' '}
                      Boundary Configuration
                    </div>

                    {/* Boundary Type Selector */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Cloud className="h-3.5 w-3.5 text-indigo-500" /> Boundary Type
                      </label>
                      <select
                        value={
                          selectedNode.data.boundaryType === 'vpc'
                            ? 'VPC Boundary'
                            : selectedNode.data.boundaryType === 'subnet'
                            ? selectedNode.data.label?.toLowerCase().includes('public')
                              ? 'Public Subnet'
                              : 'Private Subnet'
                            : selectedNode.data.boundaryType === 'k8s-cluster'
                            ? 'Kubernetes Cluster'
                            : 'VPC Boundary'
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          let bType: 'vpc' | 'subnet' | 'k8s-cluster' | 'security-group' = 'vpc';
                          if (val === 'Private Subnet' || val === 'Public Subnet') {
                            bType = 'subnet';
                          } else if (val === 'Kubernetes Cluster') {
                            bType = 'k8s-cluster';
                          }
                          updateNodeData(selectedNode.id, {
                            boundaryType: bType,
                            label: selectedNode.data.label.startsWith('VPC:') ||
                              selectedNode.data.label.includes('Subnet') ||
                              selectedNode.data.label.includes('Cluster')
                              ? `${val}: ${selectedNode.id.substring(5, 9)}`
                              : selectedNode.data.label,
                          });
                        }}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="VPC Boundary">VPC Boundary</option>
                        <option value="Private Subnet">Private Subnet</option>
                        <option value="Public Subnet">Public Subnet</option>
                        <option value="Kubernetes Cluster">Kubernetes Cluster</option>
                      </select>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed pt-1">
                        Resize boundary corners on canvas to enclose internal services and databases.
                      </p>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED DEEP CONFIGURATION: DATABASE NODE */}
                {isDatabase && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />{' '}
                      Database Deep Specs
                    </div>

                    {/* Engine Selector */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-emerald-500" /> Engine Selector
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {selectedNode.data.engine || 'PostgreSQL (ACID)'}
                        </span>
                      </label>
                      <select
                        value={selectedNode.data.engine || 'PostgreSQL (ACID)'}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { engine: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="PostgreSQL (ACID)">PostgreSQL (ACID)</option>
                        <option value="MySQL">MySQL</option>
                        <option value="MongoDB (Document)">MongoDB (Document)</option>
                        <option value="DynamoDB (Key-Value)">DynamoDB (Key-Value)</option>
                        <option value="Cassandra">Cassandra</option>
                      </select>
                    </div>

                    {/* Replication Slider */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Copy className="h-3.5 w-3.5 text-emerald-500" /> Read Replicas
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {selectedNode.data.replicas && selectedNode.data.replicas > 1
                            ? `1 Primary + ${selectedNode.data.replicas - 1} Read Replicas`
                            : '1 Primary'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={selectedNode.data.replicas || 1}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            replicas: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        <span>1 Primary</span>
                        <span>5 Read Replicas</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED DEEP CONFIGURATION: CACHE (REDIS) NODE */}
                {isCache && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />{' '}
                      Cache Configuration
                    </div>

                    {/* Cache Hit Ratio Slider */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Percent className="h-3.5 w-3.5 text-rose-500" /> Cache Hit Ratio
                        </span>
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          {Math.round(((selectedNode.data.cacheHitRatio as number) ?? 0.85) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={0.99}
                        step={0.01}
                        value={(selectedNode.data.cacheHitRatio as number) ?? 0.85}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            cacheHitRatio: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        <span>50%</span>
                        <span>99%</span>
                      </div>
                    </div>

                    {/* TTL (Time to Live) Input */}
                    <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Timer className="h-3.5 w-3.5 text-rose-500" /> TTL (Time to Live)
                        </span>
                        <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          {selectedNode.data.ttl || 3600}s
                        </span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={604800}
                        value={selectedNode.data.ttl || 3600}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            ttl: Math.max(1, Number(e.target.value) || 60),
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:border-rose-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5 pt-1">
                        {[
                          { label: '60s', val: 60 },
                          { label: '5m', val: 300 },
                          { label: '1h', val: 3600 },
                          { label: '24h', val: 86400 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => updateNodeData(selectedNode.id, { ttl: preset.val })}
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-mono border transition-colors',
                              (selectedNode.data.ttl || 3600) === preset.val
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40 font-semibold'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-700'
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED DEEP CONFIGURATION: NOSQL DOCUMENT STORE */}
                {isNoSql && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />{' '}
                      NoSQL Document Specs
                    </div>

                    {/* NoSQL Engine Selector */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-emerald-600" /> Database Engine
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {selectedNode.data.engine || 'MongoDB (Document)'}
                        </span>
                      </label>
                      <select
                        value={selectedNode.data.engine || 'MongoDB (Document)'}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { engine: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="MongoDB (Document)">MongoDB (Document)</option>
                        <option value="DynamoDB (Key-Value)">DynamoDB (Key-Value)</option>
                        <option value="Cassandra (Columnar)">Cassandra (Columnar)</option>
                        <option value="Couchbase">Couchbase</option>
                        <option value="Firebase Firestore">Firebase Firestore</option>
                      </select>
                    </div>

                    {/* Shards / Replicas Slider */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Copy className="h-3.5 w-3.5 text-emerald-600" /> Cluster Shards / Nodes
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {selectedNode.data.replicas && selectedNode.data.replicas > 1
                            ? `${selectedNode.data.replicas} Shards / Replicas`
                            : '1 Shard (Single)'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={selectedNode.data.replicas || 3}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            replicas: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                  </div>
                )}

                {/* SPECIALIZED DEEP CONFIGURATION: SEARCH ENGINE */}
                {isSearch && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <SearchIcon className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />{' '}
                      Search Engine Architecture
                    </div>

                    {/* Search Engine Selector */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-rose-500" /> Search Core
                        </span>
                        <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          {selectedNode.data.engine || 'Elasticsearch'}
                        </span>
                      </label>
                      <select
                        value={selectedNode.data.engine || 'Elasticsearch'}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { engine: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-rose-500 focus:outline-none"
                      >
                        <option value="Elasticsearch">Elasticsearch</option>
                        <option value="OpenSearch">OpenSearch</option>
                        <option value="Meilisearch">Meilisearch</option>
                        <option value="Algolia">Algolia</option>
                        <option value="Typesense">Typesense</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED DEEP CONFIGURATION: AUTH SERVICE */}
                {isAuth && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />{' '}
                      Identity & Auth Provider
                    </div>

                    {/* Auth Protocol / Provider */}
                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-amber-500" /> Identity Provider
                        </span>
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          {selectedNode.data.engine || 'OAuth 2.0 / OIDC'}
                        </span>
                      </label>
                      <select
                        value={selectedNode.data.engine || 'OAuth 2.0 / OIDC'}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { engine: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="OAuth 2.0 / OIDC">OAuth 2.0 / OIDC</option>
                        <option value="Clerk Auth">Clerk Auth</option>
                        <option value="Auth0">Auth0</option>
                        <option value="Supabase Auth">Supabase Auth</option>
                        <option value="AWS Cognito">AWS Cognito</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED DEEP CONFIGURATION: WEBSOCKET GATEWAY */}
                {isWebSocket && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />{' '}
                      Real-Time Transport Specs
                    </div>

                    <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Cable className="h-3.5 w-3.5 text-cyan-500" /> Socket Protocol
                      </label>
                      <select
                        value={selectedNode.data.engine || 'WSS (Secure WebSocket)'}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { engine: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="WSS (Secure WebSocket)">WSS (Secure WebSocket)</option>
                        <option value="Socket.io">Socket.io</option>
                        <option value="MQTT over WS">MQTT over WS</option>
                        <option value="GraphQL Subscriptions">GraphQL Subscriptions</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Performance Parameters (Shown for non-boundary nodes) */}
                {!isBoundary && (
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
                  </div>
                )}

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
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">From:</span> {selectedEdge.source}
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">To:</span> {selectedEdge.target}
                    </div>
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
                  Click any service, gateway, queue, database, boundary, or connection line on the canvas to configure its properties.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
