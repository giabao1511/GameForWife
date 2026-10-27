'use client';

import { create } from 'zustand';
import { setMuted } from '@/lib/audio';
import type { RealTimePeriod } from '@/lib/timeContext';

const LS_UI_KEY = 'bf_sim_ui';

interface UiState {
  muted: boolean;
  setMutedState: (muted: boolean) => void;
  /** Post-mount hydration of the persisted preference (keeps SSR deterministic). */
  hydrateMuted: () => void;
  /** Dev-only manual ambience period override (null = follow the real clock). */
  devPeriodOverride: RealTimePeriod | null;
  setDevPeriodOverride: (p: RealTimePeriod | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  // Deterministic on server + first client render; hydrateMuted() applies the
  // stored preference exactly once after mount.
  muted: false,
  // Never persisted — a dev preview aid that must not survive a reload.
  devPeriodOverride: null,
  setDevPeriodOverride: (p) => set({ devPeriodOverride: p }),
  setMutedState: (muted) => {
    set({ muted });
    setMuted(muted);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(LS_UI_KEY, muted ? 'muted' : 'sound');
    } catch {
      // ignore
    }
  },
  hydrateMuted: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(LS_UI_KEY);
      if (stored) useUiStore.getState().setMutedState(stored === 'muted');
    } catch {
      // ignore
    }
  },
}));
