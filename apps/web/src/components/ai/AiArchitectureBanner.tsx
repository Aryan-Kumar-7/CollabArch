'use client';

import React, { useEffect } from 'react';
import { Sparkles, X, Layers, GitFork } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';

export function AiArchitectureBanner() {
  const { aiSummaryToast, setAiSummaryToast } = useCanvasStore();

  useEffect(() => {
    if (!aiSummaryToast) return;
    const timer = setTimeout(() => {
      setAiSummaryToast(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [aiSummaryToast, setAiSummaryToast]);

  if (!aiSummaryToast) return null;

  return (
    <aside
      aria-label="AI Generated Architecture Summary"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] max-w-xl w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-indigo-500/30 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-xl shadow-indigo-500/10 backdrop-blur-md text-slate-800 dark:text-slate-100">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              AI ARCHITECT
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {aiSummaryToast.title}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-0.5">
                <Layers className="h-3 w-3" />
                {aiSummaryToast.nodeCount} nodes
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5">
                <GitFork className="h-3 w-3" />
                {aiSummaryToast.edgeCount} edges
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
            {aiSummaryToast.summary}
          </p>
        </div>

        <button
          onClick={() => setAiSummaryToast(null)}
          className="self-start sm:self-center rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          title="Dismiss summary banner"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

