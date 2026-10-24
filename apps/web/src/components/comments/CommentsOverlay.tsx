'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Check,
  RotateCcw,
  Trash2,
  X,
  Pin,
  Loader2,
} from 'lucide-react';
import { ViewportPortal, useViewport } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvas-store';
import { useUser, useAuth } from '@clerk/nextjs';

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface CanvasCommentItem {
  id: string;
  roomId: string;
  authorId: string;
  parentId?: string | null;
  nodeId?: string | null;
  posX?: number | null;
  posY?: number | null;
  content: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  replies?: CanvasCommentItem[];
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

export function CommentsOverlay() {
  const {
    roomId,
    isCommentMode,
    setIsCommentMode,
    nodes,
    newCommentTarget,
    setNewCommentTarget,
  } = useCanvasStore();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { zoom } = useViewport();

  const [comments, setComments] = useState<CanvasCommentItem[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  // Fetch comments from backend
  const fetchComments = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`http://localhost:4000/rooms/${roomId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  }, [roomId]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 6000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  // Handle escape key to close popover or exit comment mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (newCommentTarget) {
          setNewCommentTarget(null);
          setNewCommentText('');
        } else if (activeCommentId) {
          setActiveCommentId(null);
        } else if (isCommentMode) {
          setIsCommentMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newCommentTarget, activeCommentId, isCommentMode, setNewCommentTarget, setIsCommentMode]);

  // Submit new comment
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !newCommentTarget) return;

    setIsSubmitting(true);
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_guest_default',
        'x-user-name': user?.fullName || user?.firstName || 'Architect',
        'x-user-email': user?.primaryEmailAddress?.emailAddress || 'architect@collabarch.internal',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload: Record<string, any> = {
        content: newCommentText.trim(),
      };
      if (newCommentTarget.nodeId) {
        payload.nodeId = newCommentTarget.nodeId;
      }
      if (newCommentTarget.posX !== undefined) {
        payload.posX = Math.round(newCommentTarget.posX);
      }
      if (newCommentTarget.posY !== undefined) {
        payload.posY = Math.round(newCommentTarget.posY);
      }

      const res = await fetch(`http://localhost:4000/rooms/${roomId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [created, ...prev]);
        setNewCommentTarget(null);
        setNewCommentText('');
        setActiveCommentId(created.id);
      }
    } catch (err) {
      console.error('Failed to create comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit threaded reply
  const handleAddReply = async (parentId: string) => {
    const text = replyText[parentId]?.trim();
    if (!text) return;

    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_guest_default',
        'x-user-name': user?.fullName || user?.firstName || 'Architect',
        'x-user-email': user?.primaryEmailAddress?.emailAddress || 'architect@collabarch.internal',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:4000/rooms/${roomId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: text,
          parentId,
        }),
      });

      if (res.ok) {
        const reply = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), reply] }
              : c
          )
        );
        setReplyText((prev) => ({ ...prev, [parentId]: '' }));
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  // Resolve comment: calls PATCH http://localhost:4000/comments/:id/resolve
  const handleResolveComment = async (commentId: string) => {
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_guest_default',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:4000/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers,
      });

      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, isResolved: true } : c))
        );
      }
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  // Re-open resolved comment
  const handleReopenComment = async (commentId: string) => {
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'user_guest_default',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:4000/comments/${commentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isResolved: false }),
      });

      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, isResolved: false } : c))
        );
      }
    } catch (err) {
      console.error('Failed to reopen comment:', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment thread?')) return;
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'x-user-id': user?.id || 'user_guest_default',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:4000/comments/${commentId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        if (activeCommentId === commentId) {
          setActiveCommentId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const filteredComments = comments.filter((c) => showResolved || !c.isResolved);
  const scaleFactor = Math.min(1.5, Math.max(0.7, 1 / zoom));

  return (
    <>
      {/* Top Banner when Comment Mode is active */}
      {isCommentMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-full bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-1.5 shadow-2xl backdrop-blur-md pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150 z-40 select-none">
          <MessageSquare className="h-4 w-4 text-sky-400 shrink-0" />
          <span className="text-xs font-semibold">
            Comment Mode Active — Click on any service card or canvas coordinate to drop a note
          </span>
          <button
            onClick={() => {
              setIsCommentMode(false);
              setNewCommentTarget(null);
            }}
            className="ml-2 rounded-full p-1 hover:bg-white/20 dark:hover:bg-slate-900/20 text-slate-300 dark:text-slate-600 transition-colors"
            title="Exit Comment Mode"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Render Viewport Portal with all Pin Bubbles and Popovers */}
      <ViewportPortal>
        {filteredComments.map((comment) => {
          let x = comment.posX ?? 100;
          let y = comment.posY ?? 100;

          if (comment.nodeId) {
            const matchedNode = nodes.find((n) => n.id === comment.nodeId);
            if (matchedNode) {
              x = matchedNode.position.x + 230;
              y = matchedNode.position.y - 12;
            }
          }

          const isActive = activeCommentId === comment.id;
          const replyCount = comment.replies?.length || 0;

          return (
            <div
              key={comment.id}
              style={{
                position: 'absolute',
                transform: `translate(${x}px, ${y}px)`,
                zIndex: isActive ? 60 : 25,
              }}
              className="pointer-events-auto"
            >
              {/* Pin Bubble Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCommentId(isActive ? null : comment.id);
                  if (newCommentTarget) setNewCommentTarget(null);
                }}
                className={`relative flex items-center justify-center h-8 w-8 rounded-full shadow-lg border-2 transition-all duration-150 select-none cursor-pointer ${
                  comment.isResolved
                    ? 'bg-emerald-500 border-white text-white opacity-85 hover:opacity-100 scale-95'
                    : isActive
                      ? 'bg-sky-500 border-white text-white ring-4 ring-sky-500/30 scale-110'
                      : 'bg-white dark:bg-slate-900 border-sky-500 text-sky-600 dark:text-sky-400 hover:scale-110'
                }`}
                title={`${comment.author.name}: "${comment.content.slice(0, 30)}..."`}
              >
                {comment.isResolved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}

                {replyCount > 0 && !comment.isResolved && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white shadow-sm">
                    {replyCount}
                  </span>
                )}
              </button>

              {/* Thread Discussion Card */}
              {isActive && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: 'top left',
                  }}
                  className="absolute left-10 top-0 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 text-left z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {comment.author.avatarUrl ? (
                        <img
                          src={comment.author.avatarUrl}
                          alt={comment.author.name}
                          className="h-6 w-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-bold shrink-0">
                          {comment.author.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {comment.author.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {comment.isResolved ? (
                        <button
                          onClick={() => handleReopenComment(comment.id)}
                          className="flex items-center gap-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 text-[11px] font-semibold transition-colors"
                          title="Reopen comment thread"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reopen</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResolveComment(comment.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 text-[11px] font-semibold transition-colors"
                          title="Mark comment as resolved"
                        >
                          <Check className="h-3 w-3" />
                          <span>Resolve</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete thread"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => setActiveCommentId(null)}
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Pinned Target Tag */}
                  {comment.nodeId && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                      <Pin className="h-2.5 w-2.5 text-sky-500" />
                      <span>Pinned to {comment.nodeId}</span>
                    </div>
                  )}

                  {/* Comment Body */}
                  <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 max-h-48 overflow-y-auto">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2 text-xs pl-2 border-l-2 border-sky-500/30">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 dark:text-white text-[11px]">
                                {reply.author.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatRelativeTime(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input Box */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reply to thread..."
                        value={replyText[comment.id] || ''}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [comment.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddReply(comment.id);
                          }
                        }}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                      />
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyText[comment.id]?.trim()}
                        className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 p-1.5 text-white transition-colors shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* New Comment Creation Popover inside ViewportPortal */}
        {newCommentTarget && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(${newCommentTarget.posX ?? 100}px, ${newCommentTarget.posY ?? 100}px)`,
              zIndex: 70,
            }}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto"
          >
            {/* Visual Pin Marker at click target */}
            <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-sky-500 border-2 border-white text-white shadow-xl animate-bounce">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>

            {/* Input Popover Card */}
            <div
              style={{
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top left',
              }}
              className="absolute left-10 top-0 w-72 sm:w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                  <span>
                    {newCommentTarget.nodeId
                      ? `Comment on ${newCommentTarget.nodeId}`
                      : 'Add Canvas Note'}
                  </span>
                </span>
                <button
                  onClick={() => setNewCommentTarget(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateComment} className="mt-2.5 space-y-2">
                <textarea
                  autoFocus
                  rows={3}
                  placeholder="Leave architectural feedback, questions, or review notes..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCommentTarget(null)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newCommentText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    <span>Comment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ViewportPortal>
    </>
  );
}
