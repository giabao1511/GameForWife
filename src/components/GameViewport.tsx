'use client';

import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '@/store/useUiStore';
import {
  PERIOD_THEMES,
  getActivePeriod,
} from '@/lib/timeContext';

/** Centered mobile container for the whole game, with a real-time ambient
 * layer: period gradient overlay, plus a moon badge + sleeping stars for
 * latenight. Height-aware: children control centering (the card stage uses
 * flex-1). */
export default function GameViewport({ children }: { children: ReactNode }) {
  // Subscribing to the override re-renders on dev-toggle; getActivePeriod()
  // reads it (falling back to the real clock) inside.
  useUiStore((s) => s.devPeriodOverride);
  const period = getActivePeriod();
  const theme = PERIOD_THEMES[period];

  const overlayStyle: CSSProperties = { background: theme.overlay };

  return (
    <div
      data-period={period}
      className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden bg-[#fdfbf7] p-4 text-[#4a3f35] shadow-xl select-none"
    >
      {/* Decorative ambient layer — sits under the UI, never intercepts input. */}
      <AnimatePresence>
        <motion.div
          key={period}
          data-ambience={period}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
          style={overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </AnimatePresence>

      {theme.moon && (
        <motion.span
          data-moon
          aria-hidden
          className="pointer-events-none absolute right-4 top-4 z-0 text-2xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          🌙
        </motion.span>
      )}

      {theme.stars && (
        <div data-stars aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {[
            { left: '12%', top: '8%', size: 10, dur: 2.6, begin: 0 },
            { left: '78%', top: '14%', size: 8, dur: 3.4, begin: 0.5 },
            { left: '88%', top: '38%', size: 7, dur: 2.2, begin: 1.1 },
            { left: '8%', top: '44%', size: 6, dur: 3.8, begin: 0.3 },
            { left: '84%', top: '70%', size: 9, dur: 2.8, begin: 0.9 },
            { left: '16%', top: '82%', size: 7, dur: 3.2, begin: 1.4 },
          ].map((s, i) => (
            <motion.span
              key={i}
              className="absolute select-none text-[#8f88b0]"
              style={{ left: s.left, top: s.top, fontSize: s.size }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.15, 0.9, 0.15] }}
              transition={{
                duration: s.dur,
                repeat: Infinity,
                delay: s.begin,
                ease: 'easeInOut',
              }}
            >
              ✦
            </motion.span>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
