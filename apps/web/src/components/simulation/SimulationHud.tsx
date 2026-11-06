'use client';

import React, { useState } from 'react';
import {
  Activity,
  Clock,
  AlertOctagon,
  Save,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Bot,
  Zap,
} from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';
import { AutoTuneResult, AutoTuneTelemetry } from '@collabarch/shared-types';
import { useCanvasStore } from '@/store/canvas-store';
import { AutoTuneModal } from './AutoTuneModal';
import { cn } from '@/lib/utils';
import { SERVER_URL } from '@/lib/config';

export function SimulationHud() {
  const {
    activeMode,
    isSimulating,
    simTrafficRps,
    simMetrics,
    simBottleneckNodeIds,
    nodes,
    edges,
    roomId,
  } = useCanvasStore();

  const { getToken } = useAuth();
  const { user } = useUser();

  const [isSaving, setIsSaving] = useState(false);
  const [isAutoTuning, setIsAutoTuning] = useState(false);
  const [autoTuneResult, setAutoTuneResult] = useState<AutoTuneResult | null>(null);
  const [autoTuneTelemetry, setAutoTuneTelemetry] = useState<AutoTuneTelemetry | null>(null);
  const [isAutoTuneModalOpen, setIsAutoTuneModalOpen] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  if (!isSimulating || activeMode !== 'simulator' || !simMetrics) {
    return null;
  }

  const getLatencyColor = (ms: number) => {
    if (ms < 50) return 'text-emerald-600 dark:text-emerald-400';
    if (ms < 150) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const bottleneckNode = simBottleneckNodeIds.length > 0
    ? nodes.find((n) => n.id === simBottleneckNodeIds[0])
    : null;
  const bottleneckLabel = bottleneckNode?.data?.label || simBottleneckNodeIds[0];

  const hasSaturation = simMetrics.errorRatePercent > 0 || simBottleneckNodeIds.length > 0;

  const handleAutoTune = async () => {
    if (!simMetrics) return;
    if (!nodes || nodes.length === 0) {
      setToast({
        type: 'error',
        message: 'Add components to canvas before running Auto-Tune.',
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setIsAutoTuning(true);
    setToast(null);

    const telemetry: AutoTuneTelemetry = {
      ingressRps: simTrafficRps,
      currentThroughputRps: simMetrics.systemThroughputRps,
      p99LatencyMs: Math.round(simMetrics.p99LatencyMs),
      dropRatePct: Math.round(simMetrics.errorRatePercent * 10) / 10,
      bottleneckNodeIds: simBottleneckNodeIds,
    };
    setAutoTuneTelemetry(telemetry);

    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_sim_architect',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${SERVER_URL}/ai/auto-tune`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nodes,
          edges,
          telemetry,
          roomId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Server returned ${res.status}`);
      }

      const result: AutoTuneResult = await res.json();
      setAutoTuneResult(result);
      setIsAutoTuneModalOpen(true);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.message || 'Failed to calculate auto-tune capacity.',
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsAutoTuning(false);
    }
  };

  const handleSaveBenchmark = async () => {
    if (!simMetrics) return;
    if (!nodes || nodes.length === 0) {
      setToast({
        type: 'error',
        message: 'Add components to canvas before saving benchmark.',
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setIsSaving(true);
    setToast(null);

    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_sim_architect',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        title: `${simTrafficRps.toLocaleString()} RPS Simulation`,
        trafficRps: simTrafficRps,
        p99LatencyMs: simMetrics.p99LatencyMs,
        errorRate: simMetrics.errorRatePercent / 100,
        bottleneckNodeId: simBottleneckNodeIds[0] || null,
        metricsSnapshot: simMetrics,
      };

      const res = await fetch(`${SERVER_URL}/rooms/${roomId}/simulations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Server returned ${res.status}`);
      }

      setSavedCount((c) => c + 1);
      setToast({
        type: 'success',
        message: 'Benchmark run saved to PostgreSQL!',
      });
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.message || 'Failed to save benchmark run',
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="absolute bottom-5 right-5 z-20 w-80 sm:w-92 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 p-4 backdrop-blur-xl shadow-2xl space-y-3.5 select-none transition-all duration-200">
        {/* HUD Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-500 animate-pulse" />
            <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Telemetry HUD
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Header AI Auto-Tune Pill */}
            <button
              onClick={handleAutoTune}
              disabled={isAutoTuning}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50 select-none shadow-xs',
                hasSaturation
                  ? 'bg-gradient-to-r from-rose-500 via-indigo-600 to-sky-600 text-white animate-pulse shadow-md shadow-indigo-500/30 hover:scale-105'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
              )}
              title="Inspect telemetry & calculate Little's Law capacity upgrades"
            >
              {isAutoTuning ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Tuning...</span>
                </>
              ) : (
                <>
                  <Bot className="h-3 w-3 text-current" />
                  <span>🤖 AI Auto-Tune</span>
                </>
              )}
            </button>

            {savedCount > 0 && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {savedCount} run{savedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Throughput */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-100 dark:border-slate-800/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
              Throughput
            </div>
            <div className="text-base font-bold font-mono text-sky-600 dark:text-sky-400 leading-tight mt-0.5">
              {simMetrics.systemThroughputRps.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">RPS</span>
            </div>
          </div>

          {/* Error Rate */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-100 dark:border-slate-800/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
              Drop Rate
            </div>
            <div
              className={cn(
                'text-base font-bold font-mono leading-tight mt-0.5',
                simMetrics.errorRatePercent === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : simMetrics.errorRatePercent < 2
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {simMetrics.errorRatePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Latency Percentiles */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-100 dark:border-slate-800/60 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-indigo-500" />
              Latency Profile
            </span>
            <span className="text-[9px] font-normal lowercase">&lt;50ms good | &gt;150ms slow</span>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
            <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-1.5 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[9px] text-slate-400">Average</div>
              <div className={cn('text-xs font-bold font-mono', getLatencyColor(simMetrics.averageLatencyMs))}>
                {Math.round(simMetrics.averageLatencyMs)}ms
              </div>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-1.5 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[9px] text-slate-400">p95</div>
              <div className={cn('text-xs font-bold font-mono', getLatencyColor(simMetrics.p95LatencyMs))}>
                {Math.round(simMetrics.p95LatencyMs)}ms
              </div>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-1.5 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[9px] text-slate-400">p99</div>
              <div className={cn('text-xs font-bold font-mono', getLatencyColor(simMetrics.p99LatencyMs))}>
                {Math.round(simMetrics.p99LatencyMs)}ms
              </div>
            </div>
          </div>
        </div>

        {/* Bottleneck Alert & Quick Auto-Tune Action */}
        {simBottleneckNodeIds.length > 0 && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 space-y-2 animate-pulse shadow-sm shadow-rose-500/20">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <div className="flex items-center gap-1.5 truncate">
                <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />
                <span className="truncate">
                  🚨 Bottleneck: <span className="font-bold">{bottleneckLabel}</span>
                </span>
              </div>
              <button
                onClick={handleAutoTune}
                disabled={isAutoTuning}
                className="shrink-0 flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] px-2 py-1 shadow-sm transition-all cursor-pointer"
              >
                <Zap className="h-3 w-3" />
                <span>Auto-Tune</span>
              </button>
            </div>
          </div>
        )}

        {/* Toast Feedback */}
        {toast && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2',
              toast.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            )}
            <span className="truncate">{toast.message}</span>
          </div>
        )}

        {/* Action Buttons: AI Auto-Tune & Save Benchmark */}
        <div className="space-y-2">
          <button
            onClick={handleAutoTune}
            disabled={isAutoTuning}
            className={cn(
              'flex items-center justify-center gap-2 w-full rounded-xl font-bold text-xs py-2.5 px-3 transition-all cursor-pointer disabled:opacity-50 select-none shadow-md',
              hasSaturation
                ? 'bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-indigo-500/30 ring-2 ring-indigo-400/50 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            )}
            title="Calculate Little's Law capacity upgrades using Google Gemini AI"
          >
            {isAutoTuning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing Queues with Gemini...</span>
              </>
            ) : (
              <>
                <Bot className="h-4 w-4" />
                <span>🤖 AI Capacity Auto-Tune</span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveBenchmark}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs py-2 px-3 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer disabled:opacity-50 select-none"
            title="Persist simulation benchmark report to PostgreSQL"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Benchmark...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 text-slate-500" />
                <span>💾 Save Benchmark Run</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Slide-over / Modal for AI Capacity Auto-Tuner */}
      <AutoTuneModal
        isOpen={isAutoTuneModalOpen}
        onClose={() => setIsAutoTuneModalOpen(false)}
        result={autoTuneResult}
        telemetry={autoTuneTelemetry}
        onApplied={() => {
          setToast({
            type: 'success',
            message: '⚡ Optimizations applied! Queues relieved and stabilized.',
          });
          setTimeout(() => setToast(null), 4500);
        }}
      />
    </>
  );
}


