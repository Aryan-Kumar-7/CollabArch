'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  DoorOpen,
  Copy,
  Check,
  Plus,
  ArrowRight,
  ChevronDown,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';
import type { CanvasRoomMeta } from '@collabarch/shared-types';

export function RoomMenu() {
  const { roomId, setRoomId } = useCanvasStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [activeRooms, setActiveRooms] = useState<CanvasRoomMeta[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch active rooms from backend when dropdown opens
  const fetchActiveRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('http://localhost:4000/rooms');
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data);
      }
    } catch {
      // Backend may be offline or in fallback mode
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActiveRooms();
    }
  }, [isOpen]);

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      navigator.clipboard.writeText(shareUrl);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleCreateNewRoom = async () => {
    let newId = `arch-${Math.random().toString(36).substring(2, 8)}`;
    try {
      const res = await fetch('http://localhost:4000/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Architecture Studio ${newId.replace('arch-', '')}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) newId = data.id;
      }
    } catch {}

    setRoomId(newId);
    setIsOpen(false);
  };

  const handleJoinById = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = joinInput.trim();
    if (cleanId) {
      setRoomId(cleanId);
      setJoinInput('');
      setIsOpen(false);
    }
  };

  const handleSelectRoom = (targetRoomId: string) => {
    setRoomId(targetRoomId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all duration-150 shadow-sm whitespace-nowrap shrink-0',
          isOpen
            ? 'border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-300 ring-2 ring-sky-500/20'
            : 'border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
        )}
        title="Manage or Switch Rooms"
      >
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">
          Room
        </span>
        <span className="font-mono text-[11px] font-semibold" suppressHydrationWarning>
          {mounted ? roomId : 'arch-main'}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-sky-500'
          )}
        />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-sky-500 dark:text-sky-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Studio Rooms
              </span>
            </div>
            <span
              className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60"
              suppressHydrationWarning
            >
              {mounted ? roomId : 'arch-main'}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="py-2.5 space-y-1.5 border-b border-slate-200 dark:border-slate-800/80">
            {/* Copy Share Link */}
            <button
              onClick={handleCopyShareLink}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Shareable URL</span>
              </div>
              {hasCopied ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                  <Check className="h-3 w-3" /> Copied!
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Invite peers</span>
              )}
            </button>

            {/* Create New Room */}
            <button
              onClick={handleCreateNewRoom}
              className="flex w-full items-center justify-between rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 px-2.5 py-1.5 text-xs text-sky-600 dark:text-sky-300 font-medium transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Room</span>
              </div>
              <Sparkles className="h-3 w-3 text-sky-400" />
            </button>
          </div>

          {/* Join by ID */}
          <form onSubmit={handleJoinById} className="py-2.5 border-b border-slate-200 dark:border-slate-800/80">
            <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Join by Room ID
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="e.g. arch-payment-v2"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!joinInput.trim()}
                className="flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500 disabled:opacity-40 transition-colors"
                title="Navigate to Room"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* Active Rooms List */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Active Rooms
              </span>
              <button
                onClick={fetchActiveRooms}
                disabled={isLoadingRooms}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Refresh rooms list"
              >
                <RefreshCw className={cn('h-3 w-3', isLoadingRooms && 'animate-spin')} />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {activeRooms.length > 0 ? (
                activeRooms.map((room) => {
                  const isCurrent = room.id === roomId;
                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-left transition-colors',
                        isCurrent
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-medium">{room.name || room.id}</div>
                        <div className="font-mono text-[10px] text-slate-400 truncate">{room.id}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {room.nodeCount !== undefined && room.nodeCount > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {room.nodeCount} nodes
                          </span>
                        )}
                        {isCurrent && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                  <Layers className="h-4 w-4 mx-auto mb-1 text-slate-400 opacity-60" />
                  No other active rooms recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
