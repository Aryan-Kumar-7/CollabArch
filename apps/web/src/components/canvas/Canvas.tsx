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
    <div ref={reactFlowWrapper} className="relative flex-1 h-full w-full bg-slate-950">
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
          style: { stroke: '#475569', strokeWidth: 2 },
        }}
        className="collabarch-flow-canvas"
      >
        {/* Subtle grid background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#1e293b"
        />

        {/* Minimalist Controls */}
        <Controls
          showInteractive={false}
          className="!bg-slate-900/80 !border !border-slate-800 !rounded-xl !shadow-xl !backdrop-blur-md overflow-hidden"
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
          maskColor="rgba(8, 12, 20, 0.75)"
          className="!bg-slate-900/90 !border !border-slate-800 !rounded-xl !shadow-2xl overflow-hidden !m-4"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
