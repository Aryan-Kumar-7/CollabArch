'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Palette, Check, X, Sparkles } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';

const COLOR_SWATCHES = [
  { name: 'Sky', hex: '#38bdf8', class: 'bg-sky-400' },
  { name: 'Indigo', hex: '#818cf8', class: 'bg-indigo-400' },
  { name: 'Emerald', hex: '#34d399', class: 'bg-emerald-400' },
  { name: 'Amber', hex: '#fbbf24', class: 'bg-amber-400' },
  { name: 'Rose', hex: '#f43f5e', class: 'bg-rose-500' },
  { name: 'Purple', hex: '#a855f7', class: 'bg-purple-500' },
];

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const { userProfile, setUserProfile } = useCanvasStore();
  const [name, setName] = useState(userProfile.name);
  const [selectedColor, setSelectedColor] = useState(userProfile.color);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(userProfile.name);
      setSelectedColor(userProfile.color);
    }
  }, [isOpen, userProfile]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Aryan';
    setUserProfile({
      name: cleanName,
      color: selectedColor,
    });
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title & Avatar Preview */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-950 shadow-sm"
              style={{ backgroundColor: selectedColor }}
            >
              {(name.trim() || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Collaborator Profile
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Visible to everyone in this room
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <User className="h-3.5 w-3.5 text-sky-500" />
              <span>Your Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aryan"
              maxLength={30}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Palette className="h-3.5 w-3.5 text-indigo-500" />
              <span>Cursor & Tag Color</span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_SWATCHES.map((swatch) => {
                const isSelected = selectedColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setSelectedColor(swatch.hex)}
                    className="relative flex h-9 w-full items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: swatch.hex }}
                    title={swatch.name}
                  >
                    {isSelected && (
                      <Check className="h-4 w-4 text-slate-950 stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-500/20 hover:opacity-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
