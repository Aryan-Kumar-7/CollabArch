'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  Trash2,
  ExternalLink,
  Clock,
  Check,
  Globe,
  Lock,
  Layers,
  MoreVertical,
  Activity,
} from 'lucide-react';

export interface CanvasRoomCardData {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string | null;
  ownerAvatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
}

interface CanvasCardProps {
  room: CanvasRoomCardData;
  onDelete: (slug: string) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function CanvasCard({ room, onDelete }: CanvasCardProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/room/${room.slug}`;
      navigator.clipboard.writeText(url);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${room.title}"?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:4000/rooms/${room.slug}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDelete(room.slug);
      }
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 hover:border-sky-500/50 dark:hover:border-sky-500/40 shadow-sm hover:shadow-xl hover:shadow-sky-500/5 dark:hover:shadow-sky-500/10 transition-all duration-200 overflow-hidden">
      {/* Visual Canvas Thumbnail Preview */}
      <Link
        href={`/room/${room.slug}`}
        className="relative block h-36 w-full bg-slate-100/70 dark:bg-slate-950/80 overflow-hidden border-b border-slate-100 dark:border-slate-800/80 group-hover:opacity-95 transition-opacity"
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.25] dark:opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Abstract mini node graph representation */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="flex items-center gap-4 transition-transform duration-300 group-hover:scale-105">
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-sky-500/30 bg-sky-500/10 shadow-sm">
              <div className="h-3 w-8 rounded bg-sky-500/30" />
              <div className="h-1.5 w-6 rounded bg-sky-400/40" />
            </div>

            <div className="h-0.5 w-6 bg-gradient-to-r from-sky-400 to-indigo-400 opacity-60" />

            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 shadow-sm">
              <div className="h-3 w-10 rounded bg-indigo-500/30" />
              <div className="h-1.5 w-7 rounded bg-indigo-400/40" />
            </div>

            <div className="h-0.5 w-6 bg-gradient-to-r from-indigo-400 to-emerald-400 opacity-60" />

            <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 shadow-sm">
              <div className="h-3 w-8 rounded bg-emerald-500/30" />
              <div className="h-1.5 w-5 rounded bg-emerald-400/40" />
            </div>
          </div>
        </div>

        {/* Visibility Badge Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm">
          {room.visibility === 'PUBLIC_LINK' ? (
            <>
              <Globe className="h-3 w-3 text-emerald-500" />
              <span>Public Link</span>
            </>
          ) : (
            <>
              <Lock className="h-3 w-3 text-sky-500" />
              <span>Workspace</span>
            </>
          )}
        </div>

        {/* Quick action buttons on hover */}
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopyLink}
            className="rounded-lg p-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-sky-500 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
            title="Copy share link"
          >
            {hasCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg p-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-red-500 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
            title="Delete canvas"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Link>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link
              href={`/room/${room.slug}`}
              className="text-sm font-bold text-slate-900 dark:text-white hover:text-sky-500 dark:hover:text-sky-400 transition-colors line-clamp-1"
              title={room.title}
            >
              {room.title}
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem] mb-3">
            {room.description || 'Interactive system architecture diagram and simulation canvas.'}
          </p>
        </div>

        {/* Card Footer: Metadata and Author */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            {room.ownerAvatarUrl ? (
              <img
                src={room.ownerAvatarUrl}
                alt={room.ownerName}
                className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-[9px] font-bold text-white">
                {room.ownerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate max-w-[100px]">{room.ownerName}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1" title="Last edited">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>{formatRelativeTime(room.updatedAt)}</span>
            </div>

            <Link
              href={`/room/${room.slug}`}
              className="p-1 rounded-md text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open Studio"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
