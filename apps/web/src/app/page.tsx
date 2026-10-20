'use client';

import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasToolbar } from '@/components/toolbar/CanvasToolbar';
import { ComponentPalette } from '@/components/sidebar/ComponentPalette';
import { NodeInspector } from '@/components/inspector/NodeInspector';
import { Canvas } from '@/components/canvas/Canvas';

export default function Home() {
  return (
    <ReactFlowProvider>
      <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
        <CanvasToolbar />
        <div className="relative flex flex-1 overflow-hidden">
          <ComponentPalette />
          <Canvas />
          <NodeInspector />
        </div>
      </main>
    </ReactFlowProvider>
  );
}
