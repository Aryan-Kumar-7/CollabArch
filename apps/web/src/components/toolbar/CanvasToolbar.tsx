'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
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
  LayoutDashboard,
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';
import { RoomMenu } from '@/components/toolbar/RoomMenu';
import { ShareModal } from '@/components/toolbar/ShareModal';

export function CanvasToolbar() {
  const {
    activeMode,
    setActiveMode,
    roomId,
    collaborators,
    isConnected,
    theme,
    toggleTheme,
    nodes,
    edges,
    loadStarterTemplate,
    setUserProfile,
  } = useCanvasStore();

  const [mounted, setMounted] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { user, isLoaded: isUserLoaded } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync Clerk authenticated user identity to canvas presence store
  useEffect(() => {
    if (isUserLoaded && user) {
      const displayName =
        user.fullName ||
        user.firstName ||
        user.username ||
        user.primaryEmailAddress?.emailAddress.split('@')[0] ||
        'Architect';
      setUserProfile({ name: displayName });
    }
  }, [isUserLoaded, user, setUserProfile]);

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
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 px-4 backdrop-blur-md z-20 transition-colors duration-200 shrink-0 gap-3">
      {/* Left: Brand & Room ID */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-md shadow-sky-500/20 shrink-0">
            <Network className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                CollabArch
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                Live
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Dual-Mode Engineering Studio
            </div>
          </div>
        </div>

        {/* Dynamic Multi-Tenant Room Menu & Direct Copy Link Button */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
          <RoomMenu />
          <button
            onClick={handleCopyRoomLink}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm whitespace-nowrap shrink-0"
            title="Copy isolated shareable room link"
          >
            {hasCopiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] whitespace-nowrap">
                  Shareable link copied!
                </span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] whitespace-nowrap">Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center: Clean Segmented Mode Switcher */}
      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 p-1 shadow-inner shrink-0">
        <button
          onClick={() => setActiveMode('whiteboard')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0',
            activeMode === 'whiteboard'
              ? 'bg-white dark:bg-gradient-to-r dark:from-sky-500/20 dark:to-indigo-500/20 border border-slate-300/80 dark:border-sky-500/40 text-sky-600 dark:text-sky-300 shadow-sm shadow-sky-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to Freehand Whiteboard (Powered by Excalidraw)"
        >
          <PenTool className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          <span className="whitespace-nowrap">🎨 Whiteboard</span>
        </button>

        <button
          onClick={() => setActiveMode('simulator')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0',
            activeMode === 'simulator'
              ? 'bg-white dark:bg-gradient-to-r dark:from-indigo-500/20 dark:to-purple-500/20 border border-slate-300/80 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 shadow-sm shadow-indigo-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to System Simulator (Powered by React Flow)"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">⚡ System Simulator</span>
        </button>
      </div>

      {/* Right: Collaborator Presence & Mode Context Controls & Theme Toggle & Clerk Auth */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time Collaboration Status Badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors shadow-sm whitespace-nowrap shrink-0',
            mounted && isConnected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          )}
          title={mounted && isConnected ? 'Connected to live room synchronization mesh' : 'Working in local offline mode'}
        >
          {mounted && isConnected ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline text-[11px] font-semibold whitespace-nowrap">Live Sync</span>
            </>
          ) : (
            <>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline text-[11px] font-medium whitespace-nowrap">Local Only</span>
            </>
          )}
        </div>

        {/* Collaborators Stacked Avatars Presence Badge */}
        <div
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/60 px-2 py-1 text-left whitespace-nowrap shrink-0"
          title="Active room collaborators"
        >
          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
            {collaborators.map((collab) => (
              <div
                key={collab.userId}
                className={cn(
                  'relative inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-slate-950 ring-2 ring-white dark:ring-slate-950 transition-transform hover:scale-110 shrink-0',
                  collab.isCurrentUser && 'ring-sky-400'
                )}
                style={{ backgroundColor: collab.color }}
                title={`${collab.userName}${collab.isCurrentUser ? ' (You)' : ''}`}
                suppressHydrationWarning
              >
                {collab.userName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span
            className="hidden sm:inline text-[11px] font-medium text-slate-600 dark:text-slate-400 pl-1 whitespace-nowrap"
            suppressHydrationWarning
          >
            {collaborators.length} online
          </span>
        </div>

        {/* Simulator-Only Controls */}
        {activeMode === 'simulator' ? (
          <>
            {/* Quick Actions */}
            <button
              onClick={handleExportJson}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm whitespace-nowrap shrink-0"
              title="Export topology as JSON"
            >
              <Download className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="whitespace-nowrap">Export</span>
            </button>

            <button
              onClick={loadStarterTemplate}
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors shadow-sm whitespace-nowrap shrink-0"
              title="Reset to Starter Architecture"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Starter Arch</span>
            </button>
          </>
        ) : (
          /* Whiteboard Mode Indicator */
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0">
              <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0" />
              <span className="text-[11px] font-medium whitespace-nowrap">Canvas Ready</span>
            </div>
          </div>
        )}

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

        {/* Figma/Eraser Style Primary Share Button */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 active:bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/25 transition-all whitespace-nowrap shrink-0"
          title="Share canvas with team or generate public link"
        >
          <Share2 className="h-3.5 w-3.5 text-white shrink-0" />
          <span>Share</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm whitespace-nowrap shrink-0"
          title={mounted && theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {mounted && theme === 'dark' ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400 transition-transform hover:rotate-45 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Light</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-indigo-500 transition-transform hover:-rotate-12 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Dark</span>
            </>
          )}
        </button>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

        {/* Clerk Authentication Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <SignedIn>
            <Link
              href="/dashboard"
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 transition-all shadow-sm whitespace-nowrap shrink-0"
              title="Open Workspaces Dashboard"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <span>Dashboard</span>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-7 w-7 ring-2 ring-sky-500/30 hover:ring-sky-500/70 transition-all',
                },
              }}
            />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 active:bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/25 transition-all whitespace-nowrap shrink-0"
                title="Sign in to save architectures and manage workspaces"
              >
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      {/* Figma / Eraser.io Style Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </header>
  );
}

