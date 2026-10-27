import { describe, expect, it } from 'vitest';
import { getCurrentTimeSlot, formatTimeSlotLabel } from '@/lib/timeSlot';
import type { TimeSlot } from '@/data/types';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 0, 1, hour, minute, 0);
}

describe('getCurrentTimeSlot', () => {
  const cases: Array<[number, number, TimeSlot]> = [
    [6, 0, 'MORNING'],
    [9, 30, 'MORNING'],
    [11, 29, 'MORNING'],
    [11, 30, 'AFTERNOON'],
    [14, 0, 'AFTERNOON'],
    [17, 59, 'AFTERNOON'],
    [18, 0, 'EVENING'],
    [20, 30, 'EVENING'],
    [22, 29, 'EVENING'],
    [22, 30, 'NIGHT'],
    [23, 59, 'NIGHT'],
    [0, 0, 'NIGHT'],
    [5, 59, 'NIGHT'],
  ];
  it.each(cases)('at %s:%s → %s', (h, m, expected) => {
    expect(getCurrentTimeSlot(at(h, m))).toBe(expected);
  });

  it('uses the real device clock when no date is given', () => {
    const slot = getCurrentTimeSlot();
    expect(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']).toContain(slot);
  });
});

describe('formatTimeSlotLabel', () => {
  it('labels every slot in Vietnamese with an icon', () => {
    const slots: TimeSlot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
    for (const s of slots) {
      const { label, icon } = formatTimeSlotLabel(s);
      expect(label.length).toBeGreaterThan(0);
      expect(icon.length).toBeGreaterThan(0);
    }
    expect(formatTimeSlotLabel('MORNING').label).toBe('Buổi sáng');
    expect(formatTimeSlotLabel('NIGHT').icon).toBe('🌙');
  });
});
