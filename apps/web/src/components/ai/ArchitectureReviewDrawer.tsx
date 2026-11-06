'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  Zap,
  Target,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type {
  ArchitectureReviewResult,
  ReviewSeverity,
} from '@collabarch/shared-types';

interface ArchitectureReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reviewResult: ArchitectureReviewResult | null;
  isLoading: boolean;
  onRecheck: () => void;
}

export function ArchitectureReviewDrawer({
  isOpen,
  onClose,
  reviewResult,
  isLoading,
  onRecheck,
}: ArchitectureReviewDrawerProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | ReviewSeverity>('all');
  const { setCenter, getNode } = useReactFlow();

  if (!isOpen) return null;

  // Jump to & highlight node on canvas
  const handlePinpointNode = (nodeId: string) => {
    try {
      const node = getNode(nodeId);
      if (node) {
        setCenter(node.position.x + 120, node.position.y + 60, { zoom: 1.25, duration: 600 });
      }
    } catch (err) {
      console.warn('Could not pinpoint node', err);
    }
  };

  const findings = reviewResult?.findings || [];
  const filteredFindings =
    activeFilter === 'all' ? findings : findings.filter((f) => f.severity === activeFilter);

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const strengthCount = findings.filter((f) => f.severity === 'strength').length;

  const score = reviewResult?.healthScore ?? 0;
  const scoreColor =
    score >= 85 ? 'text-emerald-500' : score >= 65 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Architecture Review</span>
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500">
                AI SRE
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Audit for SPOFs, Little's Law, and Bottlenecks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRecheck}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Re-run Review"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin text-sky-500')} />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-indigo-500">
              <Sparkles className="h-7 w-7 animate-pulse text-indigo-500" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Auditing System Architecture...
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              Analyzing Little's Law capacities, single points of failure, unbuffered calls, and security isolation.
            </p>
          </div>
        ) : reviewResult ? (
          <>
            {/* Scorecard Widget */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Health Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={cn('text-3xl font-extrabold tracking-tight', scoreColor)}>
                      {score}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">/100</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-1 font-semibold text-rose-500">
                    <span>{criticalCount}</span>
                    <span className="text-[10px]">Critical</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 font-semibold text-amber-500">
                    <span>{warningCount}</span>
                    <span className="text-[10px]">Warnings</span>
                  </div>
                </div>
              </div>

              <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5">
                {reviewResult.summary}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-medium transition-colors',
                  activeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                All ({findings.length})
              </button>
              {criticalCount > 0 && (
                <button
                  onClick={() => setActiveFilter('critical')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-medium transition-colors',
                    activeFilter === 'critical'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/10 text-rose-500'
                  )}
                >
                  Critical ({criticalCount})
                </button>
              )}
              {warningCount > 0 && (
                <button
                  onClick={() => setActiveFilter('warning')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-medium transition-colors',
                    activeFilter === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/10 text-amber-500'
                  )}
                >
                  Warnings ({warningCount})
                </button>
              )}
              {strengthCount > 0 && (
                <button
                  onClick={() => setActiveFilter('strength')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-medium transition-colors',
                    activeFilter === 'strength'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-500/10 text-emerald-500'
                  )}
                >
                  Strengths ({strengthCount})
                </button>
              )}
            </div>

            {/* Finding Cards */}
            <div className="space-y-3">
              {filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3.5 shadow-sm space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {finding.severity === 'critical' ? (
                        <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                      ) : finding.severity === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : finding.severity === 'strength' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Info className="h-4 w-4 text-sky-500 shrink-0" />
                      )}
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {finding.title}
                      </h5>
                    </div>

                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      {finding.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {finding.description}
                  </p>

                  {/* Recommendation Callout */}
                  <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2.5 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2">
                    <Zap className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{finding.recommendation}</span>
                  </div>

                  {/* Affected Node Badges with Pinpoint Zoom */}
                  {finding.affectedNodeIds && finding.affectedNodeIds.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Affects:</span>
                      {finding.affectedNodeIds.map((nodeId) => (
                        <button
                          key={nodeId}
                          onClick={() => handlePinpointNode(nodeId)}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/10 hover:text-indigo-500 dark:hover:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 transition-colors"
                          title="Click to locate on canvas"
                        >
                          <Target className="h-3 w-3" />
                          <span>{nodeId}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

