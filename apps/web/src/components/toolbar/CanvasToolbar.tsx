'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Network,
  PenTool,
  Zap,
  Sun,
  Moon,
  Share2,
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
    collaborators,
    theme,
    toggleTheme,
    setUserProfile,
  } = useCanvasStore();

  const [mounted, setMounted] = useState(false);
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

  return (
    <header className="relative flex h-14 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 px-4 backdrop-blur-md z-20 transition-colors duration-200 shrink-0 select-none">
      {/* Left: Brand & Canvas Breadcrumb */}
      <div className="flex items-center gap-2.5 shrink-0 z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 shrink-0 group"
          title="Back to Dashboard"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Network className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap hidden sm:inline">
            CollabArch
          </span>
        </Link>

        <span className="text-slate-300 dark:text-slate-700 text-sm font-light select-none">/</span>

        {/* Dynamic Canvas Title / Room Selector */}
        <RoomMenu />
      </div>

      {/* Center: True Mathematically Centered Segmented Mode Switcher */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 p-1 shadow-inner shrink-0 z-10">
        <button
          onClick={() => setActiveMode('whiteboard')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0',
            activeMode === 'whiteboard'
              ? 'bg-white dark:bg-gradient-to-r dark:from-sky-500/20 dark:to-indigo-500/20 border border-slate-300/80 dark:border-sky-500/40 text-sky-600 dark:text-sky-300 shadow-sm shadow-sky-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to Freehand Whiteboard"
        >
          <PenTool className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          <span>Whiteboard</span>
        </button>

        <button
          onClick={() => setActiveMode('simulator')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0',
            activeMode === 'simulator'
              ? 'bg-white dark:bg-gradient-to-r dark:from-indigo-500/20 dark:to-purple-500/20 border border-slate-300/80 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 shadow-sm shadow-indigo-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 border border-transparent'
          )}
          title="Switch to System Simulator"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>System Simulator</span>
        </button>
      </div>

      {/* Right: Collaborator Stack & Actions & User Profile */}
      <div className="flex items-center gap-2 shrink-0 z-10">
        {/* Collaborators Stacked Avatars Presence Badge */}
        {collaborators.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden shrink-0 items-center">
            {collaborators.slice(0, 3).map((collab) => (
              <div
                key={collab.userId}
                className={cn(
                  'relative inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-slate-950 ring-2 ring-white dark:ring-slate-950 transition-transform hover:scale-110 shrink-0 shadow-sm',
                  collab.isCurrentUser && 'ring-sky-400'
                )}
                style={{ backgroundColor: collab.color }}
                title={`${collab.userName}${collab.isCurrentUser ? ' (You)' : ''}`}
                suppressHydrationWarning
              >
                {collab.userName.charAt(0).toUpperCase()}
              </div>
            ))}
            {collaborators.length > 3 && (
              <div className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-950">
                +{collaborators.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Primary Figma/Eraser Style Share Button */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 active:bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sky-500/25 transition-all whitespace-nowrap shrink-0"
          title="Share canvas with team or generate public link"
        >
          <Share2 className="h-3.5 w-3.5 text-white shrink-0" />
          <span>Share</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

        {/* Theme Toggle (Icon-only) */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm shrink-0"
          title={mounted && theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Dashboard Link & Clerk User Profile */}
        <SignedIn>
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 transition-all shadow-sm shrink-0"
            title="Open Workspaces Dashboard"
          >
            <LayoutDashboard className="h-4 w-4 text-sky-500" />
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8 ring-2 ring-sky-500/30 hover:ring-sky-500/70 transition-all',
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

      {/* Figma / Eraser.io Style Share & Export Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </header>
  );
}
