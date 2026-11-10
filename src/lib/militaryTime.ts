/**
 * Real-world enlistment calendar math for the Time Capsule feature.
 *
 * Everything here derives from real `Date` values and the `ENLISTMENT_CONFIG`
 * dates (both parsed local, at midnight). Days served / remaining use whole-day
 * deltas so the result is stable across the SSR + first-client render (no
 * seconds drift) — callers that display the countdown still gate on the store's
 * `timeCapsuleHydrated` flag so the first paint is deterministic.
 */
import { ENLISTMENT_CONFIG, type TimeCapsuleLetter } from '@/data/militaryLetters';

export interface MilitaryTimeSnapshot {
  /** Whole days from `startDate` to today (0 before enlistment, `totalDays` or more after discharge). */
  daysServed: number;
  /** Whole days from today to `dischargeDate` (0 once the service is done). */
  daysRemaining: number;
  /** Whole days from today to `startDate` (0 from enlistment onward). */
  daysUntilStart: number;
  /** True when today is strictly before the enlistment `startDate`. */
  beforeEnlistment: boolean;
  /** Enlistment progress as a whole number, clamped to [0, 100]. */
  progressPercentage: number;
  /** The configured total service length in days. */
  totalDays: number;
  /** True when today's at or after the discharge date. */
  serviceComplete: boolean;
}

/** Whole days between two local calendar dates (target − base). */
export function daysBetween(baseIso: string, targetIso: string): number {
  return Math.round((parseDate(targetIso).getTime() - parseDate(baseIso).getTime()) / 86_400_000);
}

/** Parse 'YYYY-MM-DD' as local midnight — a Date, not a UTC timestamp. */
function parseDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Live countdown snapshot against `now` (default the real clock).
 * `daysServed`/`daysRemaining` floor/ceil at 0 so the banner never shows a
 * negative count; `progressPercentage` clamps to [0, 100].
 */
export function getMilitaryTimeSnapshot(now: number = Date.now()): MilitaryTimeSnapshot {
  const start = parseDate(ENLISTMENT_CONFIG.startDate).getTime();
  const discharge = parseDate(ENLISTMENT_CONFIG.dischargeDate).getTime();
  const totalDays = ENLISTMENT_CONFIG.totalDays;

  const daysServed = Math.max(0, Math.round((startOfDay(now) - start) / 86_400_000));
  const daysRemaining = Math.max(0, Math.round((discharge - startOfDay(now)) / 86_400_000));
  const daysUntilStart = Math.max(0, Math.round((start - startOfDay(now)) / 86_400_000));

  const pct = totalDays > 0 ? (daysServed / totalDays) * 100 : 0;
  const progressPercentage = Math.max(0, Math.min(100, Math.round(pct)));

  return {
    daysServed,
    daysRemaining,
    daysUntilStart,
    beforeEnlistment: startOfDay(now) < start,
    progressPercentage,
    totalDays,
    serviceComplete: startOfDay(now) >= discharge,
  };
}

/** True when a letter's real-world unlock date has been reached. */
export function isLetterUnlocked(letter: TimeCapsuleLetter, now: number = Date.now()): boolean {
  return parseDate(letter.unlockDate).getTime() <= startOfDay(now);
}

/** Ids of the letters already unlocked by `now`. */
export function getUnlockedLetterIds(letters: readonly TimeCapsuleLetter[], now: number = Date.now()): string[] {
  return letters.filter((l) => isLetterUnlocked(l, now)).map((l) => l.id);
}

/** 'DD/MM/YYYY' label used by the locked-letter rows + reader header. */
export function formatLetterDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
