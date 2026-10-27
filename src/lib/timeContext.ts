/**
 * Real-world ambience layer: categorizes the player's local clock hour into a
 * period, feeds the visual theme, audio ambience, and deck-draw boost.
 *
 * This is a SEPARATE system from lib/timeSlot.ts (which routes the in-game
 * TimeSlot at 11:30 / 18:00 / 22:30 boundaries). The spec boundaries here are
 * on the hour: 11:00 / 17:00 / 23:00.
 */
import { useUiStore } from '@/store/useUiStore';
import type { RealTimePeriod, TimeSlot } from '@/data/types';

export type { RealTimePeriod } from '@/data/types';

export const PERIODS: readonly RealTimePeriod[] = [
  'morning',
  'afternoon',
  'evening',
  'latenight',
];

/** Categorize real-world hours (spec boundaries: 6 / 11 / 17 / 23). */
export function getRealTimePeriod(date: Date = new Date()): RealTimePeriod {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'latenight';
}

/** Map the ambience period onto the in-game TimeSlot used by the deck. */
export function periodToTimeSlot(p: RealTimePeriod): TimeSlot {
  switch (p) {
    case 'morning':
      return 'MORNING';
    case 'afternoon':
      return 'AFTERNOON';
    case 'evening':
      return 'EVENING';
    case 'latenight':
      return 'NIGHT';
  }
}

/** The period ambience/UI actually use: a dev override wins over the clock. */
export function getActivePeriod(date: Date = new Date()): RealTimePeriod {
  return useUiStore.getState().devPeriodOverride ?? getRealTimePeriod(date);
}

export interface PeriodTheme {
  label: string;
  icon: string;
  /** CSS `background` value for the viewport overlay layer. */
  overlay: string;
  dim?: boolean;
  moon?: boolean;
  stars?: boolean;
}

/** One source for per-period visual theming (used by GameViewport + tests). */
export const PERIOD_THEMES: Record<RealTimePeriod, PeriodTheme> = {
  morning: {
    label: 'Buổi sáng',
    icon: '🌅',
    overlay:
      'linear-gradient(to bottom, rgba(254, 233, 184, 0.55), rgba(254, 249, 238, 0) 40%)',
  },
  afternoon: {
    label: 'Buổi chiều',
    icon: '☀️',
    overlay:
      'linear-gradient(to bottom, rgba(255, 255, 255, 0.35), rgba(253, 251, 247, 0) 30%)',
  },
  evening: {
    label: 'Buổi tối',
    icon: '🌆',
    overlay:
      'linear-gradient(to bottom right, rgba(251, 176, 194, 0.4), rgba(180, 130, 226, 0.3))',
  },
  latenight: {
    label: 'Đêm khuya',
    icon: '🌙',
    overlay:
      'radial-gradient(ellipse at center, rgba(31, 30, 36, 0.30) 0%, rgba(31, 30, 36, 0.55) 100%)',
    dim: true,
    moon: true,
    stars: true,
  },
};
