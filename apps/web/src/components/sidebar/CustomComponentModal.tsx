'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Gauge,
  Clock,
  Cpu,
  Globe,
  Database,
  Zap,
  Server,
  Box,
  Shield,
  Activity,
  Layers,
  Terminal,
  Flame,
  HardDrive,
  Binary,
  ExternalLink,
  Workflow,
  Cloud,
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

interface CustomComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Cpu', icon: Cpu, label: 'Compute' },
  { name: 'Globe', icon: Globe, label: 'Network' },
  { name: 'Database', icon: Database, label: 'Database' },
  { name: 'Zap', icon: Zap, label: 'Cache' },
  { name: 'Server', icon: Server, label: 'Server' },
  { name: 'Flame', icon: Flame, label: 'Serverless' },
  { name: 'HardDrive', icon: HardDrive, label: 'Storage' },
  { name: 'Binary', icon: Binary, label: 'Vector/AI' },
  { name: 'Layers', icon: Layers, label: 'Queue' },
  { name: 'Box', icon: Box, label: 'Container' },
  { name: 'Shield', icon: Shield, label: 'Security' },
  { name: 'Cloud', icon: Cloud, label: 'Cloud' },
  { name: 'ExternalLink', icon: ExternalLink, label: 'API/SaaS' },
  { name: 'Terminal', icon: Terminal, label: 'Worker' },
  { name: 'Activity', icon: Activity, label: 'Telemetry' },
  { name: 'Workflow', icon: Workflow, label: 'Workflow' },
];

const PRESET_COLORS = [
  { name: 'Sky Blue', hex: '#0ea5e9' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Pink', hex: '#ec4899' },
];

export function CustomComponentModal({ isOpen, onClose }: CustomComponentModalProps) {
  const { addCustomComponent } = useCanvasStore();

  const [name, setName] = useState('');
  const [baseRps, setBaseRps] = useState(2500);
  const [latencyMs, setLatencyMs] = useState(30);
  const [selectedIcon, setSelectedIcon] = useState('Cpu');
  const [selectedColor, setSelectedColor] = useState('#0ea5e9');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a component name');
      return;
    }

    addCustomComponent({
      name: name.trim(),
      type: 'service',
      baseRps,
      latencyMs,
      queueDepthLimit: baseRps * 2,
      failureRate: 0.005,
      iconName: selectedIcon,
      accentColor: selectedColor,
      description: description.trim() || `Custom cloud component: ${name.trim()}`,
    });

    // Reset and close
    setName('');
    setDescription('');
    setBaseRps(2500);
    setLatencyMs(30);
    setError('');
    onClose();
  };

  const SelectedIconComponent =
    AVAILABLE_ICONS.find((i) => i.name === selectedIcon)?.icon || Cpu;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Create Custom Component
              </h3>
              <p className="text-xs text-slate-500">
                Design an architectural building block for your canvas catalog.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Component Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Component Name *
            </label>
            <input
              type="text"
              placeholder="e.g. GraphQL Federation Mesh, Auth0 IdP, Webhook Worker..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
              autoFocus
            />
          </div>

          {/* Architectural Purpose Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief summary of its function in your topology..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Performance Sliders: RPS & Latency */}
          <div className="grid grid-cols-2 gap-4">
            {/* Base RPS */}
            <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Gauge className="h-3.5 w-3.5 text-sky-500" /> Throughput
                </span>
                <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                  {baseRps.toLocaleString()} RPS
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={20000}
                step={100}
                value={baseRps}
                onChange={(e) => setBaseRps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>100</span>
                <span>20k RPS</span>
              </div>
            </div>

            {/* Processing Latency */}
            <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" /> Latency
                </span>
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                  {latencyMs} ms
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={250}
                step={1}
                value={latencyMs}
                onChange={(e) => setLatencyMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>1 ms</span>
                <span>250 ms</span>
              </div>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Select Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    title={item.label}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-150',
                      isSelected
                        ? 'border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-2 ring-sky-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {PRESET_COLORS.map((color) => {
                const isSelected = selectedColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setSelectedColor(color.hex)}
                    title={color.name}
                    style={{ backgroundColor: color.hex }}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform duration-150',
                      isSelected
                        ? 'border-white dark:border-slate-950 scale-125 ring-2 ring-sky-500 shadow-md'
                        : 'border-transparent hover:scale-110'
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-3.5 space-y-2">
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Palette Preview
            </div>
            <div
              style={{ borderColor: `${selectedColor}40` }}
              className="flex items-center justify-between rounded-xl border bg-white dark:bg-slate-900 p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    backgroundColor: `${selectedColor}15`,
                    borderColor: `${selectedColor}30`,
                    color: selectedColor,
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border"
                >
                  <SelectedIconComponent className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {name || 'My Custom Service'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {baseRps.toLocaleString()} RPS • {latencyMs}ms latency
                  </div>
                </div>
              </div>
              <span
                style={{
                  backgroundColor: `${selectedColor}15`,
                  borderColor: `${selectedColor}30`,
                  color: selectedColor,
                }}
                className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase"
              >
                CUSTOM
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2 text-xs font-semibold text-white shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Save to Palette
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
