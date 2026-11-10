'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { THEME_BY_ID, resolveClockTheme, type AppTheme, type AppThemeId } from '@/data/themes';

/**
 * The theme actually in effect *right now*, as a resolved `AppTheme`.
 *
 * One shared seam for the whole "Đổi Bối Cảnh & Chủ Đề" system — the viewport
 * background, the particle canvas, the card surfaces, and the ambient audio
 * all read from this, so they can never drift out of sync with each other:
 *
 *   · sync ON  → follow the real wall clock (pastel / sunset / starry_camp)
 *   · sync OFF → the player's manual pick
 *
 * Clock tracking is render-safe (no `new Date()` in the render body — Next 16
 * 16 blocks that at prerender). The clock value is a deterministic default on
 * the first paint and is reconciled to the real time in a post-mount effect,
 * polled every minute so the 17:00 / 20:00 / 06:00 transitions are caught.
 */
export function useActiveTheme(): AppTheme {
  const appThemeId = useGameStore((s) => s.appThemeId);
  const themeSyncOn = useGameStore((s) => s.themeSyncOn);

  // Deterministic default for the first paint (pre-effect + SSR-safe).
  const [clockTheme, setClockTheme] = useState<AppThemeId>('pastel');

  useEffect(() => {
    if (!themeSyncOn) return;
    setClockTheme(resolveClockTheme());
    const id = window.setInterval(() => setClockTheme(resolveClockTheme()), 60_000);
    return () => window.clearInterval(id);
  }, [themeSyncOn]);

  const id = themeSyncOn ? clockTheme : appThemeId;
  return THEME_BY_ID[id];
}

/**
 * The current ambient audio bed for the active theme, as a URL or null (themes
 * without a loop). Split from `useActiveTheme` so audio-only consumers (the
 * page-level bed driver) can subscribe without re-rendering the canvas/viewport.
 */
export function useActiveThemeAudio(): string | null {
  const theme = useActiveTheme();
  return theme.ambientAudio ?? null;
}
