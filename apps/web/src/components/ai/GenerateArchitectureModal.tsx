'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Loader2,
  ArrowRight,
  BrainCircuit,
  Zap,
  Server,
  Network,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

interface GenerateArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetItem {
  icon: string;
  label: string;
  prompt: string;
}

const PRESET_CHIPS: PresetItem[] = [
  {
    icon: '🚗',
    label: 'Uber Ridesharing & Matching Engine',
    prompt:
      'Design an Uber ridesharing backend with microservices, Redis geospatial cache, Kafka event streaming, and PostgreSQL persistent trip records.',
  },
  {
    icon: '🛒',
    label: 'E-Commerce Microservices & CQRS',
    prompt:
      'Design a high-scale e-commerce platform using CQRS pattern with API gateway, product catalog service, shopping cart Redis cache, order placement service, Kafka pub/sub, and Aurora database.',
  },
  {
    icon: '🧠',
    label: 'AI / RAG Semantic Search Pipeline',
    prompt:
      'Design an enterprise AI RAG semantic search pipeline with API gateway, document ingestion service, Kafka queue, vector database with embeddings index, cache layer, and LLM orchestration service.',
  },
  {
    icon: '💬',
    label: 'Global Real-Time Chat (WebSockets)',
    prompt:
      'Design a global real-time chat architecture with WebSocket gateway, presence service with Redis cluster, chat messaging microservice, RabbitMQ fanout broker, and distributed NoSQL message store.',
  },
  {
    icon: '💳',
    label: 'Fintech Payment Processing (High ACID)',
    prompt:
      'Design a high-reliability fintech payment processing architecture with API gateway, auth service, payment orchestration service with idempotency cache, external banking API, RabbitMQ queue, and sharded PostgreSQL ledger.',
  },
];

const GENERATING_STEPS = [
  {
    step: 1,
    title: 'Analyzing distributed system requirements...',
    subtitle: 'Extracting scale, durability constraints, and ingress boundaries.',
    icon: BrainCircuit,
  },
  {
    step: 2,
    title: "Selecting cloud components and Little's Law capacities...",
    subtitle: 'Computing sustained RPS, queue depth limits, and latency targets.',
    icon: Server,
  },
  {
    step: 3,
    title: 'Auto-routing network protocols and edge paths...',
    subtitle: 'Calculating non-overlapping coordinates and protocol topologies.',
    icon: Network,
  },
];

export function GenerateArchitectureModal({ isOpen, onClose }: GenerateArchitectureModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { roomId, setNodes, setEdges, setAiSummaryToast } = useCanvasStore();
  const { fitView } = useReactFlow();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setActiveStepIndex(0);
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Sequential loading step animation timer
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % GENERATING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  const executeGeneration = async (promptText: string) => {
    const cleanPrompt = promptText.trim();
    if (!cleanPrompt) {
      setErrorMessage('Please enter an architecture description or click a preset.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setActiveStepIndex(0);

    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
      const res = await fetch(`${serverUrl}/ai/generate-architecture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          roomId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.message || `Architecture generation failed with status ${res.status}`
        );
      }

      const data = await res.json();

      if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        throw new Error('Gemini API returned an empty architecture topology.');
      }

      // 1. Immediately apply generated nodes & edges to canvas
      setNodes(data.nodes);
      setEdges(data.edges || []);

      // 2. Set architectural summary toast banner
      setAiSummaryToast({
        title: data.title || 'Generated Distributed Architecture',
        summary: data.summary || 'Architecture synthesized with Google Gemini API.',
        nodeCount: data.nodes.length,
        edgeCount: (data.edges || []).length,
      });

      // 3. Smoothly center diagram in viewport
      setTimeout(() => {
        try {
          fitView({ padding: 0.25, duration: 600 });
        } catch (fitErr) {
          console.warn('[AI Architect] fitView error:', fitErr);
        }
      }, 150);

      // 4. Close modal
      onClose();
    } catch (err: any) {
      console.error('[AI Architect] Generation failed:', err);
      setErrorMessage(err?.message || 'Failed to generate architecture. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePresetClick = (preset: PresetItem) => {
    setPrompt(preset.prompt);
    executeGeneration(preset.prompt);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeGeneration(prompt);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-indigo-500/10 overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
      >
        {/* Subtle top gradient accent banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="ai-modal-title" className="text-base font-bold tracking-tight flex items-center gap-2">
                <span>AI Architect</span>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Google Gemini
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Describe your distributed system and synthesize diagram in real-time.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Preset Chips Carousel / Wrap */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              ⚡ Quick-Start Architectural Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_CHIPS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handlePresetClick(preset)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-600/40 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all duration-150 disabled:opacity-50 text-left group"
                >
                  <span className="text-sm shrink-0 group-hover:scale-110 transition-transform">
                    {preset.icon}
                  </span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Textarea */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="ai-prompt-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Natural Language Prompt
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  Cmd + Enter to generate
                </span>
              </div>
              <textarea
                id="ai-prompt-input"
                ref={textareaRef}
                value={prompt}
                disabled={isGenerating}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={4}
                placeholder="Describe your system (e.g. Design a real-time multiplayer gaming server with WebSocket gateway, Redis matchmaker, and DynamoDB player state)..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/80 p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50 resize-none"
              />
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Generating State Animation */}
            {isGenerating && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-md shadow-indigo-500/30">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      Step {activeStepIndex + 1} of {GENERATING_STEPS.length}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {GENERATING_STEPS[activeStepIndex].title}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pl-11">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {GENERATING_STEPS[activeStepIndex].subtitle}
                  </p>
                  {/* Step progress pills */}
                  <div className="flex gap-1.5 pt-1">
                    {GENERATING_STEPS.map((s, idx) => (
                      <div
                        key={s.step}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-all duration-300',
                          idx === activeStepIndex
                            ? 'bg-indigo-500 ring-2 ring-indigo-500/30'
                            : idx < activeStepIndex
                            ? 'bg-indigo-400 dark:bg-indigo-600'
                            : 'bg-slate-200 dark:bg-slate-800'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Auto-topological layout
                </span>
                <span>•</span>
                <span>CRDT live sync</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGenerating}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                      <span>Generate Architecture</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

