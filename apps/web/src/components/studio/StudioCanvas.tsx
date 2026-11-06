'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasToolbar } from '@/components/toolbar/CanvasToolbar';
import { ComponentPalette } from '@/components/sidebar/ComponentPalette';
import { NodeInspector } from '@/components/inspector/NodeInspector';
import { Canvas } from '@/components/canvas/Canvas';
import { CanvasStatusHud } from '@/components/canvas/CanvasStatusHud';
import { VersionHistoryDrawer } from '@/components/history/VersionHistoryDrawer';
import { GenerateArchitectureModal } from '@/components/ai/GenerateArchitectureModal';
import { useCanvasStore } from '@/store/canvas-store';
import { SERVER_URL } from '@/lib/config';
import { cn } from '@/lib/utils';

const WhiteboardCanvas = dynamic(
  () => import('@/components/whiteboard/WhiteboardCanvas').then((mod) => mod.WhiteboardCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500 dark:text-sky-400" />
        <span className="text-sm font-medium tracking-wide">
          Loading Freehand Whiteboard Canvas...
        </span>
      </div>
    ),
  }
);

interface StudioCanvasProps {
  initialRoomId?: string;
}

export function StudioCanvas({ initialRoomId }: StudioCanvasProps) {
  const router = useRouter();
  const {
    activeMode,
    roomId,
    setRoomId,
    setWorkspaceId,
    setRoomTitle,
    userProfile,
    setUserProfile,
    isAiModalOpen,
    setIsAiModalOpen,
    toggleAiModal,
  } = useCanvasStore();

  const effectiveRoomId = (initialRoomId && initialRoomId.trim()) || roomId;

  // Global Cmd+K / Ctrl+K keyboard shortcut listener to toggle AI Architect modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleAiModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAiModal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Hydrate saved user profile from localStorage after mount
    try {
      const savedName = localStorage.getItem('collabarch_user_name');
      const savedColor = localStorage.getItem('collabarch_user_color');
      if ((savedName && savedName.trim()) || (savedColor && savedColor.trim())) {
        setUserProfile({
          ...(savedName?.trim() ? { name: savedName.trim() } : {}),
          ...(savedColor?.trim() ? { color: savedColor.trim() } : {}),
        });
      }
    } catch {}

    if (initialRoomId && initialRoomId.trim()) {
      const cleanRoom = initialRoomId.trim();
      if (useCanvasStore.getState().roomId !== cleanRoom) {
        setRoomId(cleanRoom);
      }
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      const roomParam = searchParams.get('room');

      if (roomParam && roomParam.trim()) {
        const cleanRoom = roomParam.trim();
        router.replace(`/room/${cleanRoom}`);
      } else if (!useCanvasStore.getState().roomId) {
        const newRoomId = `arch-${Math.random().toString(36).substring(2, 8)}`;
        router.replace(`/room/${newRoomId}`);
      }
    }
  }, [initialRoomId, router, setRoomId]);

  // Fetch room metadata (workspaceId, roomTitle) for active room
  useEffect(() => {
    if (!effectiveRoomId) return;
    let isDisposed = false;

    fetch(`${SERVER_URL}/rooms/${effectiveRoomId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isDisposed && data) {
          if (data.workspaceId !== undefined) {
            setWorkspaceId(data.workspaceId);
          }
          if (data.title) {
            setRoomTitle(data.title);
          }
        }
      })
      .catch(() => {});

    return () => {
      isDisposed = true;
    };
  }, [effectiveRoomId, setWorkspaceId, setRoomTitle]);

  if (!effectiveRoomId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <main className="flex h-screen w-screen flex-col overflow-hidden select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <CanvasToolbar />
        <div className="relative flex flex-1 overflow-hidden">
          <div className={cn('h-full w-full', activeMode !== 'whiteboard' && 'hidden')}>
            <WhiteboardCanvas
              key={effectiveRoomId}
              roomId={effectiveRoomId}
              userName={userProfile.name}
              userColor={userProfile.color}
            />
          </div>
          <div className={cn('h-full w-full flex overflow-hidden', activeMode !== 'simulator' && 'hidden')}>
            <ComponentPalette />
            <Canvas />
            <NodeInspector />
          </div>
        </div>
        <VersionHistoryDrawer />
        <CanvasStatusHud />
        <GenerateArchitectureModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
        />
      </main>
    </ReactFlowProvider>
  );
}
