'use client';

import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import {
  ApiGatewayNode,
  ServiceNode,
  DatabaseNode,
  QueueNode,
} from '@/components/nodes/ArchitectureNodes';
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
  const { screenToFlowPosition, setViewport } = useReactFlow();

  const {
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
  } = useCanvasStore();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as ComponentType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
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
        className="collabarch-flow-canvas"
      >
        {/* Subtle grid background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={theme === 'dark' ? '#1e293b' : '#cbd5e1'}
        />

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
