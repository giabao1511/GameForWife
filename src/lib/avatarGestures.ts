/**
 * Pure gesture classification for avatar pointer samples.
 * Each PointerSample is either a tap (no end coords) or a completed drag
 * (endX/endY/endT present). detectGestures returns the gestures fired by
 * the full sample list, in order.
 */
export type PointerSample = {
  x: number;
  y: number;
  t: number;
  endX?: number;
  endY?: number;
  endT?: number;
};

export type GestureEvent =
  | { type: 'poke'; x: number; y: number; t: number }
  | { type: 'dizzy'; t: number }
  | { type: 'headpat'; x: number; y: number; t: number };

export const GESTURE = {
  TAP_WINDOW_MS: 1200,
  SPAM_TAPS: 4,
  PAT_MIN_DIST_PX: 40,
  PAT_MAX_MS: 600,
} as const;

/** A sample qualifies as a headpat: has end coords, horizontally dominant,
 *  far enough and fast enough. Vertical-dominant drags are inert (no event). */
function isSwipe(s: PointerSample): boolean {
  if (s.endX === undefined || s.endY === undefined || s.endT === undefined) return false;
  const dx = Math.abs(s.endX - s.x);
  const dy = Math.abs(s.endY - s.y);
  if (dy > dx) return false;
  return dx > GESTURE.PAT_MIN_DIST_PX && s.endT - s.t <= GESTURE.PAT_MAX_MS;
}

export function detectGestures(samples: PointerSample[]): GestureEvent[] {
  const out: GestureEvent[] = [];
  let burstStart = -1; // t of the first tap in the current rapid run
  let burstCount = 0;
  let burstStartLen = 0; // out.length when the current burst began
  let lastTapEnd = -Infinity;

  const resetBurst = () => {
    burstStart = -1;
    burstCount = 0;
  };

  for (const s of samples) {
    if (isSwipe(s)) {
      out.push({ type: 'headpat', x: s.x, y: s.y, t: s.t });
      resetBurst();
      continue;
    }
    if (s.endX !== undefined) {
      // A drag that did NOT qualify as a headpat: vertical-dominant drags
      // are completely inert; short/slow horizontal drags read as a tap.
      if (Math.abs(s.endY! - s.y) > Math.abs(s.endX! - s.x)) {
        resetBurst();
        continue;
      }
      out.push({ type: 'poke', x: s.x, y: s.y, t: s.t });
      resetBurst();
      lastTapEnd = s.t;
      continue;
    }
    // Plain tap.
    if (burstStart < 0 || s.t - lastTapEnd > GESTURE.TAP_WINDOW_MS) {
      burstStart = s.t;
      burstCount = 1;
      burstStartLen = out.length;
      out.push({ type: 'poke', x: s.x, y: s.y, t: s.t });
      lastTapEnd = s.t;
      continue;
    }
    burstCount += 1;
    lastTapEnd = s.t;
    if (burstCount >= GESTURE.SPAM_TAPS) {
      // 4th rapid tap: swallow the whole burst's pokes, emit one dizzy.
      out.splice(burstStartLen, out.length - burstStartLen);
      out.push({ type: 'dizzy', t: s.t });
      resetBurst();
    } else {
      out.push({ type: 'poke', x: s.x, y: s.y, t: s.t });
    }
  }
  return out;
}
