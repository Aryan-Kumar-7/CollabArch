'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { UserButton, useUser, useAuth, OrganizationSwitcher, useOrganization } from '@clerk/nextjs';
import {
  Network,
  Plus,
  Search,
  Sparkles,
  Layers,
  Cpu,
  Database,
  RefreshCw,
  FolderKanban,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Check,
} from 'lucide-react';
import { CreateCanvasModal } from '@/components/dashboard/CreateCanvasModal';
import { CanvasCard, type CanvasRoomCardData } from '@/components/dashboard/CanvasCard';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  clerkOrgId?: string | null;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    id: string;
    userId: string;
    role: string;
  }>;
  _count?: {
    rooms: number;
    members: number;
  };
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('all');
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

  const [rooms, setRooms] = useState<CanvasRoomCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'x-user-id': user.id,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('http://localhost:4000/workspaces', { headers });
      if (res.ok) {
        const data: WorkspaceItem[] = await res.json();
        setWorkspaces(data);
      }
    } catch (err) {
      console.error('Failed to load user workspaces:', err);
    }
  }, [user?.id, getToken]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Synchronize Clerk active organization with workspace selector
  useEffect(() => {
    if (organization?.id && workspaces.length > 0) {
      const match = workspaces.find(
        (w) => w.clerkOrgId === organization.id || w.id === organization.id
      );
      if (match) {
        setSelectedWorkspaceId(match.id);
      }
    }
  }, [organization?.id, workspaces]);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = 'http://localhost:4000/rooms';
      if (selectedWorkspaceId && selectedWorkspaceId !== 'all') {
        url = `http://localhost:4000/rooms?workspaceId=${selectedWorkspaceId}`;
      } else if (organization?.id) {
        url = `http://localhost:4000/rooms?workspaceId=${organization.id}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Failed to load canvas rooms from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkspaceId, organization?.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleDeleteRoom = (deletedSlug: string) => {
    setRooms((prev) => prev.filter((r) => r.slug !== deletedSlug));
  };

  const activeWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  const filteredRooms = rooms.filter((r) => {
    // When an explicit workspace is selected, filter rooms accordingly
    if (selectedWorkspaceId && selectedWorkspaceId !== 'all' && r.workspaceId && r.workspaceId !== selectedWorkspaceId) {
      return false;
    }
    return (
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 px-6 backdrop-blur-md transition-colors">
        {/* Brand & Workspace Name */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Network className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  CollabArch
                </span>
                <span className="text-slate-400 dark:text-slate-600 font-medium text-xs">/</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                    className="flex items-center gap-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 transition-colors"
                  >
                    <FolderKanban className="h-3 w-3" />
                    <span className="max-w-[120px] sm:max-w-[170px] truncate">
                      {selectedWorkspaceId === 'all'
                        ? 'All Workspaces'
                        : activeWorkspace?.name || 'Personal Workspace'}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  {isWorkspaceDropdownOpen && (
                    <div
                      className="absolute left-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                      onMouseLeave={() => setIsWorkspaceDropdownOpen(false)}
                    >
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Select Workspace
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWorkspaceId('all');
                          setIsWorkspaceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                          selectedWorkspaceId === 'all'
                            ? 'text-sky-500 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>All Canvases</span>
                        {selectedWorkspaceId === 'all' && <Check className="h-3.5 w-3.5" />}
                      </button>
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => {
                            setSelectedWorkspaceId(ws.id);
                            setIsWorkspaceDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                            selectedWorkspaceId === ws.id
                              ? 'text-sky-500 font-bold'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          {selectedWorkspaceId === ws.id && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Clerk Team Workspace Switcher */}
          <div className="hidden sm:flex items-center">
            <OrganizationSwitcher
              hidePersonal={false}
              afterCreateOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: 'flex items-center',
                  organizationSwitcherTrigger:
                    'rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-sky-500/30 transition-all shadow-sm',
                },
              }}
            />
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search architecture diagrams, services, tags..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
            />
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-500 hover:border-sky-500/30 transition-all shadow-sm"
          >
            <span>Live Studio</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>

          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8 ring-2 ring-sky-500/20 hover:ring-sky-500/50 transition-all',
              },
            }}
          />
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-8 pb-16">
        {/* Quick Start / New Canvas Hero Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {selectedWorkspaceId === 'all'
                  ? 'Engineering Workspaces'
                  : `${activeWorkspace?.name || 'Workspace'} Architecture`}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Collaborative distributed systems design studio with CRDT state synchronization.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all self-start md:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>New Architecture Canvas</span>
            </button>
          </div>

          {/* Quick Blueprint Starter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-sky-500/40 text-left transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  Blank Architecture
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Start fresh with Whiteboard and React Flow tools
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-500/40 text-left transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  Microservices Pipeline
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Gateway, Order Service, Payments & Queues
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-purple-500/40 text-left transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  CQRS Event Stream
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Event sourcing with Kafka partitioned streams
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Saved Architectures Grid Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Recent Canvases
            </h2>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {filteredRooms.length}
            </span>
          </div>

          <button
            onClick={fetchRooms}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Refresh diagrams list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Canvases Grid */}
        <div className="pt-6">
          {isLoading && rooms.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 animate-pulse"
                />
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <FolderKanban className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {searchQuery ? 'No matching architecture canvases' : 'No architecture canvases yet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5">
                {searchQuery
                  ? 'Try refining your search terms or create a new diagram.'
                  : 'Start designing scalable distributed systems with live whiteboard and simulation synchronization.'}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Canvas</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredRooms.map((room) => (
                <CanvasCard key={room.id} room={room} onDelete={handleDeleteRoom} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Canvas Modal */}
      <CreateCanvasModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={
          selectedWorkspaceId !== 'all'
            ? selectedWorkspaceId
            : activeWorkspace?.id || organization?.id || workspaces[0]?.id
        }
      />
    </div>
  );
}
