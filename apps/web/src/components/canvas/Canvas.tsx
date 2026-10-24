'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { Layers3, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ApiGatewayNode,
  ServiceNode,
  DatabaseNode,
  QueueNode,
} from '@/components/nodes/ArchitectureNodes';
import { CommentsOverlay } from '@/components/comments/CommentsOverlay';
import {
  useCanvasStore,
  type ReactFlowNode,
  type ReactFlowEdge,
} from '@/store/canvas-store';
import { ComponentType } from '@collabarch/shared-types';

const nodeTypes: NodeTypes = {
  'api-gateway': ApiGatewayNode,
  service: ServiceNode,
  database: DatabaseNode,
  queue: QueueNode,
};

export function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const {
    activeMode,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNodeId,
    setSelectedEdgeId,
    selectedNodeId,
    selectedEdgeId,
    theme,
    userRole,
    isSidebarOpen,
    toggleSidebar,
    isInspectorOpen,
    toggleInspector,
    isCommentMode,
    newCommentTarget,
    setNewCommentTarget,
  } = useCanvasStore();

  // Auto-center canvas whenever switching into simulator mode or when nodes change
  useEffect(() => {
    if (activeMode === 'simulator') {
      const timer = setTimeout(() => {
        fitView({ padding: 0.3, duration: 400 });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeMode, fitView]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (userRole === 'viewer') return;

      const type = event.dataTransfer.getData('application/reactflow') as ComponentType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode, userRole]
  );

  return (
    <div ref={reactFlowWrapper} className="relative flex-1 h-full w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <ReactFlow<ReactFlowNode, ReactFlowEdge>
        nodes={nodes.map((n) => ({
          ...n,
          selected: n.id === selectedNodeId,
        }))}
        edges={edges.map((e) => ({
          ...e,
          selected: e.id === selectedEdgeId,
        }))}
        nodeTypes={nodeTypes}
        colorMode={theme}
        nodesDraggable={userRole !== 'viewer'}
        nodesConnectable={userRole !== 'viewer'}
        elementsSelectable={true}
        onNodesChange={userRole !== 'viewer' ? onNodesChange : undefined}
        onEdgesChange={userRole !== 'viewer' ? onEdgesChange : undefined}
        onConnect={userRole !== 'viewer' ? onConnect : undefined}
        onNodeClick={(_, node) => {
          if (isCommentMode) {
            setNewCommentTarget({
              nodeId: node.id,
              posX: Math.round(node.position.x + 230),
              posY: Math.round(node.position.y - 12),
            });
          } else {
            setSelectedNodeId(node.id);
          }
        }}
        onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={(event) => {
          if (isCommentMode) {
            const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            setNewCommentTarget({
              posX: Math.round(flowPos.x),
              posY: Math.round(flowPos.y),
            });
          } else {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{
          animated: true,
          style: {
            stroke: theme === 'dark' ? '#475569' : '#94a3b8',
            strokeWidth: 2,
          },
        }}
        className={cn('collabarch-flow-canvas', isCommentMode && 'cursor-crosshair')}
      >
        <CommentsOverlay />
        {/* Subtle grid background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={theme === 'dark' ? '#1e293b' : '#cbd5e1'}
        />
        {/* Floating Canvas Controls: Palette Toggle (Visible when Palette is collapsed) */}
        {!isSidebarOpen && (
          <Panel position="top-left" className="!m-3.5">
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 select-none cursor-pointer"
              title="Open Component Palette"
            >
              <Layers3 className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
              <span>Palette</span>
            </button>
          </Panel>
        )}

        {/* Floating Canvas Controls: Inspector Toggle (Visible when Inspector is collapsed) */}
        {!isInspectorOpen && (
          <Panel position="top-right" className="!m-3.5">
            <button
              onClick={toggleInspector}
              className="flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 select-none cursor-pointer"
              title="Open Node Inspector"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Inspector</span>
              {selectedNodeId && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Node selected" />
              )}
            </button>
          </Panel>
        )}

        {/* Minimalist Controls */}
        <Controls
          showInteractive={false}
          className="!bg-white/90 dark:!bg-slate-900/80 !border !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-xl !backdrop-blur-md overflow-hidden !fill-slate-700 dark:!fill-slate-300"
        />

        {/* Bottom Left MiniMap */}
        <MiniMap
          nodeColor={(n) => {
            switch (n.type) {
              case 'api-gateway':
                return '#38bdf8';
              case 'service':
                return '#818cf8';
              case 'database':
                return '#34d399';
              case 'queue':
                return '#fbbf24';
              default:
                return '#64748b';
            }
          }}
          maskColor={theme === 'dark' ? 'rgba(8, 12, 20, 0.75)' : 'rgba(241, 245, 249, 0.75)'}
          className="!bg-white/90 dark:!bg-slate-900/90 !border !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-2xl overflow-hidden !m-4"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
