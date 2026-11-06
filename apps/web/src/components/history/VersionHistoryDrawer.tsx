'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  History,
  RotateCcw,
  Plus,
  Clock,
  User,
  Check,
  AlertCircle,
  Loader2,
  HardDrive,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { useUser, useAuth } from '@clerk/nextjs';
import { SERVER_URL } from '@/lib/config';

export interface CanvasRevisionItem {
  id: string;
  roomId: string;
  roomSlug: string;
  name: string;
  description?: string | null;
  sizeBytes: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export function VersionHistoryDrawer() {
  const { isHistoryOpen, setIsHistoryOpen, roomId } = useCanvasStore();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [revisions, setRevisions] = useState<CanvasRevisionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [isNamingOpen, setIsNamingOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDesc, setNewVersionDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRevisions = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/rooms/${roomId}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data);
      }
    } catch (err) {
      console.error('Failed to fetch revisions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (isHistoryOpen) {
      fetchRevisions();
    }
  }, [isHistoryOpen, fetchRevisions]);

  const handleCreateNamedRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    setIsCreating(true);
    setFeedback(null);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_guest_default',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${SERVER_URL}/rooms/${roomId}/revisions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newVersionName.trim(),
          description: newVersionDesc.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to capture version snapshot');
      }

      setNewVersionName('');
      setNewVersionDesc('');
      setIsNamingOpen(false);
      setFeedback({ type: 'success', message: 'Version snapshot successfully created!' });
      setTimeout(() => setFeedback(null), 3500);
      await fetchRevisions();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error saving version snapshot' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreRevision = async (revision: CanvasRevisionItem) => {
    const confirmed = window.confirm(
      `Roll back canvas to "${revision.name}"? Current unsaved work will be superseded.`
    );
    if (!confirmed) return;

    setIsRestoringId(revision.id);
    setFeedback(null);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_guest_default',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${SERVER_URL}/rooms/${roomId}/revisions/${revision.id}/restore`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to restore revision');
      }

      setFeedback({ type: 'success', message: `Restored to "${revision.name}"!` });
      setTimeout(() => {
        setIsHistoryOpen(false);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error restoring revision' });
    } finally {
      setIsRestoringId(null);
    }
  };

  if (!isHistoryOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-right"
      aria-label="Version History"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Version History
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Snapshot milestones & state rollback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={fetchRevisions}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
          </button>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {feedback && (
        <div
          className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1 font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Top Action: Create Named Version */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
        {!isNamingOpen ? (
          <button
            onClick={() => setIsNamingOpen(true)}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/20 hover:shadow-sky-500/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Name Current Version</span>
          </button>
        ) : (
          <form onSubmit={handleCreateNamedRevision} className="space-y-2.5 animate-in fade-in duration-150">
            <div>
              <input
                type="text"
                autoFocus
                placeholder="Version name (e.g. v1.2 Pre-Migration)"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Optional description / changelog..."
                value={newVersionDesc}
                onChange={(e) => setNewVersionDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsNamingOpen(false);
                  setNewVersionName('');
                  setNewVersionDesc('');
                }}
                className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !newVersionName.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-sm"
              >
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save Snapshot</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Timeline List Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && revisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            <span className="text-xs">Loading revision snapshots...</span>
          </div>
        ) : revisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center text-slate-400 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <History className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              No Named Snapshots Yet
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Name your current canvas version to preserve milestones and enable instant point-in-time rollbacks.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3.5 space-y-6 pb-6">
            {revisions.map((rev, index) => {
              const isRestoring = isRestoringId === rev.id;
              const isLatest = index === 0;

              return (
                <div key={rev.id} className="relative pl-6 group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-2 top-1.5 h-4 w-4 rounded-full border-2 bg-white dark:bg-slate-900 transition-colors ${
                      isLatest
                        ? 'border-sky-500 ring-4 ring-sky-500/20'
                        : 'border-slate-300 dark:border-slate-700 group-hover:border-sky-400'
                    }`}
                  />

                  {/* Card Container */}
                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {rev.name}
                          </h4>
                          {isLatest && (
                            <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-sky-600 dark:text-sky-400">
                              Current
                            </span>
                          )}
                        </div>

                        {rev.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {rev.description}
                          </p>
                        )}
                      </div>

                      {/* Snapshot File Size Badge */}
                      <span className="shrink-0 font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded">
                        {(rev.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        {rev.createdBy.avatarUrl ? (
                          <img
                            src={rev.createdBy.avatarUrl}
                            alt={rev.createdBy.name}
                            className="h-4 w-4 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[9px] font-bold shrink-0">
                            {rev.createdBy.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{rev.createdBy.name}</span>
                      </div>

                      <span className="shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span suppressHydrationWarning>{formatRelativeTime(rev.createdAt)}</span>
                      </span>
                    </div>

                    {/* Restore Action Button */}
                    <div className="mt-3 pt-2 flex justify-end">
                      <button
                        onClick={() => handleRestoreRevision(rev)}
                        disabled={isRestoring}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 hover:border-sky-500/40 hover:text-sky-600 dark:hover:bg-sky-950/40 dark:hover:text-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-sm"
                        title="Rollback canvas state to this snapshot"
                      >
                        {isRestoring ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 text-sky-500" />
                        )}
                        <span>Restore This Version</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
