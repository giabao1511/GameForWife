'use client';

import { useGameStore } from '@/store/useGameStore';
import { formatTimeSlotLabel } from '@/lib/timeSlot';
import type { TimeSlot } from '@/data/types';
import { cn } from '@/lib/cn';
import HudControls from './HudControls';

const TIME_SLOTS: TimeSlot[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];

export default function TopHud() {
  const day = useGameStore((s) => s.day);
  const chapter = useGameStore((s) => s.activeChapter);
  const slot = useGameStore((s) => s.activeTimeSlot);
  const setTimeSlot = useGameStore((s) => s.setTimeSlot);

  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="whitespace-nowrap shrink-0 text-lg font-bold tracking-tight">Ngày {day}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="whitespace-nowrap shrink-0 rounded-full bg-[#efe8dd] px-3 py-1 text-xs font-semibold">
            {chapterLabel(chapter)}
          </span>
          <HudControls />
        </div>
      </div>

      {/* TimeSlot selector — compact dev/testing tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-[#f4efe6] p-1" role="tablist" aria-label="Giai đoạn trong ngày">
        {TIME_SLOTS.map((t) => {
          const meta = formatTimeSlotLabel(t);
          const active = t === slot;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => setTimeSlot(t)}
              title={meta.label}
              className={cn(
                'flex-1 rounded-lg px-1.5 py-1 text-[11px] font-medium transition-colors',
                active
                  ? 'bg-[#4a3f35] text-[#fdfbf7]'
                  : 'text-[#4a3f35]/70 hover:text-[#4a3f35]',
              )}
            >
              {meta.icon}
            </button>
          );
        })}
      </div>
    </header>
  );
}

function chapterLabel(id: string) {
  switch (id) {
    case 'CH1_DATING':
      return 'CH1 · Mới yêu';
    case 'CH2_COHABITATION':
      return 'CH2 · Đồng sống';
    case 'CH3_FUTURE':
      return 'CH3 · Tương lai';
    default:
      return id;
  }
}
