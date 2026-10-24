'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Layers3,
  Network,
  Sparkles,
  Download,
  PenTool,
  Zap,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Share2,
  Check,
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';
import { RoomMenu } from '@/components/toolbar/RoomMenu';
import { UserProfileModal } from '@/components/toolbar/UserProfileModal';

export function CanvasToolbar() {
  const {
    activeMode,
    setActiveMode,
    roomId,
    collaborators,
    isConnected,
    theme,
    toggleTheme,
    isSidebarOpen,
    toggleSidebar,
    isInspectorOpen,
    toggleInspector,
    nodes,
    edges,
    loadStarterTemplate,
  } = useCanvasStore();

  const [mounted, setMounted] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyRoomLink = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      navigator.clipboard.writeText(shareUrl);
      setHasCopiedLink(true);
      setTimeout(() => setHasCopiedLink(false), 2000);
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
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 px-4 backdrop-blur-md z-20 transition-colors duration-200">
      {/* Left: Brand & Room ID */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-md shadow-sky-500/20">
            <Network className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                CollabArch
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Live
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Dual-Mode Engineering Studio
            </div>
          </div>
        </div>

        {/* Dynamic Multi-Tenant Room Menu & Direct Copy Link Button */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
          <RoomMenu />
          <button
            onClick={handleCopyRoomLink}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
            title="Copy isolated shareable room link"
          >
            {hasCopiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  Shareable link copied!
                </span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[11px]">Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center: Clean Segmented Mode Switcher */}
      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 p-1 shadow-inner">
        <button
          onClick={() => setActiveMode('whiteboard')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
            activeMode === 'whiteboard'
              ? 'bg-white dark:bg-gradient-to-r dark:from-sky-500/20 dark:to-indigo-500/20 border border-slate-300/80 dark:border-sky-500/40 text-sky-600 dark:text-sky-300 shadow-sm shadow-sky-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to Freehand Whiteboard (Powered by Excalidraw)"
        >
          <PenTool className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
          <span>🎨 Whiteboard</span>
        </button>

        <button
          onClick={() => setActiveMode('simulator')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
            activeMode === 'simulator'
              ? 'bg-white dark:bg-gradient-to-r dark:from-indigo-500/20 dark:to-purple-500/20 border border-slate-300/80 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 shadow-sm shadow-indigo-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to System Simulator (Powered by React Flow)"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          <span>⚡ System Simulator</span>
        </button>
      </div>

      {/* Right: Collaborator Presence & Mode Context Controls & Theme Toggle */}
      <div className="flex items-center gap-2.5">
        {/* Real-time Collaboration Status Badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors shadow-sm',
            mounted && isConnected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          )}
          title={mounted && isConnected ? 'Connected to live room synchronization mesh' : 'Working in local offline mode'}
        >
          {mounted && isConnected ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline text-[11px] font-semibold">Live Sync</span>
            </>
          ) : (
            <>
              <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline text-[11px] font-medium">Local Only</span>
            </>
          )}
        </div>

        {/* Collaborators Stacked Avatars & User Profile Opener */}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/60 px-2 py-1 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-left"
          title="Click to customize your display name & cursor color"
        >
          <div className="flex -space-x-1.5 overflow-hidden">
            {collaborators.map((user) => (
              <div
                key={user.userId}
                className={cn(
                  'relative inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-slate-950 ring-2 ring-white dark:ring-slate-950 transition-transform hover:scale-110',
                  user.isCurrentUser && 'ring-sky-400'
                )}
                style={{ backgroundColor: user.color }}
                title={`${user.userName}${user.isCurrentUser ? ' (Click to edit profile)' : ''}`}
                suppressHydrationWarning
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span
            className="hidden sm:inline text-[11px] font-medium text-slate-600 dark:text-slate-400 pl-1"
            suppressHydrationWarning
          >
            {collaborators.length} online
          </span>
        </button>

        {/* Simulator-Only Controls */}
        {activeMode === 'simulator' ? (
          <>
            {/* Quick Actions */}
            <button
              onClick={handleExportJson}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
              title="Export topology as JSON"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export</span>
            </button>

            <button
              onClick={loadStarterTemplate}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors shadow-sm"
              title="Reset to Starter Architecture"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Starter Arch</span>
            </button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

            <button
              onClick={toggleSidebar}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors shadow-sm',
                isSidebarOpen
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title="Toggle Palette Sidebar"
            >
              <Layers3 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Palette</span>
            </button>

            <button
              onClick={toggleInspector}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors shadow-sm',
                isInspectorOpen
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
              <span className="text-[11px] font-medium">Canvas Ready</span>
            </div>
          </div>
        )}

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
          title={mounted && theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {mounted && theme === 'dark' ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400 transition-transform hover:rotate-45" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-indigo-500 transition-transform hover:-rotate-12" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>

      {/* User Profile Customization Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
}
