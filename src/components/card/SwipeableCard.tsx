'use client';

import { useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { playSwipeWhoosh, playVoiceSwipeUp } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import type { GameCard } from '@/data/types';
import AvatarReaction from './AvatarReaction';

const H_DRAG_THRESHOLD = 100;
const V_DRAG_THRESHOLD = 100;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const MOOD: Record<GameCard['avatarMood'], { emoji: string; label: string }> = {
  neutral: { emoji: '😐', label: 'Thản nhiên' },
  tired: { emoji: '😪', label: 'Mệt xỉu' },
  stressed: { emoji: '😰', label: 'Stress' },
  happy: { emoji: '😄', label: 'Vui vẻ' },
  flirty: { emoji: '😏', label: 'Săn đón' },
};

/**
 * 3-way draggable card — Left swipe = leftChoice, Right swipe = rightChoice,
 * Up swipe = "Bỏ mặc / Kệ anh" (weighted RNG roll in the store).
 * Live-updates the HUD preview while dragging: concrete dots for L/R, a
 * pulsating "?" for UP.
 */
export default function SwipeableCard({ card }: { card: GameCard }) {
  const applyChoice = useGameStore((s) => s.applyChoice);
  const setPreviewModifiers = useGameStore((s) => s.setPreviewModifiers);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, (v) => v * 0.08);

  // Stamp opacity tracks the drag in real time. Each axis ramps 0→1 across
  // [20px, 100px]; when the vertical drag dominates (|y| > |x|) the Up stamp
  // takes over and the horizontal stamps fade out so the player sees exactly
  // one decision at a time.
  const leftBadgeOpacity = useTransform([x, y], (vals: number[]) => {
    const [xv, yv] = vals;
    if (yv < -20 && Math.abs(yv) > Math.abs(xv)) return 0;
    return clamp01((-xv - 20) / 80);
  });
  const rightBadgeOpacity = useTransform([x, y], (vals: number[]) => {
    const [xv, yv] = vals;
    if (yv < -20 && Math.abs(yv) > Math.abs(xv)) return 0;
    return clamp01((xv - 20) / 80);
  });
  const upBadgeOpacity = useTransform([x, y], (vals: number[]) => {
    const [xv, yv] = vals;
    if (!(yv < -20 && Math.abs(yv) > Math.abs(xv))) return 0;
    return clamp01((-yv - 20) / 80);
  });

  // Live preview: dominant axis decides — vertical beats horizontal when it
  // wins the magnitude fight. A 12ms haptic tick fires the instant the drag
  // crosses into a decision zone (not on every frame while inside it).
  const thresholdRef = useRef<'none' | 'up' | 'right' | 'left'>('none');
  function updatePreview() {
    const xv = x.get();
    const yv = y.get();
    let active: 'none' | 'up' | 'right' | 'left' = 'none';
    if (yv <= -V_DRAG_THRESHOLD && Math.abs(yv) > Math.abs(xv)) {
      setPreviewModifiers(null, true);
      active = 'up';
    } else if (xv >= H_DRAG_THRESHOLD) {
      setPreviewModifiers(card.rightChoice.modifiers, false);
      active = 'right';
    } else if (xv <= -H_DRAG_THRESHOLD) {
      setPreviewModifiers(card.leftChoice.modifiers, false);
      active = 'left';
    } else {
      setPreviewModifiers(null, false);
    }
    if (active !== 'none' && active !== thresholdRef.current) haptic.thresholdTick();
    thresholdRef.current = active;
  }
  useMotionValueEvent(x, 'change', updatePreview);
  useMotionValueEvent(y, 'change', updatePreview);

  function handleDragEnd() {
    const xv = x.get();
    const yv = y.get();
    setPreviewModifiers(null, false);
    if (yv <= -V_DRAG_THRESHOLD && Math.abs(yv) > Math.abs(xv)) {
      playSwipeWhoosh();
      // Playful "Kệ anh" reaction — the voice clip lands under the whoosh and
      // gracefully falls back to the synthesized pop when the file is absent.
      playVoiceSwipeUp();
      applyChoice('UP');
    } else if (xv >= H_DRAG_THRESHOLD) {
      playSwipeWhoosh();
      applyChoice('RIGHT');
    } else if (xv <= -H_DRAG_THRESHOLD) {
      playSwipeWhoosh();
      applyChoice('LEFT');
    }
  }

  const mood = MOOD[card.avatarMood];

  return (
    <AnimatePresence>
      <motion.div
        key={card.id}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.div
          drag={true}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.7}
          style={{ x, y, rotate }}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.03 }}
          className="relative min-h-[460px] w-full cursor-grab touch-none select-none sm:min-h-[460px] active:cursor-grabbing"
          aria-label={card.situation}
        >
          <div className="flex h-full flex-col rounded-3xl border border-[#e8dfd5] bg-white p-6 shadow-md">
            {/* Avatar: prominent, centered near the top */}
            <div className="mb-4 flex flex-col items-center gap-2">
              <AvatarReaction className="shrink-0" />
              <span className="rounded-full bg-[#f4efe6] px-3 py-1 text-xs font-semibold text-[#4a3f35]">
                {mood.emoji} {mood.label}
              </span>
            </div>

            {/* Situation: clear, readable, centered in the card body */}
            <p className="flex-1 py-4 text-center text-xl font-semibold leading-relaxed text-[#4a3f35]">
              {card.situation}
            </p>
          </div>

          {/* Drag stamps — the player always sees which decision they're making.
              Left stamp top-right, right stamp top-left, Up stamp top-center. */}
          <motion.span
            style={{ opacity: leftBadgeOpacity, rotate: -6 }}
            className="pointer-events-none absolute top-5 right-4 z-20 max-w-[75%] rounded-2xl border-2 border-[#30a46c] bg-[#30a46c]/90 px-4 py-2.5 text-base font-black leading-snug text-white shadow-xl backdrop-blur-sm"
          >
            ← {card.leftChoice.text}
          </motion.span>
          <motion.span
            style={{ opacity: rightBadgeOpacity, rotate: 6 }}
            className="pointer-events-none absolute top-5 left-4 z-20 max-w-[75%] rounded-2xl border-2 border-[#e5484d] bg-[#e5484d]/90 px-4 py-2.5 text-base font-black leading-snug text-white shadow-xl backdrop-blur-sm"
          >
            {card.rightChoice.text} →
          </motion.span>
          <motion.span
            style={{ opacity: upBadgeOpacity }}
            className="pointer-events-none absolute top-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-2xl border-2 border-[#4a3f35] bg-[#4a3f35]/90 px-4 py-2.5 text-base font-black tracking-wide text-white shadow-xl backdrop-blur-sm"
          >
            🤷 Kệ anh / Tự quyết
          </motion.span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
