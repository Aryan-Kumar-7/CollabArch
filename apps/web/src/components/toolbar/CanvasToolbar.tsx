'use client';

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Layers3,
  Network,
  Share2,
  Sparkles,
  Download,
  Trash2,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const {
    isSidebarOpen,
    toggleSidebar,
    isInspectorOpen,
    toggleInspector,
    nodes,
    edges,
    loadStarterTemplate,
    clearCanvas,
  } = useCanvasStore();

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'collabarch-topology.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-md z-20">
      {/* Left: Brand & Room Meta */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-md shadow-sky-500/20">
            <Network className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">
                CollabArch
              </span>
              <span className="rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.2 text-[10px] font-medium text-sky-400">
                Phase 1
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Distributed Cloud Architecture Studio
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-slate-300 font-medium">Local Canvas Engine</span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({nodes.length} nodes, {edges.length} links)
          </span>
        </div>
      </div>

      {/* Center: Canvas View Controls */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1 shadow-inner">
        <button
          onClick={() => zoomIn({ duration: 200 })}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomOut({ duration: 200 })}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />
        <button
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">Fit View</span>
        </button>
      </div>

      {/* Right: Quick Action Buttons & Panels */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportJson}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          title="Export topology as JSON"
        >
          <Download className="h-3.5 w-3.5 text-slate-400" />
          <span>Export</span>
        </button>

        <button
          onClick={loadStarterTemplate}
          className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          title="Reset to Starter Architecture"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Starter Arch</span>
        </button>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
            isSidebarOpen
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
          )}
          title="Toggle Palette Sidebar"
        >
          <Layers3 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Palette</span>
        </button>

        <button
          onClick={toggleInspector}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
            isInspectorOpen
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
          )}
          title="Toggle Inspector Drawer"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Inspector</span>
        </button>
      </div>
    </header>
  );
}
