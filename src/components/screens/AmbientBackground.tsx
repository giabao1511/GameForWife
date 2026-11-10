'use client';

import { motion } from 'framer-motion';

/**
 * Soft pastel ambient background shared by the Title / How-to-Play / About
 * screens: a warm gradient wash with a few slow-drifting hearts + sparkles.
 * Purely decorative — pointer-events are disabled so it never blocks taps.
 */
const FLOATERS = [
  { x: '16%', y: '20%', emoji: '💖', size: 18, dur: 4.2, delay: 0 },
  { x: '78%', y: '14%', emoji: '✨', size: 14, dur: 3.4, delay: 0.6 },
  { x: '84%', y: '62%', emoji: '💕', size: 16, dur: 4.8, delay: 0.3 },
  { x: '12%', y: '70%', emoji: '✨', size: 12, dur: 3.8, delay: 1.1 },
  { x: '64%', y: '82%', emoji: '💗', size: 15, dur: 4.4, delay: 0.8 },
  { x: '40%', y: '8%', emoji: '✨', size: 11, dur: 3.2, delay: 1.4 },
];

export default function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, #fff4f6 0%, #fdeff1 40%, #f3ecff 100%)',
      }}
    >
      {FLOATERS.map((f, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{ left: f.x, top: f.y, fontSize: f.size, opacity: 0.5 }}
          animate={{ y: [0, -14, 0], rotate: [0, 8, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{
            duration: f.dur,
            delay: f.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {f.emoji}
        </motion.span>
      ))}
    </div>
  );
}
