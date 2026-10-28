# Interactive Avatar (Poke, Spam Tap, Head Pat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-card chibi avatar respond to pokes, spam-taps (dizzy), and head-pats (hearts + stat reward) without hijacking the card's drag-to-swipe gesture.

**Architecture:** `AvatarReaction.tsx` (the existing stat-driven SVG) becomes a pointer-interaction host: tap detection (spaced taps = poke; 4+ taps in 1.2s = dizzy for 2.5s) and a hair-zone swipe detector (horizontal >40px within 600ms = head pat). Reactions layer OVER the stat-driven base state: new `reaction` prop ('poke' | 'dizzy' | 'pet' | null) renders sparkle blush / spiral eyes + rotating star halo / closed-delight eyes + floating hearts. All avatar pointer events call `stopPropagation` so the Framer Motion card drag under it never fires. Head-pat reward (+1 Cưng chiều OR +1 Pin, 50/50 roll) is granted at most once per in-game day via a new `petAvatar()` store action; a toast "Được xoa đầu: +1 ... ❤️" reuses the existing `lastReaction` bubble in CardDeck. Audio: `playPokeTing()`, `playDizzyWobble()`, `playHeadPatChime()` in lib/audio.ts; haptics: poke = `thresholdTick`, dizzy = double tick, pet = `pop` — all existing primitives, no new haptic API.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion 14, Zustand, Vitest + Testing Library (jsdom), Tailwind v4.

**Spec:** the user's "Interactive Avatar" feature spec (pasted; 3 reaction types, gesture rules, cooldown, SFX/haptics, stopPropagation). No separate spec file — the spec text is binding.

## Global Constraints

- All avatar-zone pointer events MUST call `e.stopPropagation()` so card drag/swipe never triggers from the avatar.
- Poke: 1–2 taps within 1.2s of the previous tap → blushing cheeks + wobble + `playPokeTing()` + `haptic.thresholdTick()`. Tap bounce scale keyframes `[1, 1.15, 0.95, 1]`, cheeks `bg-rose-400/80` glow (in-SVG: bright pink blush ellipses with blur).
- Dizzy: 4+ rapid taps within 1.2s → dizzy state for 2.5s: wobble `rotate: [-6, 6, -6]`, spiral eyes (`@_@`), 3 continuously-rotating mini stars overhead. Haptic double tick + `playDizzyWobble()`.
- Head pat: horizontal swipe over the HAIR zone (upper half of the 96px SVG, i.e. y < 48 in SVG units) with |Δx| > 40px (CSS px) within 600ms → `pet` state: squash-stretch `scaleX: 1.05, scaleY: 0.95`, closed delight eyes `^‿^`, 3 floating pink hearts (💕) rising + fading, `playHeadPatChime()`, `haptic.pop()`, and a reward of +1 Cưng chiều (affection) or +1 Pin (energy) — 50/50 — at most once per in-game day (cooldown keyed on `day`). Reward toast: "Được xoa đầu: +1 Cưng chiều ❤️" / "Được xoa đầu: +1 Pin ❤️" via `lastReaction`.
- Cooldown: on a second head-pat the same day the reaction still plays (eyes/hearts/sound) but NO stat reward and NO toast.
- Dizzy/Spam detection: tap window uses 1200ms between taps; a "spam burst" = 4 or more taps whose timestamps span <= 1200ms; after the burst, the next tap resumes the poke cycle. 3 rapid taps = 3 consecutive pokes, not dizzy.
- Audio functions no-op safely in jsdom/SSR (existing `ensure()` pattern).
- Commit per task with the exact commands in Step 5 blocks. Attribution: every git commit message ends with the Co-Authored-By line the session supplies; every PR description ends with "🤖 Generated with [Claude Code](https://claude.com/claude-code)".

## Review Focus

Uncovered input classes the spec implies (each gets a pinning test in the owning task):
1. **Pat during game over / no card** — `petAvatar()` is a no-op when `isGameOver` or `isVictory` (spec: reward grants live inside a run; a dead boyfriend shouldn't be pettable for stats). → pin in Task 3.
2. **Spam burst crossing the day boundary** — 4 taps fire dizzy, then `petAvatar` is also called same second with a fresh `day`; dizzy visuals must not be cancelled by the pet reward toast overlapping. → pin in Task 5 (dizzy timer independent of reaction overrides).
3. **Fast vertical swipe on the avatar** — |Δy| dominates (swipe-down on hair): must NOT count as a head pat (spec says HORIZONTAL) and must not leak to the card (stopPropagation still applies). → pin in Task 2.
4. **Muted audio** — with `useUiStore.muted = true`, all three new SFX stay silent (master gain path), no crash. → pin in Task 1.
5. **Halo/stars layout overflow** — rotating star halo renders above the 96px viewBox; the SVG must keep `overflow: visible` or the stars clip into the mood badge below. → pin in Task 4.

---

### Task 1: Audio + Haptics primitives

**Files:**
- Modify: `src/lib/audio.ts` (append 3 SFX exports)
- Test: `src/test/avatarAudio.test.ts` (create)

**Interfaces:**
- Produces: `playPokeTing(): void`, `playDizzyWobble(): void`, `playHeadPatChime(): void` in `@/lib/audio`.
- Consumes: existing `tone()` (private) — implementations use it.

- [ ] **Step 1: Write the failing test**

`src/test/avatarAudio.test.ts`:

```ts
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { playPokeTing, playDizzyWobble, playHeadPatChime } from '@/lib/audio';
import { useUiStore } from '@/store/useUiStore';

afterEach(() => {
  cleanup();
  useUiStore.setState({ muted: false });
});

describe('avatar interaction SFX', () => {
  it('playPokeTing does not throw without an AudioContext', () => {
    expect(() => playPokeTing()).not.toThrow();
  });

  it('playDizzyWobble does not throw without an AudioContext', () => {
    expect(() => playDizzyWobble()).not.toThrow();
  });

  it('playHeadPatChime does not throw without an AudioContext', () => {
    expect(() => playHeadPatChime()).not.toThrow();
  });

  it('all three stay silent when muted (no throw, no throw-on-mute)', () => {
    useUiStore.setState({ muted: true });
    expect(() => { playPokeTing(); playDizzyWobble(); playHeadPatChime(); }).not.toThrow();
  });
});
```

(Review-focus pin #4 lives in the muted test: jsdom has no AudioContext, `ensure()` returns null, every tone call returns early — the no-throw expectation is the pin.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/avatarAudio.test.ts`
Expected: FAIL — "playPokeTing is not exported / not a function" (import error).

- [ ] **Step 3: Implement in `src/lib/audio.ts`**

Append after `playPeriodAmbience`:

```ts
// ── Avatar interaction SFX (poke / dizzy / head-pat) ──────────

/** Cute high "ting" boing on a cheek poke. */
export function playPokeTing(): void {
  tone(1320, 0, 0.08, 'sine', 0.25, 1980);
  tone(1980, 0.05, 0.09, 'sine', 0.18);
}

/** Comical descending wobble for the dizzy eyes. */
export function playDizzyWobble(): void {
  tone(660, 0, 0.18, 'triangle', 0.2, 220);
  tone(440, 0.16, 0.2, 'triangle', 0.16, 110);
}

/** Soft warm purr-chord for a head pat. */
export function playHeadPatChime(): void {
  tone(523, 0, 0.18, 'sine', 0.22, 587);
  tone(659, 0.08, 0.2, 'sine', 0.18, 784);
  tone(784, 0.16, 0.26, 'sine', 0.14, 880);
}
```

No haptics changes: poke → `haptic.thresholdTick()`, dizzy → two `haptic.thresholdTick()` calls 40ms apart, pet → `haptic.pop()` (existing).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/test/avatarAudio.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio.ts src/test/avatarAudio.test.ts
git commit -m "feat: avatar SFX (poke ting, dizzy wobble, head-pat chime)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Gesture engine hook (tap/spam/pat detection, pure + testable)

**Files:**
- Create: `src/lib/avatarGestures.ts`
- Test: `src/test/avatarGestures.test.ts`

**Interfaces:**
- Produces: `detectGestures(evts: PointerSample[]): GestureEvent[]` where `type PointerSample = { x: number; y: number; t: number; endX?: number; endY?: number }` — each sample is a pointerdown (taps) or a completed pointerup on the hair zone (swipes carry endX/endY + dx from start); `type GestureEvent = { type: 'poke'; x: number; y: number; t: number } | { type: 'dizzy'; t: number } | { type: 'headpat'; x: number; y: number; t: number }`. Plus constants `export const GESTURE = { TAP_WINDOW_MS: 1200, SPAM_TAPS: 4, PAT_MIN_DIST_PX: 40, PAT_MAX_MS: 600 }`.
- Consumes: nothing (pure logic; the React hook in Task 3 feeds it).

Algorithm (determines the body — implement exactly):
- Walk samples in time order.
- Tap = sample without `endX/endY` (or with `|dx| <= PAT_MIN_DIST_PX` AND duration <= PAT_MAX_MS → it's a tap, not a swipe).
- Keep a rolling window of tap times within `TAP_WINDOW_MS` of the newest tap. If the window length hits `SPAM_TAPS` and no dizzy has fired since the burst started → emit one `{ type: 'dizzy' }` for that burst and mark the burst consumed; suppress pokes for those 4 taps.
- Each tap that is NOT part of a consumed burst → emit `{ type: 'poke' }`.
- Swipe sample on the hair zone (`endY` start-y in upper half, `|endX - x| > PAT_MIN_DIST_PX`, duration = `(endT - t) <= PAT_MAX_MS` — vertical-dominant swipes are silently ignored, never a headpat; see Review Focus #3) → emit `{ type: 'headpat' }`.

Sample the component will pass: pointerdown gives `{x, y, t, endX, endY, endT}` after pointerup on the same target; the hook (Task 3) converts React events into `PointerSample` and calls `detectGestures` incrementally over the samples collected this "gesture session" (reset when a pointer fully leaves the avatar element).

- [ ] **Step 1: Write the failing tests**

`src/test/avatarGestures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { detectGestures, GESTURE, type PointerSample } from '@/lib/avatarGestures';

const tap = (x: number, y: number, t: number): PointerSample => ({ x, y, t });

describe('detectGestures', () => {
  it('single tap → one poke', () => {
    expect(detectGestures([tap(30, 30, 0)])).toEqual([{ type: 'poke', x: 30, y: 30, t: 0 }]);
  });

  it('two quick taps → two pokes (not dizzy)', () => {
    const out = detectGestures([tap(30, 30, 0), tap(32, 31, 300)]);
    expect(out).toHaveLength(2);
    expect(out.every((e) => e.type === 'poke')).toBe(true);
  });

  it('3 rapid taps → three pokes (dizzy needs 4)', () => {
    const out = detectGestures([tap(30, 30, 0), tap(30, 30, 300), tap(30, 30, 600)]);
    expect(out).toHaveLength(3);
    expect(out.every((e) => e.type === 'poke')).toBe(true);
  });

  it('4 rapid taps within 1.2s → one dizzy, no pokes for that burst', () => {
    const out = detectGestures([
      { x: 20, y: 20, t: 0 },
      { x: 20, y: 20, t: 300 },
      { x: 20, y: 20, t: 600 },
      { x: 20, y: 20, t: 900 },
    ]);
    expect(out).toEqual([{ type: 'dizzy', t: 900 }]);
  });

  it('a slow 4th tap (>1.2s gap) does not make a dizzy', () => {
    const out = detectGestures([tap(30, 30, 0), tap(30, 30, 1300), tap(30, 30, 1350), tap(30, 30, 1400)]);
    expect(out.filter((e) => e.type === 'dizzy')).toHaveLength(0);
    expect(out).toHaveLength(4); // all pokes
  });

  it('swipe over hair >40px within 600ms → headpat', () => {
    const out = detectGestures([{ x: 20, y: 20, t: 0, endX: 80, endY: 20, endT: 300 }]);
    expect(out).toEqual([{ type: 'headpat', x: 20, y: 20, t: 0 }]);
  });

  it('vertical-dominant swipe on hair is ignored (Review Focus #3)', () => {
    const out = detectGestures([{ x: 20, y: 20, t: 0, endX: 25, endY: 120, endT: 300 }]);
    expect(out).toEqual([]);
  });

  it('swipe slower than 600ms or shorter than 40px is a tap/poke, not a headpat', () => {
    const tooLong = detectGestures([{ x: 20, y: 20, t: 0, endX: 80, endY: 20, endT: 900 }]);
    const tooShort = detectGestures([{ x: 20, y: 20, t: 0, endX: 45, endY: 20, endT: 200 }]);
    expect(tooLong.every((e) => e.type === 'poke')).toBe(true);
    expect(tooShort.every((e) => e.type === 'poke')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/avatarGestures.test.ts`
Expected: FAIL — module `@/lib/avatarGestures` not found.

- [ ] **Step 3: Implement `src/lib/avatarGestures.ts`**

```ts
/** Pure gesture classification for avatar pointer samples (see plan Task 2). */
export type PointerSample = { x: number; y: number; t: number; endX?: number; endY?: number; endT?: number };
export type GestureEvent =
  | { type: 'poke'; x: number; y: number; t: number }
  | { type: 'dizzy'; t: number }
  | { type: 'headpat'; x: number; y: number; t: number };

export const GESTURE = { TAP_WINDOW_MS: 1200, SPAM_TAPS: 4, PAT_MIN_DIST_PX: 40, PAT_MAX_MS: 600 } as const;

export function isSwipe(sample: PointerSample): boolean { /* |dx|>40 && dt<=600 && !vertical-dominant */ }
export function detectGestures(evts: PointerSample[]): GestureEvent[] { /* per algorithm above */ }
```

Write the bodies per the algorithm. Vertical-dominant = `|endY - y| > |endX - x|` → sample is neither swipe nor tap (return no events for it) — it simply never counts as anything (the component's stopPropagation already blocks the card; a vertical drag on the hair is just... nothing).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/test/avatarGestures.test.ts`
Expected: PASS, 8/8.

- [ ] **Step 5: Commit**

```bash
git add src/lib/avatarGestures.ts src/test/avatarGestures.test.ts
git commit -m "feat: pure avatar gesture engine (poke / spam-dizzy / headpat)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Store reward + cooldown (`petAvatar`)

**Files:**
- Modify: `src/store/useGameStore.ts`
- Test: `src/test/petAvatar.test.ts` (create)

**Interfaces:**
- Produces: store action `petAvatar(): boolean` — returns true when a stat reward was actually granted. Grants +1 affection OR +1 energy (50/50 via `Math.random`) exactly when `!isGameOver && !isVictory && day !== lastPettedDay`; always records `lastPettedDay: number`. Also new state fields `lastPettedDay: number` (init -1, no persistence) and `petToast: string | null` — the component sets a dedicated toast so it doesn't fight narrative `lastReaction` (CardDeck already renders `lastReaction`; we render the pet toast from the same bubble slot — simplest: set `lastReaction` directly to the toast text and NOT a new field; RULING recorded: use `lastReaction` as the pet toast channel, no new state — saves a CardDeck change. The Interfaces block then is: `petAvatar(): string | null` returning the toast text "Được xoa đầu: +1 Cưng chiều ❤️" or "Được xoa đầu: +1 Pin ❤️" when a reward was granted, `null` on cooldown/dead-run (visuals still play).)
- Consumes: `Math.random` (mockable in tests), existing `applyModifiers` + `clamp` (stats clamp at 100 — a pat at 100 affection grants +0 effectively; that's fine and spec-consistent).

- [ ] **Step 1: Write the failing tests**

`src/test/petAvatar.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore, defaultInventory } from '@/store/useGameStore';

function reset(overrides = {}) {
  // Pin the stat line so "+1" assertions are deterministic regardless of prior tests.
  useGameStore.setState({
    stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 },
    lastPettedDay: -1,
    isGameOver: false,
    isVictory: false,
    day: 1,
    ...overrides,
  } as never);
}

beforeEach(() => {
  reset();
  vi.restoreAllMocks();
});

describe('petAvatar', () => {
  it('grants +1 affection (50/50 roll = 0.4 → Cưng chiều) and returns the VN toast', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const toast = useGameStore.getState().petAvatar();
    expect(toast).toBe('Được xoa đầu: +1 Cưng chiều ❤️');
    expect(useGameStore.getState().stats.affection).toBe(51); // was 50
    expect(useGameStore.getState().lastPettedDay).toBe(useGameStore.getState().day);
  });

  it('roll >= 0.5 → +1 Pin (energy)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const toast = useGameStore.getState().petAvatar();
    expect(toast).toBe('Được xoa đầu: +1 Pin ❤️');
    expect(useGameStore.getState().stats.energy).toBe(51);
  });

  it('second pat same day → null (no reward, no toast) — cooldown', () => {
    reset({ lastPettedDay: 3, day: 3 });
    expect(useGameStore.getState().petAvatar()).toBeNull();
  });

  it('next day resets the cooldown', () => {
    reset({ lastPettedDay: 3, day: 4 });
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(useGameStore.getState().petAvatar()).not.toBeNull();
  });

  it('game over → null (Review Focus #1)', () => {
    reset({ isGameOver: true });
    expect(useGameStore.getState().petAvatar()).toBeNull();
  });

  it('sets lastReaction to the toast so CardDeck shows it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    reset({ lastReaction: null });
    useGameStore.getState().petAvatar();
    expect(useGameStore.getState().lastReaction).toContain('Được xoa đầu');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/petAvatar.test.ts`
Expected: FAIL — "petAvatar is not a function".

- [ ] **Step 3: Implement in `src/store/useGameStore.ts`**

Add to `GameStore` interface + initial state: `lastPettedDay: number` (init `-1`), action `petAvatar: () => string | null`.

```ts
petAvatar: () => {
  const state = get();
  if (state.isGameOver || state.isVictory) return null;
  if (state.day === state.lastPettedDay) return null; // cooldown
  const toast =
    Math.random() < 0.5
      ? 'Được xoa đầu: +1 Cưng chiều ❤️'
      : 'Được xoa đầu: +1 Pin ❤️';
  const statKey: StatKey = Math.random() < 0.5 ? 'affection' : 'energy'; // roll once
  const stats = applyModifiers(state.stats, statKey === 'affection' ? { affection: 1 } : { energy: 1 });
  set({ stats, lastPettedDay: state.day, lastReaction: toast });
  return toast;
}
```

(Rule out double-`Math.random`: roll ONE value; toast text and stat key come from that same roll so the toast always matches the granted stat.)

Also add `lastPettedDay: -1` to `restartGame`'s `set(...)` so a fresh run can always head-pat on Day 1 (otherwise the previous run's day can lock the cooldown).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/test/petAvatar.test.ts`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add src/store/useGameStore.ts src/test/petAvatar.test.ts
git commit -m "feat: petAvatar store action with per-day cooldown + VN toast

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Interactive `AvatarReaction` (reactions, visuals, wiring)

**Files:**
- Modify: `src/components/card/AvatarReaction.tsx`
- Modify: `src/components/card/SwipeableCard.tsx` (wrap nothing — AvatarReaction already lives inside the drag div; add pointer handlers ON the avatar element)
- Test: `src/test/avatarReaction.test.tsx` (create)

**Interfaces:**
- Consumes: Task 2's `detectGestures`/`PointerSample`/`GESTURE`; Task 3's `useGameStore.getState().petAvatar()`; Task 1's SFX; `haptic.thresholdTick` / `haptic.pop`.
- Produces: internal-only. No new public API.

Implementation shape (write it in AvatarReaction.tsx):
- New local state: `const [reaction, setReaction] = useState<'poke' | 'dizzy' | 'pet' | null>(null)`.
- Poke: `setReaction('poke')`; auto-clear after 600ms via a keyed `useEffect` timer (store the timer id; re-poke restarts it — use a ref counter + `setTimeout` keyed on a `pokeSeq` increment).
- Dizzy: `setReaction('dizzy')` for 2500ms (spec value).
- Pet: `setReaction('pet')` for 1200ms.
- Pointer handlers on the outer `motion.svg` (change `motion.svg` → plain `<svg>` with `onPointerDown/Up` + framer `motion` wrappers are unnecessary; keep `motion.svg` only if scale animations need it — keep it, and attach `onPointerDown`/`onPointerUp`):
  - `onPointerDown(e)`: `e.stopPropagation()` (THE critical line — blocks card drag), record `{x, y, t, targetZone: e.offsetY < 48 ? 'hair' : 'face'}`.
  - `onPointerUp(e)`: `e.stopPropagation()`; build a `PointerSample` with `endX/endY/endT`; if start zone was hair, feed sample to `detectGestures([sample, ...tapHistory])` — actually simplest: keep the RAW sample history in a ref (max ~8 entries), call `detectGestures(historyRef.current)` after each up, map the LAST event: 'poke' → poke reaction + `playPokeTing()` + `haptic.thresholdTick()`; 'dizzy' → dizzy + `playDizzyWobble()` + two `haptic.thresholdTick()` calls 40ms apart; 'headpat' → pet + `playHeadPatChime()` + `haptic.pop()` + `const toast = useGameStore.getState().petAvatar()` (toast, when granted, shows via CardDeck's existing `lastReaction` bubble — no extra wiring needed in SwipeableCard).
  - Dizzy/double-tap on the FACE zone (cheeks): face samples go through the same path (zone is informational for the swipe gate — only hair-start swipes can be headpats; face-start swipes over 40px are... Review Ruling: treat face-start >40px swipes as a poke at pointerdown (already fired) and ignore — a quick flick across the face just pokes; do NOT fire the card drag).
- Visual layer (rendered ON TOP of the base state block, driven by `reaction`):
  - poke: two bright blush ellipses (`fill="#f6a5b8"`, `opacity 0.85`) + scale keyframes `animate={{ scale: reaction === 'poke' ? [1, 1.15, 0.95, 1] : 1 }}` on the motion.svg.
  - dizzy: spiral eyes — replace the state's eyes region with a `<g>` of two spiral paths (`@_@`: draw two small circles with arc gaps, or a rotating `<animateTransform type="rotate">` on two `@`-glyph `<text>` at the eye positions — simplest readable: two `<text>` elements "🌀" font-size 14 at (38,46)/(58,46)); wobble `animate={{ rotate: reaction === 'dizzy' ? [-6, 6, -6] : 0 }}` transition `{{ duration: 0.6, repeat: 4 }}`; star halo: `<g>` above the head (y ≈ 8) with three 5-point star `<path>`s at x = 36 / 48 / 60, each `motion.g` (or `<g>` + framer `animate={{ rotate: 360 }}` transition repeat Infinity, duration 1.2s) — Review Focus #5 pin: set the outer `<svg style={{ overflow: 'visible' }}>` so the halo (y<16) isn't clipped.
  - pet: closed delight eyes `^‿^` = two `^`-shaped strokes at eye positions + a big smile; squash `animate={{ scaleX: reaction === 'pet' ? 1.05 : 1, scaleY: reaction === 'pet' ? 0.95 : 1 }}`; 3 floating hearts: `<AnimatePresence>` with 3 `<motion.span>💕</motion.span>` absolutely positioned over the svg (wrap the svg in a `relative` div), `initial={{ y: 0, opacity: 1, scale: 1 }}` → `animate={{ y: -40, opacity: 0, scale: 1.4 }}` staggered x offsets (-18 / 0 / 18), duration 1.2s, then unmount.
- The reaction layers visually override the base state's eyes: when `reaction` is set, render ONLY reaction eyes (spiral / delight) instead of the state's eyes — keep cheeks/hair/z-etc from the base.

- [ ] **Step 1: Write the failing tests**

`src/test/avatarReaction.test.tsx`:

```tsx
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { act as framerAct } from '@testing-library/react';
import AvatarReaction from '@/components/card/AvatarReaction';
import { useGameStore, defaultInventory } from '@/store/useGameStore';
import { haptic } from '@/lib/haptics';
import * as audio from '@/lib/audio';

beforeEach(() => {
  vi.mocked(audio.playPokeTing).mockReset();
  vi.mocked(audio.playDizzyWobble).mockReset();
  vi.mocked(audio.playHeadPatChime).mockReset();
  vi.mocked(haptic.thresholdTick).mockReset();
  vi.mocked(haptic.pop).mockReset();
  useGameStore.setState({ lastPettedDay: -1, isGameOver: false, currentCard: null, lastReaction: null } as never);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

vi.mock('@/lib/audio');
vi.mock('@/lib/haptics');

const pointer = { type: 'pointerdown' as const, offsetY: 20, clientX: 0, clientY: 0 };

describe('AvatarReaction interactivity', () => {
  it('single tap → poke: ting + thresholdTick, then auto-clears', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { ...pointer, offsetY: 30 });
    fireEvent.pointerUp(svg, { ...pointer, offsetY: 30 });
    expect(audio.playPokeTing).toHaveBeenCalledTimes(1);
    expect(haptic.thresholdTick).toHaveBeenCalledTimes(1);
  });

  it('pointerdown on the avatar stops propagation (card drag isolation)', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    const spy = vi.fn();
    svg.parentElement.addEventListener('pointerdown', spy);
    fireEvent.pointerDown(svg, { offsetY: 30 });
    expect(spy).not.toHaveBeenCalled(); // stopped before bubbling
    svg.parentElement.removeEventListener('pointerdown', spy);
  });

  it('4 rapid taps → dizzy: wobble SFX + double haptic tick', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    for (let i = 0; i < 4; i++) {
      fireEvent.pointerDown(svg, { offsetY: 30 });
      fireEvent.pointerUp(svg, { offsetY: 30 });
    }
    expect(audio.playDizzyWobble).toHaveBeenCalledTimes(1);
    expect(haptic.thresholdTick).toHaveBeenCalledTimes(2); // double tick, no single pokes
    expect(audio.playPokeTing).not.toHaveBeenCalled();
  });

  it('hair swipe >40px → pet reaction + chime + pop haptic + toast via store', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { offsetY: 20 });
    fireEvent.pointerMove(svg, { offsetY: 20, clientX: 60 });
    fireEvent.pointerUp(svg, { offsetY: 20, clientX: 60 });
    expect(audio.playHeadPatChime).toHaveBeenCalledTimes(1);
    expect(haptic.pop).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().lastReaction).toContain('Được xoa đầu');
  });

  it('second head-pat same day → visuals still play, store returns null (no toast change)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    useGameStore.setState({ lastPettedDay: 1 } as never); // store default day is 1 → cooldown active
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { offsetY: 20 });
    fireEvent.pointerUp(svg, { offsetY: 20, clientX: 60 });
    expect(audio.playHeadPatChime).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().lastReaction).toBeNull(); // cooldown: no toast
  });

  it('a head-pat during dizzy overrides dizzy with no snap-back when the dizzy timer expires (Review Focus #2)', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<AvatarReaction />);
      const svg = container.querySelector('svg')!;
      for (let i = 0; i < 4; i++) { fireEvent.pointerDown(svg, { offsetY: 30 }); fireEvent.pointerUp(svg, { offsetY: 30 }); }
      expect(container.querySelector('[data-dizzy-halo]')).not.toBeNull();
      fireEvent.pointerDown(svg, { offsetY: 20 });
      fireEvent.pointerUp(svg, { offsetY: 20, clientX: 60 });
      expect(container.querySelector('[data-dizzy-halo]')).toBeNull();
      act(() => { vi.advanceTimersByTime(3000); });
      expect(container.querySelector('[data-dizzy-halo]')).toBeNull(); // no snap-back after pet overrides
    } finally {
      vi.useRealTimers();
    }
  });

  it('dizzy state renders the spiral eyes + rotating star halo (svg overflow visible, Review Focus #5)', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    for (let i = 0; i < 4; i++) { fireEvent.pointerDown(svg, { offsetY: 30 }); fireEvent.pointerUp(svg, { offsetY: 30 }); }
    expect(container.querySelector('[data-dizzy-halo]')).not.toBeNull();
    expect(svg.style.overflow).toBe('visible');
  });

  it('pet reaction renders 3 floating hearts', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { offsetY: 20 });
    fireEvent.pointerUp(svg, { offsetY: 20, clientX: 60 });
    expect(container.querySelectorAll('[data-pet-heart]')).toHaveLength(3);
  });
});
```

(If `haptic` mock needs `vi.mock('@/lib/haptics')` factory to keep `pop`/`thresholdTick` as jest-fn spies, use an inline factory. The `pointer` fixture uses `clientX/clientY`/`offsetX/offsetY` as needed by the handlers — implement handlers to read `e.nativeEvent.offsetX`/`clientX` with fallbacks so jsdom's synthetic events resolve; the component must tolerate `offsetY === undefined` by treating it as face-zone.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/avatarReaction.test.tsx`
Expected: FAIL — the interactivity tests fail (no pointer handlers, no halo/hearts attrs, SFX not called).

- [ ] **Step 3: Implement in `src/components/card/AvatarReaction.tsx`**

Per the implementation shape above. Exact data attrs to render: `data-dizzy-halo` on the star-halo group, `data-pet-heart` on each heart span, `overflow: visible` on the outer svg. SwipeableCard.tsx needs NO change for the reward toast (`lastReaction` already bubbles up to CardDeck's bubble).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/test/avatarReaction.test.tsx`
Expected: PASS, 8/8. Then run the whole suite: `npx vitest run` — all green (this catches any SwipeableCard regression).

- [ ] **Step 5: Commit**

```bash
git add src/components/card/AvatarReaction.tsx src/test/avatarReaction.test.tsx
git commit -m "feat: interactive avatar — poke, spam-dizzy, head-pat reactions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: SwipeableCard gesture isolation (stopPropagation on drag)

**Files:**
- Modify: `src/components/card/SwipeableCard.tsx`
- Test: `src/test/avatarReaction.test.tsx` (add 1 test) OR a small new `src/test/swipeIsolation.test.tsx`

**Interfaces:**
- Consumes: Task 4's handler (already stopPropagation-ing).
- Produces: Framer Motion's `drag` on the card div will NOT engage when the pointer started on the avatar. Framer's drag listens on the drag element's own pointerdown; a stopped bubble event prevents it. ALSO: add `data-interactive-avatar` to the avatar wrapper so tests can target it.

- [ ] **Step 1: Write the failing test**

```tsx
// In src/test/swipeIsolation.test.tsx
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import SwipeableCard from '@/components/card/SwipeableCard';
import { useGameStore, defaultInventory } from '@/store/useGameStore';
import type { GameCard } from '@/data/types';

const card: GameCard = { id: 'c1', chapterId: 'CH1_DATING', timeSlot: 'MORNING', situation: 's', avatarMood: 'happy',
  leftChoice: { text: 'L', modifiers: {}, narrativeReaction: 'rL' },
  rightChoice: { text: 'R', modifiers: {}, narrativeReaction: 'rR' } };

beforeEach(() => useGameStore.setState({ currentCard: card, stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 }, isGameOver: false, lastReaction: null, lastStatDelta: null } as never));
afterEach(cleanup);

it('a pointerdown on the avatar never reaches the card drag element', () => {
  render(<SwipeableCard card={card} />);
  const avatar = screen.getByRole('img')!.closest('[data-interactive-avatar]')!;
  const dragEl = screen.getByRole('img')!.closest('[aria-label]')!; // the motion.div with the card situation label
  const spy = vi.fn();
  // Bubble-phase listener on the drag element: a stopped event never arrives.
  dragEl.addEventListener('pointerdown', spy);
  fireEvent.pointerDown(avatar, { offsetY: 30 });
  expect(spy).not.toHaveBeenCalled();
  dragEl.removeEventListener('pointerdown', spy);
});

it('pointerdown on the card body (non-avatar) reaches the drag element normally', () => {
  render(<SwipeableCard card={card} />);
  const cardText = screen.getByText(card.situation);
  const dragEl = cardText.closest('[aria-label]')!;
  const spy = vi.fn();
  dragEl.addEventListener('pointerdown', spy);
  fireEvent.pointerDown(cardText);
  expect(spy).toHaveBeenCalledTimes(1);
  dragEl.removeEventListener('pointerdown', spy);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/swipeIsolation.test.tsx`
Expected: FAIL on the first test (bubble reaches the drag element without stopPropagation) or passes if Task 4 already handled it — if it passes immediately, that's evidence Task 4's handler is complete; the test still earns its keep as a regression pin for Task 5.

- [ ] **Step 3: Ensure SwipeableCard**

No code change expected — Task 4 already stops propagation on the avatar's own events. If the isolation test fails, add an `onPointerDownCapture={(e) => e.stopPropagation()}` guard on the avatar wrapper `div[data-interactive-avatar]` INSIDE SwipeableCard. (Capture-phase stop guarantees the card div never sees it, even if the avatar handler is bypassed in a render pass.)

- [ ] **Step 4: Run to verify it passes + full suite**

Run: `npx vitest run src/test/swipeIsolation.test.tsx && npx vitest run`
Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/components/card/SwipeableCard.tsx src/test/swipeIsolation.test.tsx
git commit -m "feat: isolate avatar gestures from card drag (stopPropagation capture)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Final verification (tsc + build + manual note)

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: all tests pass, no output warnings.

- [ ] **Step 3: Production build**

Run: `npx next build`
Expected: build completes, no hydration errors on prerender (avatar reaction state is client-local, deterministic first paint; `lastPettedDay` initial `-1` is a constant).

- [ ] **Step 4: Commit any build fixes**

If tsc/build surfaced errors, fix them and commit: `git commit -am "fix: avatar interaction typecheck/build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

- [ ] **Step 5: No-op commit if clean**

Nothing to commit; the branch is ready for the final whole-branch review.
