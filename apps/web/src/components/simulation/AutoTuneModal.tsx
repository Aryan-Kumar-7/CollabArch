'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Zap,
  TrendingDown,
  CheckCircle2,
  X,
  Server,
  ArrowRight,
  Loader2,
  AlertOctagon,
  Layers,
  Activity,
  Check,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { AutoTuneResult, AutoTuneTelemetry } from '@collabarch/shared-types';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

interface AutoTuneModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AutoTuneResult | null;
  telemetry: AutoTuneTelemetry | null;
  onApplied?: () => void;
}

export function AutoTuneModal({
  isOpen,
  onClose,
  result,
  telemetry,
  onApplied,
}: AutoTuneModalProps) {
  const { getToken } = useAuth();
  const { nodes, roomId, applyAutoTune } = useCanvasStore();

  const [mounted, setMounted] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isApplying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isApplying, onClose]);

  if (!isOpen || !mounted || !result) {
    return null;
  }

  const handleApply = async () => {
    if (!result?.adjustments?.length) return;
    setIsApplying(true);

    try {
      // 1. Mutate active canvas nodes in useCanvasStore and immediately relieve simulation queues
      applyAutoTune(result.adjustments);

      // 2. Trigger CRDT room update on server if connected to a room
      if (roomId) {
        const token = await getToken().catch(() => null);
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
        await fetch(`${serverUrl}/ai/apply-auto-tune`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            roomId,
            adjustments: result.adjustments,
          }),
        }).catch((err) => {
          console.warn('[AutoTuneModal] Room sync failed (running in offline/local mode):', err);
        });
      }

      setAppliedSuccess(true);
      if (onApplied) {
        onApplied();
      }

      // Close modal after brief success confirmation
      setTimeout(() => {
        setIsApplying(false);
        setAppliedSuccess(false);
        onClose();
      }, 750);
    } catch (err) {
      console.error('[AutoTuneModal] Failed applying auto-tune adjustments:', err);
      setIsApplying(false);
    }
  };

  const ingressRps = telemetry?.ingressRps || 0;
  const currentDropRate = telemetry?.dropRatePct ?? 0;
  const currentP99 = telemetry?.p99LatencyMs ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-indigo-500/10 overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="autotune-modal-title"
      >
        {/* Top gradient accent line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-500/25">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="autotune-modal-title" className="text-base font-bold tracking-tight">
                  AI Capacity Auto-Tuner
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-2.5 w-2.5" />
                  SRE Little&apos;s Law Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target Workload:{' '}
                <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                  {ingressRps.toLocaleString()} Ingress RPS
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isApplying}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Comparison KPI Widget */}
          <div className="grid grid-cols-2 gap-3">
            {/* Packet Drop Rate Delta */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <span>Packet Drop Rate</span>
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-mono text-xs font-bold',
                    currentDropRate > 0
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  )}
                >
                  {currentDropRate.toFixed(1)}% Current
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {result.predictedDropRatePct.toFixed(1)}% Predicted
                </div>
              </div>
            </div>

            {/* p99 Latency Delta */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <span>p99 Tail Latency</span>
                <Activity className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-mono text-xs font-bold',
                    currentP99 > 100
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  )}
                >
                  {Math.round(currentP99)}ms Current
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {Math.round(result.predictedP99Ms)}ms Predicted
                </div>
              </div>
            </div>
          </div>

          {/* SRE Executive Summary */}
          <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/25 p-3.5 flex gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">SRE Analysis: </span>
              {result.summary}
            </div>
          </div>

          {/* List of Proposed Adjustments */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Proposed Little&apos;s Law Capacity Adjustments ({result.adjustments.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Calculated for λ = {ingressRps.toLocaleString()} RPS
              </span>
            </div>

            <div className="space-y-2.5">
              {result.adjustments.map((adj) => {
                const targetNode = nodes.find((n) => n.id === adj.nodeId);
                const currentData = targetNode?.data;

                return (
                  <div
                    key={adj.nodeId}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-3.5 space-y-2 shadow-xs"
                  >
                    {/* Node Header & Diffs */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Server className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {adj.nodeLabel}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ID: {adj.nodeId}
                          </div>
                        </div>
                      </div>

                      {/* Diff Pills */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {adj.changes.replicas !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300">
                            Replicas: {currentData?.replicas ?? 1} → {adj.changes.replicas}
                          </span>
                        )}

                        {adj.changes.cacheHitRatio !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300">
                            Cache Hit Ratio: {Math.round(((currentData?.cacheHitRatio as number) || 0) * 100)}% → {Math.round(adj.changes.cacheHitRatio * 100)}%
                          </span>
                        )}

                        {adj.changes.capacityRps !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            Capacity: {(currentData?.capacityRps || 1000).toLocaleString()} → {adj.changes.capacityRps.toLocaleString()} RPS
                          </span>
                        )}

                        {adj.changes.queueDepthLimit !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                            Queue Limit: {(currentData?.queueDepthLimit || 500).toLocaleString()} → {adj.changes.queueDepthLimit.toLocaleString()} pkts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rationale */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800/60 leading-relaxed font-sans">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Rationale: </span>
                      {adj.rationale}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={isApplying}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50',
              appliedSuccess
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25'
                : 'bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 shadow-indigo-500/25 hover:shadow-indigo-500/40'
            )}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Applying Little&apos;s Law Optimizations...</span>
              </>
            ) : appliedSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>Optimizations Applied!</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>⚡ Apply Optimizations to Live System</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

