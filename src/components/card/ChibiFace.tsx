'use client';

/**
 * Tiny hand-drawn-feel chibi head, parameterized by emotional state.
 * Reused by the avatar in-card (via AvatarReaction) and by the Death Gallery.
 *
 * States:
 * - exhausted / stressed / pouting / broke: death-gallery line (kept stable)
 * - sleepy: low Pin — droopy eyes + a floating 'z'
 * - love:   high Cưng chiều — heart eyes + blushed cheeks
 * - puppy:  critical danger — big glistening pleading eyes
 * - happy:  default cheerful
 */
export type ChibiState = 'exhausted' | 'stressed' | 'pouting' | 'broke' | 'sleepy' | 'love' | 'puppy' | 'happy';

export default function ChibiFace({ state, size = 64 }: { state: ChibiState; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden role="img" className="shrink-0">
      <g stroke="#3b2f28" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* head */}
        <circle cx={48} cy={48} r={26} fill="#f3d9c0" />
        {/* hair scribble */}
        <path d="M25 46 Q23 20 48 18 Q73 20 71 46 Q69 32 58 30 Q52 26 44 29 Q34 32 25 46 Z" fill="#3b2f28" stroke="none" />
      </g>
      {state === 'exhausted' && (
        <g>
          <path d="M34 48 Q38 51 42 48" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M54 48 Q58 51 62 48" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <ellipse cx={38} cy={54} rx={5} ry={2.5} fill="#b98ea4" opacity={0.5} />
          <ellipse cx={58} cy={54} rx={5} ry={2.5} fill="#b98ea4" opacity={0.5} />
          <path d="M45 60 Q48 58 51 60" stroke="#3b2f28" strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      )}
      {state === 'stressed' && (
        <g>
          <path d="M33 46 q5 -6 10 0 q-5 4 -10 0" stroke="#3b2f28" strokeWidth={2} fill="none" />
          <path d="M53 46 q5 -6 10 0 q-5 4 -10 0" stroke="#3b2f28" strokeWidth={2} fill="none" />
          <circle cx={72} cy={36} r={3} fill="#8fd0f0" opacity={0.9} />
          <circle cx={25} cy={44} r={2.2} fill="#8fd0f0" opacity={0.9} />
          <ellipse cx={48} cy={60} rx={4} ry={5} fill="#3b2f28" opacity={0.75} />
        </g>
      )}
      {state === 'pouting' && (
        <g>
          <path d="M34 48 q4 2 8 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M54 48 q4 2 8 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M43 60 q5 -4 10 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <circle cx={48} cy={52} r={30} fill="#7ea8d8" opacity={0.15} />
        </g>
      )}
      {state === 'broke' && (
        <g>
          <path d="M31 46 q6 -5 12 0 q-6 5 -12 0 Z" fill="#3b2f28" />
          <path d="M53 46 q6 -5 12 0 q-6 5 -12 0 Z" fill="#3b2f28" />
          <path d="M42 62 q6 -4 12 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M68 50 q4 8 -1 12" stroke="#8fd0f0" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.9} />
        </g>
      )}
      {state === 'sleepy' && (
        <g>
          {/* droopy half-lids over sleeping eyes */}
          <path d="M32 48 Q37 52 42 48" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M54 48 Q59 52 64 48" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M44 59 q4 -3 8 0" stroke="#3b2f28" strokeWidth={2} fill="none" strokeLinecap="round" />
          <ellipse cx={38} cy={53} rx={5} ry={2.5} fill="#b98ea4" opacity={0.4} />
          <ellipse cx={58} cy={53} rx={5} ry={2.5} fill="#b98ea4" opacity={0.4} />
          {/* floating 'z z z' */}
          <g fill="none" stroke="#7ea8d8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M68 22 h5 l-5 5 h5">
              <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2.4s" repeatCount="indefinite" />
            </path>
            <path d="M76 28 h4 l-4 4 h4" opacity={0.7}>
              <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2.4s" begin="0.4s" repeatCount="indefinite" />
            </path>
            <path d="M83 34 h3 l-3 3 h3" opacity={0.5}>
              <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
            </path>
          </g>
        </g>
      )}
      {state === 'love' && (
        <g>
          {/* heart eyes */}
          <path d="M38 42 c-2.5 -4 -7.5 -1.5 -7 2.5 c0.4 3 4.5 5.5 7 7.5 c2.5 -2 6.6 -4.5 7 -7.5 c0.5 -4 -4.5 -6.5 -7 -2.5 Z" fill="#e5484d" />
          <path d="M58 42 c-2.5 -4 -7.5 -1.5 -7 2.5 c0.4 3 4.5 5.5 7 7.5 c2.5 -2 6.6 -4.5 7 -7.5 c0.5 -4 -4.5 -6.5 -7 -2.5 Z" fill="#e5484d" />
          <path d="M41 59 q7 6 14 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {/* blushed cheeks */}
          <ellipse cx={33} cy={54} rx={5} ry={3} fill="#f6a5b8" opacity={0.55} />
          <ellipse cx={63} cy={54} rx={5} ry={3} fill="#f6a5b8" opacity={0.55} />
        </g>
      )}
      {state === 'puppy' && (
        <g>
          {/* big glistening pleading eyes */}
          <circle cx={38} cy={48} r={6} fill="#3b2f28" />
          <circle cx={58} cy={48} r={6} fill="#3b2f28" />
          <circle cx={36} cy={46} r={2.2} fill="#fff" />
          <circle cx={56} cy={46} r={2.2} fill="#fff" />
          <circle cx={40} cy={51} r={1} fill="#fff" opacity={0.9} />
          <circle cx={60} cy={51} r={1} fill="#fff" opacity={0.9} />
          {/* wobbly worried mouth + tear */}
          <path d="M43 60 q5 -4 10 0" stroke="#3b2f28" strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d="M68 50 q3 7 -1 11" stroke="#8fd0f0" strokeWidth={2.5} fill="none" strokeLinecap="round">
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.6s" repeatCount="indefinite" />
          </path>
        </g>
      )}
      {state === 'happy' && (
        <g>
          <circle cx={38} cy={46} r={3.5} fill="#3b2f28" />
          <circle cx={58} cy={46} r={3.5} fill="#3b2f28" />
          <path d="M40 56 q8 7 16 0" stroke="#3b2f28" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
