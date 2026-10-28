'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useActivePeriod } from '@/lib/timeContext';
import { playPokeTing, playDizzyWobble, playHeadPatChime } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { detectGestures, GESTURE, type PointerSample } from '@/lib/avatarGestures';
import { cn } from '@/lib/cn';
import type { GameStats } from '@/data/types';

/**
 * Stat-driven expression, with a real-time ambience layer. Priority:
 * 1. Critical danger — any stat < 15 → pleading puppy eyes (shocked).
 * 2. Latenight ambience — the real period is latenight → sleepy droopy eyes.
 * 3. Low energy — Pin < 25 → sleepy droopy eyes + floating "zzz".
 * 4. Low money — Ví tiền < 20 → dizzy sweat.
 * 5. High affection — Cưng chiều > 75 → heart eyes + blushed cheeks.
 * 6. Normal → cheerful.
 *
 * On top of the base state, pointer gestures on the head trigger a brief
 * reaction overlay: poke (blush + bounce), spam-dizzy (spiral eyes + star
 * halo, 2.5s) and head-pat (delight eyes + floating hearts, +1 reward via
 * the store at most once per in-game day).
 */
type AvatarState = 'puppy' | 'sleepy' | 'broke' | 'love' | 'happy';
type Reaction = 'poke' | 'dizzy' | 'pet' | null;

function avatarState(stats: GameStats, period: string): AvatarState {
  const { energy, affection, wallet } = stats;
  if (energy < 15 || affection < 15 || wallet < 15 || stats.sanity < 15) return 'puppy';
  if (period === 'latenight') return 'sleepy';
  if (energy < 25) return 'sleepy';
  if (wallet < 20) return 'broke';
  if (affection > 75) return 'love';
  return 'happy';
}

const POKE_MS = 600;
const DIZZY_MS = 2500;
const PET_MS = 1200;
/** SVG hair zone: the upper half of the 96-unit viewBox (head top ≈ y 16–48). */
const HAIR_ZONE_Y = 48;

export default function AvatarReaction({ className = '' }: { className?: string }) {
  const stats = useGameStore((s) => s.stats);
  // Render-safe: deterministic first paint, then tracks the real clock; a
  // dev override repaints it immediately.
  const period = useActivePeriod();
  const state = avatarState(stats, period);

  const [reaction, setReaction] = useState<Reaction>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-gesture history feeding the pure gesture engine.
  const samplesRef = useRef<PointerSample[]>([]);
  const lastFiredRef = useRef(-1);
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const targetRef = useRef<SVGSVGElement | null>(null);

  useEffect(
    () => () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    },
    [],
  );

  function setReactionFor(next: Exclude<Reaction, null>, ms: number) {
    setReaction(next);
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(null), ms);
  }

  function svgUnitY(clientY: number): number {
    // Map client px → viewBox units (scale 1 fallback where getBoundingClientRect
    // reports zero, e.g. jsdom tests).
    const svg = targetRef.current;
    const rect = svg?.getBoundingClientRect();
    const scale = rect && rect.height > 0 ? 96 / rect.height : 1;
    return (clientY - (rect?.top ?? 0)) * scale;
  }

  /**
   * Capture-phase handlers: stopping propagation HERE (before the Framer
   * Motion drag element and React's root delegation both see the event) is
   * what keeps taps/pats from triggering the card's swipe gesture.
   */
  function handlePointerDownCapture(e: React.PointerEvent<SVGSVGElement>) {
    e.stopPropagation();
    downRef.current = { x: e.clientX, y: svgUnitY(e.clientY), t: performance.now() };
  }

  function handlePointerUpCapture(e: React.PointerEvent<SVGSVGElement>) {
    e.stopPropagation();
    const down = downRef.current;
    downRef.current = null;
    if (!down) return;

    const svgY = svgUnitY(e.clientY);
    const dx = e.clientX - down.x; // client px delta (scale ≈ 1 on the 96px avatar)
    const dt = performance.now() - down.t;
    const inHairZone = down.y < HAIR_ZONE_Y;

    // A fast horizontal swipe that STARTS on the hair is a head-pat; face-zone
    // swipes stay plain pokes (a cheek flick is a poke, not a pat). Vertical
    // swipes count as nothing here.
    const isSwipe =
      inHairZone &&
      Math.abs(dx) > GESTURE.PAT_MIN_DIST_PX &&
      Math.abs(svgY - down.y) <= Math.abs(dx) &&
      dt <= GESTURE.PAT_MAX_MS;

    samplesRef.current = [
      ...samplesRef.current.slice(-7),
      isSwipe
        ? { x: 0, y: down.y, t: down.t, endX: down.x + dx, endY: svgY, endT: down.t + dt }
        : { x: 0, y: down.y, t: down.t },
    ];

    const events = detectGestures(samplesRef.current);
    const last = events[events.length - 1];
    if (!last || last.t !== down.t || last.t === lastFiredRef.current) return;
    lastFiredRef.current = last.t;

    if (last.type === 'poke') {
      playPokeTing();
      haptic.thresholdTick();
      setReactionFor('poke', POKE_MS);
    } else if (last.type === 'dizzy') {
      playDizzyWobble();
      haptic.thresholdTick();
      setTimeout(() => haptic.thresholdTick(), 40);
      setReactionFor('dizzy', DIZZY_MS);
    } else {
      playHeadPatChime();
      haptic.pop();
      // Reward (if off cooldown) lands through the store → card bubble.
      useGameStore.getState().petAvatar();
      setReactionFor('pet', PET_MS);
    }
  }

  const dizzy = reaction === 'dizzy';
  const pet = reaction === 'pet';
  const poked = reaction === 'poke';

  return (
    <div className={cn('relative', className)} data-interactive-avatar>
      <motion.svg
        ref={(el) => {
          targetRef.current = el;
        }}
        width={96}
        height={96}
        viewBox="0 0 96 96"
        style={{ overflow: 'visible', touchAction: 'none' }}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerUpCapture={handlePointerUpCapture}
        aria-label={`Bạn trai đang ${state}${reaction ? ` (${reaction})` : ''}`}
        role="img"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: poked ? [1, 1.15, 0.95, 1] : 1,
          rotate: dizzy ? [-6, 6, -6] : 0,
          scaleX: pet ? 1.05 : 1,
          scaleY: pet ? 0.95 : 1,
        }}
        transition={
          poked
            ? { scale: { duration: 0.4, ease: 'easeOut' } }
            : dizzy
              ? { rotate: { duration: 0.6, repeat: 4 } }
              : { type: 'spring', stiffness: 200, damping: 18 }
        }
      >
        {/* back / body */}
        <g>
          <path d="M24 88 Q24 70 48 70 Q72 70 72 88 Z" fill="#4a3f35" />
          <path d="M28 84 Q28 72 48 72 Q68 72 68 84 Z" fill="#8c7b66" />
          {/* head */}
          <circle cx={48} cy={44} r={24} fill="#f3d9c0" />
          {/* hair */}
          <path
            d="M24 44 Q22 18 48 16 Q74 18 72 44 Q70 30 58 28 Q52 24 44 27 Q34 30 24 44 Z"
            fill="#3b2f28"
          />
          {state === 'puppy' && <circle cx={48} cy={48} r={30} fill="#e5484d" opacity={0.1} />}
          {state === 'love' && <circle cx={48} cy={48} r={30} fill="#f6a5b8" opacity={0.25} />}
          {/* poke: bright blushing cheeks */}
          {poked && (
            <>
              <ellipse cx={33} cy={50} rx={6} ry={3.4} fill="#f472b6" opacity={0.8} />
              <ellipse cx={63} cy={50} rx={6} ry={3.4} fill="#f472b6" opacity={0.8} />
            </>
          )}
        </g>

        {/* Reaction eyes override the state's eyes while a reaction is live */}
        {dizzy ? (
          <>
            {/* spiral "@_@" dizzy eyes */}
            <g fill="#3b2f28" fontFamily="sans-serif" fontSize={15} textAnchor="middle">
              <text x={38} y={50}>
                @
              </text>
              <text x={58} y={50}>
                @
              </text>
            </g>
            <path d="M45 58 q3 3 6 0" stroke="#3b2f28" strokeWidth={2} fill="none" strokeLinecap="round" />
            {/* rotating star halo overhead */}
            <g data-dizzy-halo>
              {[30, 48, 66].map((cx, i) => (
                <g key={cx} transform={`translate(${cx} ${i === 1 ? 4 : 10})`}>
                  <path
                    d="M0 -5 L1.4 -1.4 L5 -1 L2.2 1.6 L3 5 L0 3 L-3 5 L-2.2 1.6 L-5 -1 L-1.4 -1.4 Z"
                    fill="#f5a623"
                    opacity={0.9}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur={`${1.2 + i * 0.25}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              ))}
            </g>
          </>
        ) : pet ? (
          <>
            {/* closed delight eyes ^‿^ */}
            <path d="M33 44 Q38 39 43 44" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <path d="M53 44 Q58 39 63 44" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <path d="M40 54 q8 8 16 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <ellipse cx={33} cy={50} rx={5} ry={3} fill="#f6a5b8" opacity={0.6} />
            <ellipse cx={63} cy={50} rx={5} ry={3} fill="#f6a5b8" opacity={0.6} />
          </>
        ) : (
          <>
            {state === 'puppy' && (
              <>
                <circle cx={38} cy={44} r={6} fill="#3b2f28" />
                <circle cx={58} cy={44} r={6} fill="#3b2f28" />
                <circle cx={36} cy={42} r={2.4} fill="#fff" />
                <circle cx={56} cy={42} r={2.4} fill="#fff" />
                <circle cx={40} cy={47} r={1.1} fill="#fff" opacity={0.9} />
                <circle cx={60} cy={47} r={1.1} fill="#fff" opacity={0.9} />
                <path d="M43 57 q5 -4 10 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                <path d="M68 42 q3 7 -1 11" stroke="#8fd0f0" strokeWidth={2.5} fill="none" strokeLinecap="round">
                  <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.4s" repeatCount="indefinite" />
                </path>
              </>
            )}
            {state === 'sleepy' && (
              <>
                <path d="M34 44 Q38 48 42 44" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                <path d="M54 44 Q58 48 62 44" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                <ellipse cx={38} cy={50} rx={5} ry={2.5} fill="#b98ea4" opacity={0.4} />
                <ellipse cx={58} cy={50} rx={5} ry={2.5} fill="#b98ea4" opacity={0.4} />
                <path d="M45 56 q3 -2 6 0" stroke="#3b2f28" strokeWidth={2} fill="none" strokeLinecap="round" />
                <g fill="none" stroke="#7ea8d8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M70 16 h5 l-5 5 h5">
                    <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2.4s" repeatCount="indefinite" />
                  </path>
                  <path d="M78 23 h4 l-4 4 h4">
                    <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2.4s" begin="0.4s" repeatCount="indefinite" />
                  </path>
                  <path d="M84 29 h3 l-3 3 h3">
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
                  </path>
                </g>
              </>
            )}
            {state === 'broke' && (
              <>
                <path d="M32 42 q6 -5 12 0 q-6 5 -12 0 Z" fill="#3b2f28" />
                <path d="M52 42 q6 -5 12 0 q-6 5 -12 0 Z" fill="#3b2f28" />
                <path d="M42 58 q6 -4 12 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                <path d="M66 46 q4 8 -1 12" stroke="#8fd0f0" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.9}>
                  <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.4s" repeatCount="indefinite" />
                </path>
                <path d="M24 30 q4 8 -1 12" stroke="#8fd0f0" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.7}>
                  <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.8s" begin="0.3s" repeatCount="indefinite" />
                </path>
              </>
            )}
            {state === 'love' && (
              <>
                <path d="M38 38 c-2.5 -4 -7.5 -1.5 -7 2.5 c0.4 3 4.5 5.5 7 7.5 c2.5 -2 6.6 -4.5 7 -7.5 c0.5 -4 -4.5 -6.5 -7 -2.5 Z" fill="#e5484d" />
                <path d="M58 38 c-2.5 -4 -7.5 -1.5 -7 2.5 c0.4 3 4.5 5.5 7 7.5 c2.5 -2 6.6 -4.5 7 -7.5 c0.5 -4 -4.5 -6.5 -7 -2.5 Z" fill="#e5484d" />
                <path d="M40 55 q8 7 16 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                <ellipse cx={33} cy={50} rx={5} ry={3} fill="#f6a5b8" opacity={0.55} />
                <ellipse cx={63} cy={50} rx={5} ry={3} fill="#f6a5b8" opacity={0.55} />
              </>
            )}
            {state === 'happy' && (
              <>
                <circle cx={38} cy={42} r={3.5} fill="#3b2f28" />
                <circle cx={58} cy={42} r={3.5} fill="#3b2f28" />
                <path d="M40 52 q8 7 16 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                <path d="M74 22 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z" fill="#f5a623">
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
                </path>
                <path d="M20 58 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5 Z" fill="#f5a623" opacity={0.7}>
                  <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite" />
                </path>
              </>
            )}
          </>
        )}
      </motion.svg>

      {/* Floating hearts: 3 pink mini-hearts rise + fade during a head-pat. */}
      {pet &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            data-pet-heart
            initial={{ x: -18 + i * 18, y: 6, opacity: 1, scale: 0.7 }}
            animate={{ x: -22 + i * 22, y: -44, opacity: 0, scale: 1.4 }}
            transition={{ duration: 1.1, delay: i * 0.08, ease: 'easeOut' }}
            className="pointer-events-none absolute left-1/2 top-1 z-10 text-lg"
            aria-hidden
          >
            💕
          </motion.span>
        ))}
    </div>
  );
}
