'use client';

import React, { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore, getSimulationEngine } from '@/store/canvas-store';

export function SimulationPacketCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getViewport, getNodes } = useReactFlow();
  const { activeMode, isSimulating } = useCanvasStore();

  useEffect(() => {
    if (!isSimulating || activeMode !== 'simulator') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const targetWidth = Math.round(rect.width * dpr);
      const targetHeight = Math.round(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const engine = getSimulationEngine();
      const packets = engine.getActivePackets();

      if (packets.length > 0) {
        const { x: vpX, y: vpY, zoom } = getViewport();
        const nodes = getNodes();
        const nodeMap = new Map<string, (typeof nodes)[0]>();
        for (const n of nodes) {
          nodeMap.set(n.id, n);
        }

        for (const packet of packets) {
          const srcNode = nodeMap.get(packet.sourceNodeId);
          const tgtNode = nodeMap.get(packet.targetNodeId);
          if (!srcNode || !tgtNode) continue;

          const srcW = srcNode.measured?.width || 270;
          const srcH = srcNode.measured?.height || 220;
          const tgtW = tgtNode.measured?.width || 270;
          const tgtH = tgtNode.measured?.height || 220;

          let sx: number, sy: number, tx: number, ty: number;
          let cpx1: number, cpy1: number, cpx2: number, cpy2: number;

          const isHorizontal =
            Math.abs(tgtNode.position.x - srcNode.position.x) >=
            Math.abs(tgtNode.position.y - srcNode.position.y);

          if (isHorizontal) {
            if (tgtNode.position.x >= srcNode.position.x) {
              sx = srcNode.position.x + srcW;
              sy = srcNode.position.y + srcH * 0.5;
              tx = tgtNode.position.x;
              ty = tgtNode.position.y + tgtH * 0.5;
            } else {
              sx = srcNode.position.x;
              sy = srcNode.position.y + srcH * 0.5;
              tx = tgtNode.position.x + tgtW;
              ty = tgtNode.position.y + tgtH * 0.5;
            }
            const dx = Math.max(30, Math.abs(tx - sx) * 0.5);
            cpx1 = sx + (tx >= sx ? dx : -dx);
            cpy1 = sy;
            cpx2 = tx - (tx >= sx ? dx : -dx);
            cpy2 = ty;
          } else {
            if (tgtNode.position.y >= srcNode.position.y) {
              sx = srcNode.position.x + srcW * 0.5;
              sy = srcNode.position.y + srcH;
              tx = tgtNode.position.x + tgtW * 0.5;
              ty = tgtNode.position.y;
            } else {
              sx = srcNode.position.x + srcW * 0.5;
              sy = srcNode.position.y;
              tx = tgtNode.position.x + tgtW * 0.5;
              ty = tgtNode.position.y + tgtH;
            }
            const dy = Math.max(30, Math.abs(ty - sy) * 0.5);
            cpx1 = sx;
            cpy1 = sy + (ty >= sy ? dy : -dy);
            cpx2 = tx;
            cpy2 = ty - (ty >= sy ? dy : -dy);
          }

          // Cubic Bezier interpolation
          const t = Math.max(0, Math.min(1, packet.progress));
          const oneMinusT = 1 - t;
          const oneMinusT2 = oneMinusT * oneMinusT;
          const oneMinusT3 = oneMinusT2 * oneMinusT;
          const t2 = t * t;
          const t3 = t2 * t;

          const flowX =
            oneMinusT3 * sx +
            3 * oneMinusT2 * t * cpx1 +
            3 * oneMinusT * t2 * cpx2 +
            t3 * tx;
          const flowY =
            oneMinusT3 * sy +
            3 * oneMinusT2 * t * cpy1 +
            3 * oneMinusT * t2 * cpy2 +
            t3 * ty;

          // Convert flow coordinates to screen canvas coordinates
          const screenX = flowX * zoom + vpX;
          const screenY = flowY * zoom + vpY;

          // Determine packet visual style based on health & queuing state
          let fillColor = '#38bdf8'; // Cyan / Sky (Healthy in-flight)
          let glowColor = 'rgba(56, 189, 248, 0.9)';

          if (packet.status === 'dropped') {
            fillColor = '#ef4444'; // Red (Dropping / failed)
            glowColor = 'rgba(239, 68, 68, 0.9)';
          } else if (packet.isDelayed || packet.status === 'queuing') {
            fillColor = '#f59e0b'; // Amber (Delayed / queued)
            glowColor = 'rgba(245, 158, 11, 0.9)';
          }

          const radius = Math.max(3, 4.5 * Math.min(zoom, 1.4));

          // Draw outer neon glow
          ctx.save();
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 10 * Math.min(zoom, 1.3);
          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fill();

          // Draw bright white center core
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenX, screenY, Math.max(1.5, radius * 0.45), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isSimulating, activeMode, getViewport, getNodes]);

  if (activeMode !== 'simulator') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}

