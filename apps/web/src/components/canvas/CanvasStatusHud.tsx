'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, Users } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

export function CanvasStatusHud() {
  const { isConnected, collaborators } = useCanvasStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <aside
      aria-label="Canvas Connection and Sync Status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 px-3.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-xl shadow-slate-900/10 backdrop-blur-md transition-all select-none pointer-events-auto"
    >
      {/* Live Sync Indicator */}
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Live</span>
          </>
        ) : (
          <>
            <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium text-amber-700 dark:text-amber-400">Reconnecting...</span>
          </>
        )}
      </div>

      <span className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* Persistence State */}
      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
        <Cloud className="h-3 w-3 text-sky-500 shrink-0" />
        <span className="text-[10px]">Saved</span>
      </div>

      {/* Online Peer Count */}
      {collaborators.length > 0 && (
        <>
          <span className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Users className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="text-[10px] font-semibold">{collaborators.length}</span>
          </div>
        </>
      )}
    </aside>
  );
}
