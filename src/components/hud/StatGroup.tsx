'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { playStatTingle } from '@/lib/audio';
import type { StatKey } from '@/data/types';
import { cn } from '@/lib/cn';

const STAT_DEFS: Array<{ key: StatKey; label: string; icon: string }> = [
  { key: 'energy', label: 'Pin', icon: '🔋' },
  { key: 'affection', label: 'Cưng chiều', icon: '❤️' },
  { key: 'sanity', label: 'Tỉnh táo', icon: '🧠' },
  { key: 'wallet', label: 'Ví tiền', icon: '💸' },
];

function barColor(value: number) {
  if (value < 25) return '#e5484d';
  if (value <= 50) return '#f5a623';
  return '#30a46c';
}

export default function StatGroup() {
  const stats = useGameStore((s) => s.stats);
  const preview = useGameStore((s) => s.previewModifiers);
  const previewUnknown = useGameStore((s) => s.previewUnknown);
  const lastStatDelta = useGameStore((s) => s.lastStatDelta);

  const lastDeltaRef = useRef<number | null>(null);
  useEffect(() => {
    if (lastStatDelta == null) return;
    if (lastStatDelta === lastDeltaRef.current) return;
    lastDeltaRef.current = lastStatDelta;
    playStatTingle(lastStatDelta > 0);
  }, [lastStatDelta]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-[#f4efe6] p-4">
      {STAT_DEFS.map(({ key, label, icon }) => {
        const value = stats[key];
        const previewDelta = preview?.[key];
        const showDot = previewDelta != null && previewDelta !== 0;
        const positive = (previewDelta ?? 0) > 0;
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>
                {icon} {label}
              </span>
              {/* Pulsating preview dot */}
              <div className="flex h-4 items-center gap-1.5">
                <AnimatePresence>
                  {showDot ? (
                    <motion.span
                      key={positive ? 'up' : 'down'}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className={cn(
                        'inline-block h-2.5 w-2.5 rounded-full',
                        positive ? 'animate-pulse bg-[#30a46c]' : 'animate-pulse bg-[#e5484d]',
                      )}
                      aria-hidden
                    />
                  ) : previewUnknown ? (
                    <motion.span
                      key="unknown"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="inline-block h-4 w-4 animate-pulse text-center text-sm leading-4 font-bold text-[#f5a623]"
                      aria-label="Kết quả bất định"
                    >
                      ?
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                <span>{value}</span>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#e3d9c9]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor(value) }}
                animate={{ width: `${value}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
