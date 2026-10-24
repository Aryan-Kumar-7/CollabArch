'use client';

import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasToolbar } from '@/components/toolbar/CanvasToolbar';
import { ComponentPalette } from '@/components/sidebar/ComponentPalette';
import { NodeInspector } from '@/components/inspector/NodeInspector';
import { Canvas } from '@/components/canvas/Canvas';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

export default function Home() {
  const { activeMode, roomId } = useCanvasStore();

  return (
    <ReactFlowProvider>
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <CanvasToolbar />
        <div className="relative flex flex-1 overflow-hidden">
          <div className={cn('h-full w-full', activeMode !== 'whiteboard' && 'hidden')}>
            <WhiteboardCanvas roomId={roomId} />
          </div>
          <div className={cn('h-full w-full flex overflow-hidden', activeMode !== 'simulator' && 'hidden')}>
            <ComponentPalette />
            <Canvas />
            <NodeInspector />
          </div>
        </div>
      </main>
    </ReactFlowProvider>
  );
}
