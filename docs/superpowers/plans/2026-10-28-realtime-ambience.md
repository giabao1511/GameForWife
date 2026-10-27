# Real-Time Dynamic Ambience & Time-based Special Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the game's ambience, avatar mood, audio, and card-drawing with the player's real-world clock hour, with a guaranteed late-night special card and a dev-only period override.

**Architecture:** The repo already routes the *in-game* time slot via `src/lib/timeSlot.ts` (`TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'`). This feature adds a real-world *period* layer (`RealTimePeriod = 'morning' | 'afternoon' | 'evening' | 'latenight'`) in a new `src/lib/timeContext.ts` that maps 1:1 onto `TimeSlot`. New time-tagged cards live in `src/data/timeCards.ts` and join `CHAPTER1_ALL`. Deck drawing gains a period boost + late-night guarantee in `useGameStore.drawNextCard`. Visuals/audio read the active period (dev override first, then real clock).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 (arbitrary-value classes, per project convention), Framer Motion, Zustand, Vitest + Testing Library.

**Spec:** The feature spec is the pasted brief ("Real-Time Dynamic Ambience & Time-based Special Events"). No separate spec file.

## Global Constraints

- pnpm project (v9.15.0). Test: `pnpm vitest run`. Typecheck: `pnpm exec tsc --noEmit`. Build: `pnpm build`. No test script in package.json — run vitest directly.
- This feature is pure client-side React/TS; no Next.js routing/build API is touched. (AGENTS.md warns this Next.js version differs from training data — do not add Next APIs without reading `node_modules/next/dist/docs/`.)
- Card copy is Vietnamese, boyfriend-sim tone. Card modifiers keep the project's stat ranges (roughly -30…+35, four stats: `energy`, `affection`, `sanity`, `wallet`).
- Existing `timeSlot.ts` boundaries (11:30 / 18:00 / 22:30) drive the *in-game* slot; the new `timeContext.ts` uses the spec's boundaries (11:00 / 17:00 / 23:00). Both coexist — do not merge them.
- New tests live in `src/test/*.test.ts(x)` (vitest include pattern), jsdom environment, `@` alias → `src/`.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

## Review Focus

1. **Period boundary off-by-one** — 10:59 must be `morning`, 11:00 `afternoon`, 16:59 `afternoon`, 17:00 `evening`, 22:59 `evening`, 23:00 `latenight`, 5:59 `latenight`. → Task 1 boundary tests pin these.
2. **Late-night special re-drawing within one session** — the guaranteed card must draw exactly once per run. → Task 3 flag tests pin it (second draw is normal; `restartGame` resets).
3. **Late-night guarantee vs. chained narrative cards** — the special must still draw even when `nextChainedCardId` is set ("guaranteed as the first drawn card" of a late session). → Task 3 pins it.
4. **Dev override leaking into production** — `devPeriodOverride` must default to `null` and the toggle UI must be hidden in production builds. → Tasks 1 & 5 pin visibility via `NODE_ENV !== 'production'` + test that dev controls don't render when `NODE_ENV === 'production'`.
5. **Latenight avatar override stomping critical danger** — a critical stat (<15 → `puppy`) must beat the forced sleepy look. → Task 4 pins the priority order.

---

## Task 1: `timeContext.ts` period helper + dev override

**Files:**
- Create: `src/lib/timeContext.ts`
- Modify: `src/store/useUiStore.ts` (add `devPeriodOverride`)
- Test: `src/test/timeContext.test.ts`

**Interfaces:**
- Consumes: existing `TimeSlot` from `@/data/types`; `useUiStore` pattern from `src/store/useUiStore.ts`.
- Produces:
  - `type RealTimePeriod = 'morning' | 'afternoon' | 'evening' | 'latenight'`
  - `const PERIODS: readonly RealTimePeriod[]`
  - `function getRealTimePeriod(date?: Date): RealTimePeriod` — spec boundaries: 6–10h → morning, 11–16h → afternoon, 17–22h → evening, else latenight.
  - `function periodToTimeSlot(p: RealTimePeriod): TimeSlot` — morning→`'MORNING'`, afternoon→`'AFTERNOON'`, evening→`'EVENING'`, latenight→`'NIGHT'`.
  - `function getActivePeriod(date?: Date): RealTimePeriod` — returns `useUiStore.getState().devPeriodOverride ?? getRealTimePeriod(date)`.
  - `interface PeriodTheme { label: string; icon: string; overlay: string; dim?: boolean; moon?: boolean; stars?: boolean }` and `const PERIOD_THEMES: Record<RealTimePeriod, PeriodTheme>` (used by Task 4; define here so theming has one source). `label`/`icon` are Vietnamese (`'Chiều'`, `'Đêm khuya'`, …), `overlay` is a CSS `background` value (gradients defined in Task 4's values; for now put the final gradient strings here).
  - `useUiStore` gains: `devPeriodOverride: RealTimePeriod | null` (initial `null`) and `setDevPeriodOverride: (p: RealTimePeriod | null) => void` (plain `set`, no localStorage — dev-only, must not persist).

- [ ] **Step 1: Write the failing tests** in `src/test/timeContext.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getActivePeriod, getRealTimePeriod, periodToTimeSlot,
} from '@/lib/timeContext';
import type { RealTimePeriod } from '@/lib/timeContext';
import { useUiStore } from '@/store/useUiStore';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 0, 1, hour, minute, 0);
}

beforeEach(() => useUiStore.setState({ devPeriodOverride: null }));

describe('getRealTimePeriod', () => {
  const cases: Array<[number, number, RealTimePeriod]> = [
    [5, 59, 'latenight'], [6, 0, 'morning'], [10, 59, 'morning'],
    [11, 0, 'afternoon'], [16, 59, 'afternoon'], [17, 0, 'evening'],
    [22, 59, 'evening'], [23, 0, 'latenight'], [0, 0, 'latenight'],
  ];
  it.each(cases)('at %s:%s → %s', (h, m, expected) => {
    expect(getRealTimePeriod(at(h, m))).toBe(expected);
  });

  it('uses the device clock when no date is given', () => {
    expect(getRealTimePeriod()).not.toBeNull();
  });
});

describe('periodToTimeSlot', () => {
  it('maps each period onto the in-game TimeSlot', () => {
    expect(periodToTimeSlot('morning')).toBe('MORNING');
    expect(periodToTimeSlot('afternoon')).toBe('AFTERNOON');
    expect(periodToTimeSlot('evening')).toBe('EVENING');
    expect(periodToTimeSlot('latenight')).toBe('NIGHT');
  });
});

describe('getActivePeriod (dev override)', () => {
  it('falls back to the real clock when the override is null', () => {
    expect(getActivePeriod(at(14, 0))).toBe('afternoon');
  });
  it('returns the override when set', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    expect(getActivePeriod(at(14, 0))).toBe('latenight');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/test/timeContext.test.ts`
Expected: FAIL — `@/lib/timeContext` does not exist / `devPeriodOverride` unknown.

- [ ] **Step 3: Implement**

1. In `src/store/useUiStore.ts`: add `devPeriodOverride: RealTimePeriod | null` (initial `null`) and `setDevPeriodOverride` to `UiState` + the `create` body (import the type from `@/lib/timeContext` — the `audio.ts ↔ useUiStore` precedent shows lazy-`getState` cycles are acceptable; the type import is compile-time only).
2. Create `src/lib/timeContext.ts` with the five interfaces above. `PERIOD_THEMES` values:
   - `morning`: label `'Buổi sáng'`, icon `'🌅'`, `overlay: 'linear-gradient(to bottom, rgba(254, 233, 184, 0.55), rgba(254, 249, 238, 0) 40%)'` (golden/amber glow at top edge).
   - `afternoon`: label `'Buổi chiều'`, icon `'☀️'`, `overlay: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.35), rgba(253, 251, 247, 0) 30%)'` (clean midday light).
   - `evening`: label `'Buổi tối'`, icon `'🌆'`, `overlay: 'linear-gradient(to bottom right, rgba(251, 176, 194, 0.4), rgba(180, 130, 226, 0.3))'` (romantic twilight pink/purple).
   - `latenight`: label `'Đêm khuya'`, icon `'🌙'`, `overlay: 'radial-gradient(ellipse at center, rgba(31, 30, 36, 0.30) 0%, rgba(31, 30, 36, 0.55) 100%)'`, `dim: true, moon: true, stars: true` (dimmed warm vignette — deliberately NOT the opaque `#1f1e24` background, so existing light-text UI stays readable; the spec allows the dimmed variant).

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/test/timeContext.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeContext.ts src/store/useUiStore.ts src/test/timeContext.test.ts
git commit -m "feat: add real-time period context with dev override

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Time-sensitive card data (`timeCards.ts`)

**Files:**
- Modify: `src/data/types.ts` (extend `GameCard`)
- Create: `src/data/timeCards.ts`
- Modify: `src/data/cards/chapter1Extra.ts` (fold `TIME_CARDS` into `CHAPTER1_ALL`)
- Test: `src/test/timeCards.test.ts`

**Interfaces:**
- Consumes: `GameCard`/`RealTimePeriod` (Task 1).
- Produces:
  - `GameCard` gains two optional fields: `preferredPeriod?: RealTimePeriod` and `exclusivePeriod?: RealTimePeriod`.
  - `export const TIME_CARDS: GameCard[]` — 7 cards, all `chapterId: 'CH1_DATING'`:
    - `time-morning-wake` / `time-morning-food` (`timeSlot: 'MORNING'`, `preferredPeriod: 'morning'`)
    - `time-afternoon-coffee` / `time-afternoon-lunch-run` (`timeSlot: 'AFTERNOON'`, `preferredPeriod: 'afternoon'`)
    - `time-evening-fresh-air` / `time-evening-movie-or-noodles` (`timeSlot: 'EVENING'`, `preferredPeriod: 'evening'`)
    - `time-latenight-bedtime` (`timeSlot: 'NIGHT'`, `exclusivePeriod: 'latenight'`, `preferredPeriod: 'latenight'`)
  - `export const TIME_LATENIGHT_SPECIAL_ID = 'time-latenight-bedtime'`.
  - `CHAPTER1_ALL` becomes `[...CHAPTER1_CARDS, ...EXTRA_CARDS, ...TIME_CARDS]` (keep `CHAPTER1_ALL_MAP` derived from it).
  - Card copy: use the spec's exact Vietnamese text for `situation` and choice texts. Modifiers:
    - `time-latenight-bedtime` left `"Em bấm nốt rồi ngủ ngay"` → `{ sanity: 10, affection: 8 }`; right `"Ngoan ngoãn đi ngủ"` → `{ energy: 15, sanity: 5 }` (Hồi phục Pin + small sanity/"victory" buff).
    - The six preferred cards: pick balanced small modifiers in the project's range (e.g. `±5…15`, mixed across the four stats) with a short `narrativeReaction` each — implementer's discretion, keep the sim's tone.

- [ ] **Step 1: Write the failing tests** in `src/test/timeCards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TIME_CARDS, TIME_LATENIGHT_SPECIAL_ID } from '@/data/timeCards';
import { CHAPTER1_ALL, EXTRA_CARDS } from '@/data/cards/chapter1Extra';
import { CHAPTER1_CARDS } from '@/data/cards/chapter1';

describe('TIME_CARDS', () => {
  it('has 7 cards: 2 per day period + 1 latenight exclusive', () => {
    expect(TIME_CARDS).toHaveLength(7);
    const byPref = (p: string) => TIME_CARDS.filter((c) => c.preferredPeriod === p);
    expect(byPref('morning')).toHaveLength(2);
    expect(byPref('afternoon')).toHaveLength(2);
    expect(byPref('evening')).toHaveLength(2);
  });

  it('the latenight special is exclusive to the latenight period', () => {
    const special = TIME_CARDS.find((c) => c.id === TIME_LATENIGHT_SPECIAL_ID)!;
    expect(special.exclusivePeriod).toBe('latenight');
    expect(special.timeSlot).toBe('NIGHT');
  });

  it('every time card carries a preferredPeriod matching its TimeSlot era', () => {
    for (const c of TIME_CARDS) {
      expect(c.preferredPeriod).toBeDefined();
      expect(c.chapterId).toBe('CH1_DATING');
      expect(c.situation.length).toBeGreaterThan(0);
      expect(c.leftChoice.text.length).toBeGreaterThan(0);
      expect(c.rightChoice.text.length).toBeGreaterThan(0);
    }
  });
});

describe('CHAPTER1_ALL integration', () => {
  it('includes all TIME_CARDS exactly once each', () => {
    for (const c of TIME_CARDS) {
      expect(CHAPTER1_ALL.filter((x) => x.id === c.id)).toHaveLength(1);
    }
    expect(CHAPTER1_ALL).toHaveLength(CHAPTER1_CARDS.length + EXTRA_CARDS.length + TIME_CARDS.length);
  });

  it('all ids in CHAPTER1_ALL are unique', () => {
    const ids = CHAPTER1_ALL.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/test/timeCards.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Add the two optional fields to `GameCard` in `src/data/types.ts` (one-line JSDoc each: `preferredPeriod` = period-boost eligible, `exclusivePeriod` = guaranteed when that period is active and not yet drawn). Create `src/data/timeCards.ts` with the 7 cards (spec text verbatim for situations + the latenight choices; balanced modifiers + short Vietnamese reactions for the rest). In `chapter1Extra.ts`: export `EXTRA_CARDS` (it is currently module-private — the test in Step 1 imports it), update the `CHAPTER1_ALL` spread, and refresh the header comment.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/test/timeCards.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/timeCards.ts src/data/cards/chapter1Extra.ts src/test/timeCards.test.ts
git commit -m "feat: add time-period cards incl. latenight exclusive

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Deck-drawing logic (period boost + latenight guarantee)

**Files:**
- Modify: `src/store/useGameStore.ts` (`GameStore` interface + `drawNextCard` + `restartGame`)
- Test: `src/test/drawTimePeriod.test.ts`

**Interfaces:**
- Consumes: `getActivePeriod`, `TIME_LATENIGHT_SPECIAL_ID` (Tasks 1–2).
- Produces: `GameStore` gains `lateNightSpecialDrawn: boolean` (initial `false`, **not** persisted — session-scoped). `restartGame` resets it to `false`.
- `drawNextCard(deck)` new algorithm (replace the random-draw tail, keep the game-over guard and chained-card handling with one exception):
  1. `if (state.isGameOver || state.isVictory) return;` (unchanged)
  2. **Guarantee** (before the chained-card check): if `getActivePeriod() === 'latenight' && !state.lateNightSpecialDrawn` and the deck contains `TIME_LATENIGHT_SPECIAL_ID` → set `currentCard` to it, `lateNightSpecialDrawn: true`, return.
  3. Chained-card check (unchanged from today).
  4. Pool/fresh/candidates (unchanged from today).
  5. **Boost**: `const matching = candidates.filter((c) => c.preferredPeriod === getActivePeriod());` then `const pick = matching.length > 0 && Math.random() < 0.7 ? matching : candidates;` draw uniformly from `pick` (same `Math.floor(Math.random() * pick.length)` pattern as today).

- [ ] **Step 1: Write the failing tests** in `src/test/drawTimePeriod.test.ts` — build decks with `@/data/cards/chapter1` `card()`-style local fixtures (see `src/test/store.test.ts` for the pattern; new cards need `preferredPeriod`):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { useUiStore } from '@/store/useUiStore';
import { TIME_LATENIGHT_SPECIAL_ID } from '@/data/timeCards';
import type { GameCard } from '@/data/types';

function tag(id: string, period?: GameCard['preferredPeriod']): GameCard {
  return {
    id, chapterId: 'CH1_DATING', timeSlot: 'MORNING',
    situation: 'x', avatarMood: 'neutral',
    leftChoice: { text: 'L', modifiers: {}, narrativeReaction: 'l' },
    rightChoice: { text: 'R', modifiers: {}, narrativeReaction: 'r' },
    ...(period ? { preferredPeriod: period } : {}),
  };
}

function reset(overrides: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({
    activeTimeSlot: 'MORNING', activeChapter: 'CH1_DATING',
    currentCard: null, isGameOver: false, isVictory: false,
    recentCardIds: [], nextChainedCardId: null, lateNightSpecialDrawn: false,
    ...overrides,
  } as never);
  useUiStore.setState({ devPeriodOverride: null });
  vi.restoreAllMocks();
}

const latenightDeck = [tag('m1', 'morning'), tag('m2', 'morning'), tag('x1'), tag('x2')];
// a real deck containing the special:
import { TIME_CARDS } from '@/data/timeCards';

describe('latenight special guarantee', () => {
  it('draws the special first when the active period is latenight', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    reset({ currentCard: tag('m1') });
    useGameStore.getState().drawNextCard([...TIME_CARDS, ...latenightDeck]);
    expect(useGameStore.getState().currentCard?.id).toBe(TIME_LATENIGHT_SPECIAL_ID);
    expect(useGameStore.getState().lateNightSpecialDrawn).toBe(true);
  });

  it('wins even over a pending chained card', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    reset({ nextChainedCardId: 'm2' });
    useGameStore.getState().drawNextCard([...TIME_CARDS, ...latenightDeck]);
    expect(useGameStore.getState().currentCard?.id).toBe(TIME_LATENIGHT_SPECIAL_ID);
  });

  it('draws it at most once per session', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    reset({ lateNightSpecialDrawn: true });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().drawNextCard([...TIME_CARDS, ...latenightDeck]);
    expect(useGameStore.getState().currentCard?.id).not.toBe(TIME_LATENIGHT_SPECIAL_ID);
  });

  it('is skipped when the deck does not contain it', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    reset({});
    useGameStore.getState().drawNextCard(latenightDeck); // no TIME_CARDS
    expect(useGameStore.getState().currentCard?.id).toBe('m1');
    expect(useGameStore.getState().lateNightSpecialDrawn).toBe(false);
  });
});

describe('period boost (70%)', () => {
  it('prefers matching cards when the roll lands under 0.7', () => {
    useUiStore.setState({ devPeriodOverride: 'morning' });
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.25) // boost roll: 0.25 < 0.7 → matching pool
      .mockReturnValue(0);       // pick index 0 of matching pool ['m1','m2']
    reset({});
    useGameStore.getState().drawNextCard(latenightDeck);
    expect(useGameStore.getState().currentCard?.id).toBe('m1');
  });

  it('falls back to the full candidate pool when the roll is >= 0.7', () => {
    useUiStore.setState({ devPeriodOverride: 'morning' });
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // boost roll: fallback
      .mockReturnValue(0.25);   // index floor(0.25 * 4) = 1 → 'm2' in full pool
    reset({});
    useGameStore.getState().drawNextCard(latenightDeck);
    expect(useGameStore.getState().currentCard?.id).toBe('m2');
  });

  it('does not re-serve a card in recentCardIds inside the matching pool', () => {
    useUiStore.setState({ devPeriodOverride: 'morning' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    reset({ recentCardIds: ['m1'] });
    useGameStore.getState().drawNextCard(latenightDeck);
    expect(useGameStore.getState().currentCard?.id).toBe('m2');
  });
});

describe('restartGame', () => {
  it('resets the latenight special flag for the next run', () => {
    reset({ lateNightSpecialDrawn: true });
    useGameStore.getState().restartGame(latenightDeck);
    expect(useGameStore.getState().lateNightSpecialDrawn).toBe(false);
  });
});
```

Note on the `restartGame` test: `restartGame` reads `getCurrentTimeSlot()` and localStorage — fine under jsdom; `lateNightSpecialDrawn: false` must be in its reset object.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/test/drawTimePeriod.test.ts`
Expected: FAIL — `lateNightSpecialDrawn` unknown / guarantee not implemented.

- [ ] **Step 3: Implement in `src/store/useGameStore.ts`**

Add `lateNightSpecialDrawn: boolean` to the interface + initial state; apply steps 2–5 of the algorithm above to `drawNextCard`; add the flag to the `restartGame` reset object. Import `getActivePeriod` from `@/lib/timeContext` and `TIME_LATENIGHT_SPECIAL_ID` from `@/data/timeCards`. Keep a comment noting the guarantee is session-scoped by design.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/test/drawTimePeriod.test.ts src/test/store.test.ts`
Expected: PASS (existing `store.test.ts` draw tests keep passing — with no override the boost still has `matching` possibly non-empty; `Math.random()` is unmocked there, behavior stays statistically identical. If a legacy assertion like `'never draws a card twice in a row'` could be perturbed by the boost, check: it only asserts the drawn id is in `{b,c}` — morning-tagged cards are never in that deck, so `matching` is empty and behavior is unchanged.)

- [ ] **Step 5: Commit**

```bash
git add src/store/useGameStore.ts src/test/drawTimePeriod.test.ts
git commit -m "feat: period-aware deck draw with latenight special guarantee

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 4: Ambience visuals (GameViewport + AvatarReaction)

**Files:**
- Modify: `src/components/GameViewport.tsx`
- Modify: `src/components/card/AvatarReaction.tsx`
- Test: `src/test/timeAmbience.test.tsx`

**Interfaces:**
- Consumes: `getActivePeriod`, `PERIOD_THEMES`, `PeriodTheme` (Task 1); `useUiStore.devPeriodOverride` for reactivity.
- Produces: nothing new exported — but the rendered markup: `GameViewport`'s root div gets `data-period="<activePeriod>"` and a decorative overlay layer `data-ambience="<activePeriod>"` (absolute, inset-0, `pointer-events-none`, `rounded` to match the container, `style={{ background: theme.overlay }}`); when `theme.moon` a small moon badge (`data-moon`, emoji/icon, absolute top-right, `aria-hidden`); when `theme.stars` a handful of `★`/`✶` particle spans with a Framer Motion slow fade/float loop (`data-stars`, `aria-hidden`). Container background switches per period via `theme`: morning `#fef9ee`, afternoon `#fdfbf7` (unchanged default), evening `#fbf4f0`, latenight keeps the base light bg under the dim vignette (readability, see Task 1 theme note).

`GameViewport` is currently a plain (non-client) module taking `children`; it must read the store, so add the `'use client'` directive. It will call `useUiStore((s) => s.devPeriodOverride)` (reactive) and compute `period = override ?? getRealTimePeriod()`.

`AvatarReaction` change: the internal state resolver becomes `avatarState(stats, period)`:
1. any stat < 15 → `'puppy'` (critical wins, unchanged)
2. period === `'latenight'` → `'sleepy'` (forced default, per spec)
3. remaining rules unchanged (`energy < 25 → sleepy`, `wallet < 20 → broke`, `affection > 75 → love`, else `happy`).
Read the period with `getActivePeriod()` inside the component (it re-renders when `devPeriodOverride` changes only if subscribed — subscribe: `useUiStore((s) => s.devPeriodOverride)` and derive).

- [ ] **Step 1: Write the failing tests** in `src/test/timeAmbience.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameViewport from '@/components/GameViewport';
import AvatarReaction from '@/components/card/AvatarReaction';
import { useUiStore } from '@/store/useUiStore';
import { useGameStore } from '@/store/useGameStore';

beforeEach(() => {
  useUiStore.setState({ devPeriodOverride: null });
  useGameStore.setState({ stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 } });
});

describe('GameViewport ambience', () => {
  it('marks the active period on the viewport root', () => {
    render(<GameViewport><div>kid</div></GameViewport>);
    const root = screen.getByText('kid').parentElement!;
    expect(root).toHaveAttribute('data-period'); // real-clock period, one of the four
    expect(root.querySelector('[data-ambience]')).not.toBeNull();
  });

  it('renders the moon badge + stars only for latenight', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    render(<GameViewport><div>kid</div></GameViewport>);
    const root = screen.getByText('kid').parentElement!;
    expect(root).toHaveAttribute('data-period', 'latenight');
    expect(root.querySelector('[data-moon]')).not.toBeNull();
    expect(root.querySelector('[data-stars]')).not.toBeNull();
  });

  it('omits moon/stars for morning', () => {
    useUiStore.setState({ devPeriodOverride: 'morning' });
    render(<GameViewport><div>kid</div></GameViewport>);
    const root = screen.getByText('kid').parentElement!;
    expect(root.querySelector('[data-moon]')).toBeNull();
    expect(root.querySelector('[data-stars]')).toBeNull();
  });
});

describe('AvatarReaction latenight default', () => {
  it('forces the sleepy look at healthy stats during latenight', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    render(<AvatarReaction />);
    expect(screen.getByRole('img', { name: /sleepy/i })).toBeInTheDocument();
  });

  it('critical danger (stat < 15) overrides the latenight sleepy default', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    useGameStore.setState({ stats: { energy: 10, affection: 50, sanity: 50, wallet: 50 } });
    render(<AvatarReaction />);
    expect(screen.getByRole('img', { name: /puppy/i })).toBeInTheDocument();
  });
});
```

(Note: `AvatarReaction`'s `aria-label` is `` `Bạn trai đang ${state}` `` — `sleepy`/`puppy` match the regexes.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/test/timeAmbience.test.tsx`
Expected: FAIL — no `data-period`/overlay; avatar shows `happy` at 50/50.

- [ ] **Step 3: Implement** `GameViewport.tsx` and `AvatarReaction.tsx` per the Interfaces block. Keep Framer Motion usage consistent with the codebase (`motion` from `framer-motion`); star particles: 5–8 absolutely-positioned spans, `initial/animate` opacity loop, `transition.repeat: Infinity`, durations ~2.4–4s (match the `animate` patterns already in `AvatarReaction`).

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/test/timeAmbience.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameViewport.tsx src/components/card/AvatarReaction.tsx src/test/timeAmbience.test.tsx
git commit -m "feat: period-driven ambience overlay + latenight avatar default

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: Audio ambience + dev period toggle

**Files:**
- Modify: `src/lib/audio.ts` (add `playPeriodAmbience`)
- Modify: `src/components/GameScreen.tsx` (play ambience on mount)
- Modify: `src/components/hud/HudControls.tsx` (dev period control)
- Test: `src/test/timeAudio.test.ts` (new)

**Interfaces:**
- Consumes: `RealTimePeriod`, `getActivePeriod` (Task 1); dev override setter (Task 1).
- Produces: `export function playPeriodAmbience(period: RealTimePeriod): void` in `audio.ts`:
  - `morning`: two short bright ascending triangle "chirps" (e.g. 1318→1760, 1568→2093 Hz, ~0.08–0.12s each, `volume ≈ 0.12`) — soft bird-chirp feel.
  - `latenight`: 3-note descending gentle sine lullaby (e.g. 523→392→262, slower 0.3s notes, `volume ≈ 0.15`, longer release).
  - `afternoon` / `evening`: no-op (clean neutral ambience; keep the function total over the union).
  - Reuse the existing `tone()` primitive; `ensure()` no-ops safely when `AudioContext` is unavailable (jsdom) — the function must never throw.
- `GameScreen` mount effect: after the existing `hydrateFromStorage` effect, call `playPeriodAmbience(getActivePeriod())` once (wrapped so a muted engine just stays silent).
- `HudControls`: change the gate from `IS_DEV` (`NODE_ENV === 'development'`) to `const IS_DEV = process.env.NODE_ENV !== 'production'` (so vitest, which runs as `test`, renders it — this is also the Review Focus #4 pin). Add to the dev block, next to the existing Victory shortcut: four small buttons (🌅 ☀️ 🌆 🌙) + an "Auto" button that calls `useUiStore.getState().setDevPeriodOverride(p)`; when a period is picked it ALSO calls `useGameStore.getState().setTimeSlot(periodToTimeSlot(p))` so the deck pool matches the previewed ambience (spec: "preview all 4 ambient themes and card draws"). Highlight the active period; "Auto" sets `null` and does not touch the slot.

- [ ] **Step 1: Write the failing tests** in `src/test/timeAudio.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { playPeriodAmbience } from '@/lib/audio';
import { useUiStore } from '@/store/useUiStore';
import { useGameStore } from '@/store/useGameStore';
import { render, screen, fireEvent } from '@testing-library/react';
import HudControls from '@/components/hud/HudControls';
import type { RealTimePeriod } from '@/lib/timeContext';

beforeEach(() => useUiStore.setState({ devPeriodOverride: null }));

describe('playPeriodAmbience', () => {
  it.each(['morning', 'afternoon', 'evening', 'latenight'] as RealTimePeriod[])(
    '%s does not throw without an AudioContext', (p) => {
      expect(() => playPeriodAmbience(p)).not.toThrow();
    },
  );
});

describe('HudControls dev period toggle (non-production)', () => {
  it('exposes the 4 periods + Auto and drives devPeriodOverride + slot', () => {
    render(<HudControls />);
    for (const icon of ['🌅', '☀️', '🌆', '🌙']) {
      expect(screen.getByRole('button', { name: new RegExp(icon) })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: /🌙/ }));
    expect(useUiStore.getState().devPeriodOverride).toBe('latenight');
    expect(useGameStore.getState().activeTimeSlot).toBe('NIGHT');
    fireEvent.click(screen.getByRole('button', { name: /Auto/ }));
    expect(useUiStore.getState().devPeriodOverride).toBeNull();
  });
});
```

(Each period button's accessible name is its emoji `aria-label` like `'Bối cảnh: Đêm khuya'`; implementer keeps it matching the regex assertions. Rendering `HudControls` pulls in store deps — the same `resetStore`-style `beforeEach` from `src/test/store.test.ts` may be needed to give stores sane state; add as required.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/test/timeAudio.test.ts`
Expected: FAIL — `playPeriodAmbience` not exported; toggle buttons absent.

- [ ] **Step 3: Implement** the three files per the Interfaces block.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/test/timeAudio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio.ts src/components/GameScreen.tsx src/components/hud/HudControls.tsx src/test/timeAudio.test.ts
git commit -m "feat: period ambience chimes + dev period toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: Full verification

**Files:** none (verification only; fix any fallout in place).

- [ ] **Step 1: Unit tests**

Run: `pnpm vitest run`
Expected: all suites green (existing + 4 new test files).

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no new errors.

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: build succeeds. (Per AGENTS.md, if any Next-specific file needed changing during this feature, consult `node_modules/next/dist/docs/` first — this plan should not require it.)

- [ ] **Step 5: Manual smoke (dev server)**

Run: `pnpm dev` (or `pnpm start` after build), open the app, and in the dev-only HUD block click each of 🌅 ☀️ 🌆 🌙: viewport gradient/moon/stars change, avatar turns sleepy on 🌙, and a fresh card draw in 🌙 serves the latenight special first.

- [ ] **Step 6: Final commit if any verification fixes were needed**

```bash
git add -A
git commit -m "chore: verification fixes for realtime ambience

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
