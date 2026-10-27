import { describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { useUiStore } from '@/store/useUiStore';
import { TIME_CARDS, TIME_LATENIGHT_SPECIAL_ID } from '@/data/timeCards';
import type { GameCard } from '@/data/types';

function tag(id: string, period?: GameCard['preferredPeriod']): GameCard {
  return {
    id,
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'x',
    avatarMood: 'neutral',
    leftChoice: { text: 'L', modifiers: {}, narrativeReaction: 'l' },
    rightChoice: { text: 'R', modifiers: {}, narrativeReaction: 'r' },
    ...(period ? { preferredPeriod: period } : {}),
  };
}

function reset(overrides: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({
    activeTimeSlot: 'MORNING',
    activeChapter: 'CH1_DATING',
    currentCard: null,
    isGameOver: false,
    isVictory: false,
    recentCardIds: [],
    nextChainedCardId: null,
    lateNightSpecialDrawn: false,
    ...overrides,
  } as never);
  useUiStore.setState({ devPeriodOverride: null });
  vi.restoreAllMocks();
}

// No real time cards: two morning-tagged + two untagged, all MORNING.
const plainDeck = [tag('m1', 'morning'), tag('m2', 'morning'), tag('x1'), tag('x2')];

describe('latenight special guarantee', () => {
  it('draws the special first when the active period is latenight', () => {
    reset({ currentCard: tag('m1') });
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    useGameStore.getState().drawNextCard([...TIME_CARDS, ...plainDeck]);
    expect(useGameStore.getState().currentCard?.id).toBe(TIME_LATENIGHT_SPECIAL_ID);
    expect(useGameStore.getState().lateNightSpecialDrawn).toBe(true);
  });

  it('wins even over a pending chained card', () => {
    reset({ nextChainedCardId: 'm2' });
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    useGameStore.getState().drawNextCard([...TIME_CARDS, ...plainDeck]);
    expect(useGameStore.getState().currentCard?.id).toBe(TIME_LATENIGHT_SPECIAL_ID);
  });

  it('draws it at most once per session', () => {
    reset({ lateNightSpecialDrawn: true });
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().drawNextCard([...TIME_CARDS, ...plainDeck]);
    expect(useGameStore.getState().currentCard?.id).not.toBe(TIME_LATENIGHT_SPECIAL_ID);
  });

  it('is skipped when the deck does not contain it', () => {
    reset({});
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().drawNextCard(plainDeck); // no TIME_CARDS
    expect(useGameStore.getState().currentCard?.id).toBe('m1');
    expect(useGameStore.getState().lateNightSpecialDrawn).toBe(false);
  });
});

describe('period boost (70%)', () => {
  it('prefers matching cards when the roll lands under 0.7', () => {
    reset({});
    useUiStore.setState({ devPeriodOverride: 'morning' });
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.25) // boost roll: 0.25 < 0.7 → matching pool
      .mockReturnValue(0); // pick index 0 of matching pool ['m1', 'm2']
    useGameStore.getState().drawNextCard(plainDeck);
    expect(useGameStore.getState().currentCard?.id).toBe('m1');
  });

  it('falls back to the full candidate pool when the roll is >= 0.7', () => {
    reset({});
    useUiStore.setState({ devPeriodOverride: 'morning' });
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9) // boost roll: fallback
      .mockReturnValue(0.25); // index floor(0.25 * 4) = 1 → 'm2' in full pool
    useGameStore.getState().drawNextCard(plainDeck);
    expect(useGameStore.getState().currentCard?.id).toBe('m2');
  });

  it('does not re-serve a card in recentCardIds inside the matching pool', () => {
    reset({ recentCardIds: ['m1'] });
    useUiStore.setState({ devPeriodOverride: 'morning' });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().drawNextCard(plainDeck);
    expect(useGameStore.getState().currentCard?.id).toBe('m2');
  });
});

describe('restartGame', () => {
  it('resets the latenight special flag for the next run', () => {
    reset({ lateNightSpecialDrawn: true });
    useGameStore.getState().restartGame(plainDeck);
    expect(useGameStore.getState().lateNightSpecialDrawn).toBe(false);
  });
});
