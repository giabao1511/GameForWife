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
  const returnToTitle = useGameStore((s) => s.returnToTitle);

  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap shrink-0 text-lg font-bold tracking-tight">Ngày {day}</span>
          <button
            onClick={returnToTitle}
            className="grid h-7 w-7 place-items-center rounded-lg border border-[#e3d9c9] bg-white text-[15px] font-bold text-[#4a3f35] shadow-sm transition-transform hover:bg-[#fdfbf7] active:scale-90"
            aria-label="Về màn hình chính"
            title="🏠 Về menu chính (tiến độ được giữ)"
          >
            🏠
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="max-w-[72px] truncate rounded-full bg-[#efe8dd] px-2.5 py-1 text-xs font-semibold">
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
