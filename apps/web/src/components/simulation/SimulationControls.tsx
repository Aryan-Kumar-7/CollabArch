'use client';

import React from 'react';
import { Play, Pause, Square, Zap, Gauge } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { cn } from '@/lib/utils';

export function SimulationControls() {
  const {
    activeMode,
    isSimulating,
    isSimPaused,
    simSpeed,
    simTrafficRps,
    simBurstMode,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setSimTrafficRps,
    setSimSpeed,
    triggerBurst,
  } = useCanvasStore();

  if (activeMode !== 'simulator') {
    return null;
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 sm:gap-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 px-3.5 sm:px-4 py-2 backdrop-blur-xl shadow-xl transition-all duration-200 select-none">
      {/* Play / Pause / Stop Controls */}
      <div className="flex items-center gap-1.5">
        {!isSimulating ? (
          <button
            onClick={startSimulation}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            title="Start Simulation"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Start</span>
          </button>
        ) : (
          <>
            {isSimPaused ? (
              <button
                onClick={resumeSimulation}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                title="Resume Simulation"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md shadow-amber-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                title="Pause Simulation"
              >
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={stopSimulation}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md shadow-rose-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              title="Stop & Reset Simulation"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          </>
        )}
      </div>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Traffic Ingress Slider & Presets */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="flex items-center gap-1.5 text-xs">
          <Gauge className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
            Ingress:
          </span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-100 min-w-[68px]">
            {simTrafficRps.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">RPS</span>
          </span>
        </div>

        <input
          type="range"
          min={100}
          max={25000}
          step={100}
          value={simTrafficRps}
          onChange={(e) => setSimTrafficRps(Number(e.target.value))}
          className="w-20 sm:w-28 md:w-36 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          title={`Traffic Ingress: ${simTrafficRps.toLocaleString()} RPS`}
        />

        <div className="flex items-center gap-1">
          {[
            { label: '1k', val: 1000 },
            { label: '5k', val: 5000 },
            { label: '10k', val: 10000 },
            { label: '25k', val: 25000 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => setSimTrafficRps(preset.val)}
              className={cn(
                'px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer',
                simTrafficRps === preset.val
                  ? 'bg-sky-500 text-white font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
              title={`Preset ${preset.label} (${preset.val.toLocaleString()} RPS)`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Speed Selector */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden md:inline">
          Speed:
        </span>
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/80 dark:border-slate-800">
          {[1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimSpeed(spd)}
              className={cn(
                'px-2 py-0.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                simSpeed === spd
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
              title={`${spd}x Simulation Speed`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Burst Button */}
      <button
        onClick={triggerBurst}
        disabled={!isSimulating}
        className={cn(
          'flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
          !isSimulating
            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
            : simBurstMode
              ? 'bg-amber-500 text-white animate-pulse shadow-md shadow-amber-500/40 ring-2 ring-amber-400/80 scale-105'
              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30'
        )}
        title="Spike traffic 2.5x for 3 seconds"
      >
        <Zap className="h-3.5 w-3.5 fill-current" />
        <span>Burst</span>
      </button>
    </div>
  );
}

