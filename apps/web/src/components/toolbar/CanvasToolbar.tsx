'use client';

import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Layers3,
  Network,
  Sparkles,
  Download,
  PenTool,
  Zap,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const {
    activeMode,
    setActiveMode,
    roomId,
    collaborators,
    isSidebarOpen,
    toggleSidebar,
    isInspectorOpen,
    toggleInspector,
    nodes,
    edges,
    loadStarterTemplate,
  } = useCanvasStore();

  const [hasCopiedRoom, setHasCopiedRoom] = useState(false);

  const handleCopyRoomLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setHasCopiedRoom(true);
      setTimeout(() => setHasCopiedRoom(false), 2000);
    }
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `collabarch-${roomId}-topology.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-md z-20">
      {/* Left: Brand & Room ID */}
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
                Phase 2
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Dual-Mode Engineering Studio
            </div>
          </div>
        </div>

        {/* Room ID Badge with Copy Link */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800/90 bg-slate-900/80 px-2.5 py-1 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Room
            </span>
            <span className="font-mono text-[11px] font-semibold text-slate-200">
              {roomId}
            </span>
            <button
              onClick={handleCopyRoomLink}
              className="ml-1 text-slate-400 hover:text-slate-100 transition-colors"
              title="Copy Room Link"
            >
              {hasCopiedRoom ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Center: Clean Segmented Mode Switcher */}
      <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-inner">
        <button
          onClick={() => setActiveMode('whiteboard')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
            activeMode === 'whiteboard'
              ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/40 text-sky-300 shadow-sm shadow-sky-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to Freehand Whiteboard (Powered by Excalidraw)"
        >
          <PenTool className="h-3.5 w-3.5 text-sky-400" />
          <span>🎨 Whiteboard</span>
        </button>

        <button
          onClick={() => setActiveMode('simulator')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
            activeMode === 'simulator'
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to System Simulator (Powered by React Flow)"
        >
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>⚡ System Simulator</span>
        </button>
      </div>

      {/* Right: Collaborator Presence & Mode Context Controls */}
      <div className="flex items-center gap-2.5">
        {/* Collaborators Stacked Avatar Avatars */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-2 py-1">
          <div className="flex -space-x-1.5 overflow-hidden">
            {collaborators.map((user) => (
              <div
                key={user.userId}
                className="relative inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-slate-950 ring-2 ring-slate-950 transition-transform hover:scale-110"
                style={{ backgroundColor: user.color }}
                title={`${user.userName}${user.isCurrentUser ? ' (You)' : ''}`}
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="hidden sm:inline text-[11px] font-medium text-slate-400 pl-1">
            {collaborators.length} online
          </span>
        </div>

        {/* Simulator-Only Controls */}
        {activeMode === 'simulator' ? (
          <>
            {/* Zoom / Viewport Controls */}
            <div className="hidden xl:flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1 shadow-inner">
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
                <span className="text-[11px] font-medium">Fit</span>
              </button>
            </div>

            {/* Quick Actions */}
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
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              title="Reset to Starter Architecture"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Starter Arch</span>
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
          </>
        ) : (
          /* Whiteboard Mode Indicator */
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400">
              <span className="flex h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Excalidraw Engine Active</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
