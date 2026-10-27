import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore, defaultInventory, rollUpOutcome } from '@/store/useGameStore';
import { GLOBAL_UP_FALLBACK_OUTCOMES } from '@/data/upOutcomes';
import type { GameCard, UpOutcome } from '@/data/types';

function card(id: string, overrides: Partial<GameCard> = {}): GameCard {
  return {
    id,
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'test',
    avatarMood: 'neutral',
    leftChoice: { text: 'L', modifiers: {}, narrativeReaction: 'rL' },
    rightChoice: { text: 'R', modifiers: {}, narrativeReaction: 'rR' },
    ...overrides,
  };
}

function resetStore(overrides: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({
    stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 },
    day: 1,
    turns: 0,
    activeChapter: 'CH1_DATING',
    activeTimeSlot: 'MORNING',
    currentCard: null,
    isGameOver: false,
    gameOverCause: null,
    recentCardIds: [],
    previewModifiers: null,
    previewUnknown: false,
    lastReaction: null,
    inventory: defaultInventory(),
    activeShield: false,
    nextChainedCardId: null,
    ...overrides,
  } as never);
}

function pinRandom(value: number) {
  vi.spyOn(Math, 'random').mockReturnValue(value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(resetStore);

describe('applyChoice("UP")', () => {
  it('rolls the card custom upChoice and advances the turn', () => {
    resetStore({
      currentCard: card('c1', {
        upChoice: {
          text: 'Kệ anh tự quyết',
          possibleOutcomes: [{ weight: 1, modifiers: { affection: -5, wallet: -5 }, narrativeReaction: 'custom roll' }],
        },
      }),
    });
    useGameStore.getState().applyChoice('UP');
    const s = useGameStore.getState();
    expect(s.lastReaction).toBe('custom roll');
    expect(s.turns).toBe(1);
    expect(s.stats.affection).toBe(45);
    expect(s.stats.wallet).toBe(45);
    expect(s.currentCard).toBeNull();
  });

  it('falls back to the global table when the card has no upChoice', () => {
    resetStore({ currentCard: card('c1') });
    pinRandom(0); // r < 40 → first fallback outcome "Tự bơi & Hơi tủi thân"
    useGameStore.getState().applyChoice('UP');
    const s = useGameStore.getState();
    expect(s.lastReaction).toBe(GLOBAL_UP_FALLBACK_OUTCOMES[0].narrativeReaction);
    expect(s.stats.affection).toBe(35); // 50 - 15
    expect(s.stats.sanity).toBe(40); // 50 - 10
  });

  it('shield clamps the UP affection drop to 0 when active', () => {
    resetStore({
      activeShield: true,
      currentCard: card('c1', {
        upChoice: {
          text: 'Kệ',
          possibleOutcomes: [{ weight: 1, modifiers: { affection: -30, energy: -20 }, narrativeReaction: 'x' }],
        },
      }),
    });
    useGameStore.getState().applyChoice('UP');
    const s = useGameStore.getState();
    expect(s.stats.affection).toBe(50); // drop clamped to 0
    expect(s.stats.energy).toBe(30); // non-shielded drop still applies
    expect(s.activeShield).toBe(false);
  });

  it('triggers game over when an outcome zeroes a stat', () => {
    resetStore({
      stats: { energy: 15, affection: 50, sanity: 50, wallet: 50 },
      currentCard: card('c1', {
        upChoice: {
          text: 'Kệ',
          possibleOutcomes: [{ weight: 1, modifiers: { energy: -20 }, narrativeReaction: 'boom' }],
        },
      }),
    });
    useGameStore.getState().applyChoice('UP');
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(true);
    expect(s.gameOverCause).toBe('energy');
    expect(s.lastReaction).toBeNull();
  });

  it('is a no-op after game over', () => {
    resetStore({ isGameOver: true, gameOverCause: 'wallet', currentCard: card('c1') });
    const before = useGameStore.getState().stats;
    useGameStore.getState().applyChoice('UP');
    expect(useGameStore.getState().stats).toEqual(before);
  });
});

describe('rollUpOutcome — weighted selection', () => {
  it('picks the first outcome at r=0 and the last near r=1', () => {
    pinRandom(0);
    expect(rollUpOutcome(GLOBAL_UP_FALLBACK_OUTCOMES)).toBe(GLOBAL_UP_FALLBACK_OUTCOMES[0]);
    pinRandom(0.9999);
    expect(rollUpOutcome(GLOBAL_UP_FALLBACK_OUTCOMES)).toBe(
      GLOBAL_UP_FALLBACK_OUTCOMES[GLOBAL_UP_FALLBACK_OUTCOMES.length - 1],
    );
  });

  it('respects custom weights (distribution sanity over 2000 rolls)', () => {
    const outcomes: (UpOutcome & { label: 'A' | 'B' })[] = [
      { weight: 70, label: 'A', modifiers: {}, narrativeReaction: 'A' },
      { weight: 30, label: 'B', modifiers: {}, narrativeReaction: 'B' },
    ];
    const seen = { A: 0, B: 0 };
    for (let i = 0; i < 2000; i++) seen[rollUpOutcome(outcomes).label]++;
    // 70/30 split: B expects ~600 ± ~13 over 2000 rolls; bounds are ~15σ wide.
    expect(seen.B).toBeGreaterThan(400);
    expect(seen.B).toBeLessThan(800);
    expect(seen.A + seen.B).toBe(2000);
  });
});

describe('chained nextCardId', () => {
  it('LEFT choice with nextCardId routes the next draw deterministically', () => {
    const chained = card('chained-next');
    const deck = [card('c1', { leftChoice: { text: 'L', modifiers: {}, narrativeReaction: 'r', nextCardId: 'chained-next' } }), chained];
    resetStore({ currentCard: deck[0] });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().nextChainedCardId).toBe('chained-next');

    useGameStore.getState().drawNextCard(deck);
    expect(useGameStore.getState().currentCard?.id).toBe('chained-next');
    expect(useGameStore.getState().nextChainedCardId).toBeNull(); // consumed
  });

  it('UP can chain via the card-level nextCardId', () => {
    const chained = card('chained-next');
    const deck = [
      card('c1', {
        nextCardId: 'chained-next',
        upChoice: { text: 'Kệ', possibleOutcomes: [{ weight: 1, modifiers: {}, narrativeReaction: 'roll' }] },
      }),
      chained,
    ];
    resetStore({ currentCard: deck[0] });
    useGameStore.getState().applyChoice('UP');
    expect(useGameStore.getState().nextChainedCardId).toBe('chained-next');
    useGameStore.getState().drawNextCard(deck);
    expect(useGameStore.getState().currentCard?.id).toBe('chained-next');
  });

  it('falls back to random draw when the chained card is not in the deck', () => {
    const deck = [card('c1', { leftChoice: { text: 'L', modifiers: {}, narrativeReaction: 'r', nextCardId: 'ghost' } })];
    resetStore({ currentCard: deck[0] });
    useGameStore.getState().applyChoice('LEFT');
    useGameStore.getState().drawNextCard(deck);
    // ghost not found → back to the normal draw (no game over, single card pool)
    expect(useGameStore.getState().currentCard?.id).toBe('c1');
    expect(useGameStore.getState().nextChainedCardId).toBeNull();
  });
});
