import type { TimeSlot } from '@/data/types';

/**
 * Real-time clock routing:
 * 06:00–11:29 MORNING · 11:30–17:59 AFTERNOON · 18:00–22:29 EVENING · 22:30–05:59 NIGHT
 */
export function getCurrentTimeSlot(date: Date = new Date()): TimeSlot {
  const h = date.getHours();
  const m = date.getMinutes();
  const t = h * 60 + m;
  if (t >= 6 * 60 && t < 11 * 60 + 30) return 'MORNING';
  if (t >= 11 * 60 + 30 && t < 18 * 60) return 'AFTERNOON';
  if (t >= 18 * 60 && t < 22 * 60 + 30) return 'EVENING';
  return 'NIGHT';
}

export function formatTimeSlotLabel(slot: TimeSlot): { label: string; icon: string } {
  switch (slot) {
    case 'MORNING':
      return { label: 'Buổi sáng', icon: '🌅' };
    case 'AFTERNOON':
      return { label: 'Buổi chiều', icon: '☀️' };
    case 'EVENING':
      return { label: 'Buổi tối', icon: '🌆' };
    case 'NIGHT':
      return { label: 'Đêm khuya', icon: '🌙' };
  }
}
