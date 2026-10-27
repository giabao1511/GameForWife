'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import type { GameStats } from '@/data/types';

/**
 * Stat-driven expression. Priority:
 * 1. Critical danger — any stat < 15 → pleading puppy eyes (shocked).
 * 2. Low energy — Pin < 25 → sleepy droopy eyes + floating "zzz".
 * 3. Low money — Ví tiền < 20 → dizzy sweat.
 * 4. High affection — Cưng chiều > 75 → heart eyes + blushed cheeks.
 * 5. Normal → cheerful.
 */
type AvatarState = 'puppy' | 'sleepy' | 'broke' | 'love' | 'happy';

function avatarState(stats: GameStats): AvatarState {
  const { energy, affection, wallet } = stats;
  if (energy < 15 || affection < 15 || wallet < 15 || stats.sanity < 15) return 'puppy';
  if (energy < 25) return 'sleepy';
  if (wallet < 20) return 'broke';
  if (affection > 75) return 'love';
  return 'happy';
}

/**
 * SVG chibi boyfriend reacting to the stat line. 96px, sits in the card
 * header beside the situation text.
 */
export default function AvatarReaction({ className = '' }: { className?: string }) {
  const stats = useGameStore((s) => s.stats);
  const state = avatarState(stats);

  return (
    <motion.svg
      width={96}
      height={96}
      viewBox="0 0 96 96"
      className={className}
      aria-label={`Bạn trai đang ${state}`}
      role="img"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
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
      </g>

      {/* eyes & mouth by state */}
      {state === 'puppy' && (
        <>
          {/* big glistening pleading eyes */}
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
          {/* droopy sleeping eyes */}
          <path d="M34 44 Q38 48 42 44" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M54 44 Q58 48 62 44" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <ellipse cx={38} cy={50} rx={5} ry={2.5} fill="#b98ea4" opacity={0.4} />
          <ellipse cx={58} cy={50} rx={5} ry={2.5} fill="#b98ea4" opacity={0.4} />
          <path d="M45 56 q3 -2 6 0" stroke="#3b2f28" strokeWidth={2} fill="none" strokeLinecap="round" />
          {/* floating zzz badge */}
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
          {/* dizzy sweat drops */}
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
          {/* heart eyes */}
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
    </motion.svg>
  );
}
