'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Building2,
  Lock,
  Users,
  ShieldCheck,
  User,
  ChevronDown,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useCanvasStore, type CollaboratorPresence } from '@/store/canvas-store';
import { useUser } from '@clerk/nextjs';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type VisibilityType = 'WORKSPACE' | 'PUBLIC_LINK' | 'PRIVATE';

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { roomId, collaborators, nodes, edges } = useCanvasStore();
  const { user } = useUser();

  const [hasCopied, setHasCopied] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityType>('PUBLIC_LINK');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [shareUrl, setShareUrl] = useState('');
  const [showUpdatedBadge, setShowUpdatedBadge] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch current room metadata and set initial visibility state on mount / modal open
  useEffect(() => {
    if (!isOpen || !roomId) return;
    let isMounted = true;
    fetch(`http://localhost:4000/rooms/${roomId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.visibility) {
          setVisibility(data.visibility);
        }
      })
      .catch((err) => console.error('Error fetching room visibility:', err));
    return () => {
      isMounted = false;
    };
  }, [isOpen, roomId]);

  const handleVisibilityChange = async (newVisibility: VisibilityType) => {
    const previousVisibility = visibility;
    setVisibility(newVisibility);
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      const res = await fetch(`http://localhost:4000/rooms/${roomId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility: newVisibility,
          userId: user?.id,
        }),
      });
      if (res.ok) {
        setShowUpdatedBadge(true);
        setTimeout(() => setShowUpdatedBadge(false), 2500);
      } else {
        const errorData = await res.json().catch(() => null);
        setVisibility(previousVisibility);
        setErrorMessage(
          errorData?.message ||
            'Permission denied: Only the room owner or a workspace admin can modify visibility.'
        );
      }
    } catch (err: any) {
      setVisibility(previousVisibility);
      setErrorMessage('Network error while updating room visibility.');
      console.error('Failed to update room visibility:', err);
    } finally {
      setIsUpdating(false);
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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/room/${roomId}`;
      setShareUrl(url);
    }
  }, [roomId]);

  if (!isOpen || !mounted) return null;

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const visibilityOptions = [
    {
      id: 'PUBLIC_LINK' as VisibilityType,
      title: 'Anyone with the link',
      description: 'Anyone with this link can view and edit in real time without signing in.',
      icon: Globe,
      badge: 'Public Guest Access',
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'WORKSPACE' as VisibilityType,
      title: 'Workspace members',
      description: 'Only members of your team workspace can access and edit this diagram.',
      icon: Building2,
      badge: 'Team Only',
      badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
    {
      id: 'PRIVATE' as VisibilityType,
      title: 'Private to you',
      description: 'Only you and explicitly invited team members can view this canvas.',
      icon: Lock,
      badge: 'Restricted',
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Share Canvas & Permissions
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Manage link sharing and see who is collaborating in real time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick Copy Link Row */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Shareable Canvas Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/20 transition-all shrink-0"
              >
                {hasCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

            {/* Visibility Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Access Permissions
              </label>
              {showUpdatedBadge && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-in fade-in zoom-in-95 duration-150">
                  <Check className="h-3 w-3" />
                  <span>Permissions updated</span>
                </span>
              )}
            </div>

            {errorMessage && (
              <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              {visibilityOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleVisibilityChange(opt.id)}
                    className={`flex items-start gap-3 w-full p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {opt.title}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.2 text-[9px] font-semibold ${opt.badgeColor}`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Collaborators Presence List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span>Currently in Canvas ({collaborators.length})</span>
              </label>
              <span className="text-[10px] text-slate-400">Live WebSockets</span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 divide-y divide-slate-100 dark:divide-slate-800/80">
              {collaborators.map((collab) => (
                <div
                  key={collab.userId}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-slate-950 ring-2 ring-white dark:ring-slate-900"
                      style={{ backgroundColor: collab.color }}
                    >
                      {collab.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {collab.userName}
                        </span>
                        {collab.isCurrentUser && (
                          <span className="rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-0.2 text-[9px] font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {collab.email || (collab.isCurrentUser && user?.primaryEmailAddress?.emailAddress) || 'Connected Peer'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!collab.isGuest || (collab.isCurrentUser && user) ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        <User className="h-3 w-3" />
                        <span>Guest</span>
                      </span>
                    )}

                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 pl-1">
                      Can edit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Download architecture nodes and edges as JSON"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export Topology JSON</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
