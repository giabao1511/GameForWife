import { beforeEach, describe, expect, it } from 'vitest';
import {
  getActivePeriod,
  getRealTimePeriod,
  periodToTimeSlot,
} from '@/lib/timeContext';
import type { RealTimePeriod } from '@/lib/timeContext';
import { useUiStore } from '@/store/useUiStore';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 0, 1, hour, minute, 0);
}

beforeEach(() => useUiStore.setState({ devPeriodOverride: null }));

describe('getRealTimePeriod', () => {
  const cases: Array<[number, number, RealTimePeriod]> = [
    [5, 59, 'latenight'],
    [6, 0, 'morning'],
    [10, 59, 'morning'],
    [11, 0, 'afternoon'],
    [16, 59, 'afternoon'],
    [17, 0, 'evening'],
    [22, 59, 'evening'],
    [23, 0, 'latenight'],
    [0, 0, 'latenight'],
  ];
  it.each(cases)('at %s:%s → %s', (h, m, expected) => {
    expect(getRealTimePeriod(at(h, m))).toBe(expected);
  });

  it('uses the device clock when no date is given', () => {
    expect(getRealTimePeriod()).not.toBeNull();
  });
});

describe('periodToTimeSlot', () => {
  it('maps each period onto the in-game TimeSlot', () => {
    expect(periodToTimeSlot('morning')).toBe('MORNING');
    expect(periodToTimeSlot('afternoon')).toBe('AFTERNOON');
    expect(periodToTimeSlot('evening')).toBe('EVENING');
    expect(periodToTimeSlot('latenight')).toBe('NIGHT');
  });
});

describe('getActivePeriod (dev override)', () => {
  it('falls back to the real clock when the override is null', () => {
    expect(getActivePeriod(at(14, 0))).toBe('afternoon');
  });

  it('returns the override when set', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    expect(getActivePeriod(at(14, 0))).toBe('latenight');
  });
});
