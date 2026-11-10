import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { ENLISTMENT_CONFIG, TIME_CAPSULE_LETTERS } from '@/data/militaryLetters';
import {
  getMilitaryTimeSnapshot,
  isLetterUnlocked,
  getUnlockedLetterIds,
  daysBetween,
  formatLetterDate,
} from '@/lib/militaryTime';

const LS_READ_LETTERS = 'bf_sim_read_letters';

beforeEach(() => {
  localStorage.removeItem(LS_READ_LETTERS);
  useGameStore.setState({
    timeCapsuleHydrated: false,
    readLetters: {},
    isTimeCapsuleOpen: false,
    selectedLetterId: null,
  });
});

describe('military countdown math', () => {
  it('computes days served / remaining from real dates and clamps progress to [0,100]', () => {
    // Simulate "today" as mid-service: 2028-02-15 (exactly one year in).
    const now = new Date('2028-02-15T12:00:00').getTime();
    const snap = getMilitaryTimeSnapshot(now);
    expect(snap.daysServed).toBe(daysBetween(ENLISTMENT_CONFIG.startDate, '2028-02-15'));
    expect(snap.daysRemaining).toBe(daysBetween('2028-02-15', ENLISTMENT_CONFIG.dischargeDate));
    // Served + remaining always tile the configured span (731 days here — it
    // crosses the 2028 leap year, even though `totalDays` is rounded to 730).
    expect(snap.daysServed + snap.daysRemaining).toBe(
      daysBetween(ENLISTMENT_CONFIG.startDate, ENLISTMENT_CONFIG.dischargeDate),
    );
    expect(snap.progressPercentage).toBe(Math.round((snap.daysServed / ENLISTMENT_CONFIG.totalDays) * 100));
    expect(snap.serviceComplete).toBe(false);
  });

  it('floors daysServed at 0 before enlistment and reports 100% after discharge', () => {
    const before = getMilitaryTimeSnapshot(new Date('2027-01-01').getTime());
    expect(before.daysServed).toBe(0);
    expect(before.progressPercentage).toBe(0);
    expect(before.serviceComplete).toBe(false);

    const after = getMilitaryTimeSnapshot(new Date('2029-12-31').getTime());
    expect(after.daysRemaining).toBe(0);
    expect(after.progressPercentage).toBe(100);
    expect(after.serviceComplete).toBe(true);
  });

  it('isLetterUnlocked compares unlock dates against the real clock', () => {
    const future = TIME_CAPSULE_LETTERS.find((l) => l.id === 'letter_month_1')!;
    expect(isLetterUnlocked(future, new Date('2027-03-15T00:00:00').getTime())).toBe(true);
    expect(isLetterUnlocked(future, new Date('2027-03-14T23:59:59').getTime())).toBe(false);
    expect(getUnlockedLetterIds(TIME_CAPSULE_LETTERS, new Date('2027-03-20').getTime())).toEqual([
      'letter_day_1',
      'letter_week_1',
      'letter_month_1',
    ]);
  });

  it('formatLetterDate renders DD/MM/YYYY', () => {
    expect(formatLetterDate('2027-02-15')).toBe('15/02/2027');
  });
});

describe('time capsule store slice', () => {
  it('markLetterAsRead records the ISO timestamp and persists to localStorage', () => {
    useGameStore.getState().markLetterAsRead('letter_day_1');
    const entry = useGameStore.getState().readLetters['letter_day_1'];
    expect(entry?.isRead).toBe(true);
    expect(entry?.readAt).toBeTruthy();
    expect(new Date(entry!.readAt!).getTime()).not.toBeNaN();

    const persisted = JSON.parse(localStorage.getItem(LS_READ_LETTERS)!) as Record<string, { isRead: boolean; readAt?: string }>;
    expect(persisted['letter_day_1']?.isRead).toBe(true);
  });

  it('deduplicates re-reads of the same letter', () => {
    useGameStore.getState().markLetterAsRead('letter_day_1');
    const first = useGameStore.getState().readLetters['letter_day_1'];
    useGameStore.getState().markLetterAsRead('letter_day_1');
    expect(useGameStore.getState().readLetters['letter_day_1']).toEqual(first);
  });

  it('open/close + selected letter toggle modal + reader state', () => {
    const s = () => useGameStore.getState();
    s().openTimeCapsule();
    expect(s().isTimeCapsuleOpen).toBe(true);
    s().setSelectedLetter('letter_day_1');
    expect(s().selectedLetterId).toBe('letter_day_1');
    s().closeTimeCapsule();
    expect(s().isTimeCapsuleOpen).toBe(false);
    expect(s().selectedLetterId).toBe(null); // closing clears the reader
  });

  it('hydrateFromStorage loads the persisted read map and flips timeCapsuleHydrated', () => {
    localStorage.setItem(LS_READ_LETTERS, JSON.stringify({ letter_day_1: { isRead: true, readAt: 'x' } }));
    useGameStore.getState().hydrateFromStorage();
    const s = useGameStore.getState();
    expect(s.timeCapsuleHydrated).toBe(true);
    expect(s.readLetters['letter_day_1']?.isRead).toBe(true);
  });
});
