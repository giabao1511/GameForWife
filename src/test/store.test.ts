import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { CHAPTER1_CARDS } from '@/data/cards/chapter1';
import type { GameCard } from '@/data/types';

function card(id: string, timeSlot: GameCard['timeSlot'] = 'MORNING', mods: Partial<GameCard['leftChoice']['modifiers']> = {}): GameCard {
  const base = CHAPTER1_CARDS.find((c) => c.timeSlot === timeSlot)!;
  return {
    ...base,
    id,
    timeSlot,
    leftChoice: { text: 'L', modifiers: mods, narrativeReaction: 'reaction L' },
    rightChoice: { text: 'R', modifiers: mods, narrativeReaction: 'reaction R' },
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
    lastReaction: null,
    ...overrides,
  });
}

beforeEach(resetStore);

describe('stats clamping', () => {
  it('clamps stats to [0, 100]', () => {
    resetStore({
      stats: { energy: 95, affection: 5, sanity: 50, wallet: 50 },
      currentCard: card('c1', 'MORNING', { energy: 50, affection: -50 }),
    });
    useGameStore.getState().applyChoice('LEFT');
    const { stats } = useGameStore.getState();
    expect(stats.energy).toBe(100); // 95 + 50 clamped
    expect(stats.affection).toBe(0); // 5 - 50 clamped at 0
  });
});

describe('game over trigger', () => {
  it('sets isGameOver and gameOverCause when a stat hits 0', () => {
    resetStore({
      stats: { energy: 10, affection: 50, sanity: 50, wallet: 50 },
      currentCard: card('c1', 'MORNING', { energy: -10 }),
    });
    useGameStore.getState().applyChoice('LEFT');
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(true);
    expect(s.gameOverCause).toBe('energy');
    expect(s.currentCard).toBeNull();
  });

  it('no game over when all stats stay above 0', () => {
    resetStore({
      currentCard: card('c1', 'MORNING', { energy: 5, sanity: 5 }),
    });
    useGameStore.getState().applyChoice('RIGHT');
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(false);
    expect(s.gameOverCause).toBeNull();
    expect(s.stats.energy).toBe(55);
  });

  it('applyChoice is a no-op after game over', () => {
    resetStore({ isGameOver: true, gameOverCause: 'wallet', currentCard: card('c1') });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().stats).toEqual({ energy: 50, affection: 50, sanity: 50, wallet: 50 });
  });
});

describe('day advancement', () => {
  it('advances day after every 3 turns', () => {
    const benign = (id: string) => card(id, 'MORNING', { energy: 1 });
    resetStore({ currentCard: benign('a') });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().day).toBe(1);
    useGameStore.setState({ currentCard: benign('b') });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().day).toBe(1);
    useGameStore.setState({ currentCard: benign('c') });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().day).toBe(2);
  });

  it('tracks the 3 most recent card ids', () => {
    const benign = (id: string) => card(id, 'MORNING', { energy: 1 });
    resetStore({ currentCard: benign('a') });
    useGameStore.getState().applyChoice('LEFT');
    useGameStore.setState({ currentCard: benign('b') });
    useGameStore.getState().applyChoice('LEFT');
    useGameStore.setState({ currentCard: benign('c') });
    useGameStore.getState().applyChoice('LEFT');
    useGameStore.setState({ currentCard: benign('d') });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().recentCardIds).toEqual(['b', 'c', 'd']);
  });
});

describe('drawNextCard', () => {
  const deck = [
    card('a', 'MORNING'),
    card('b', 'MORNING'),
    card('c', 'MORNING'),
    card('d', 'EVENING'),
  ];

  it('only draws from the active chapter + time slot', () => {
    for (let i = 0; i < 20; i++) {
      resetStore({ currentCard: card('a'), recentCardIds: ['a'] });
      useGameStore.getState().drawNextCard(deck);
      const drawn = useGameStore.getState().currentCard;
      expect(['b', 'c']).toContain(drawn?.id); // only 'b','c' are MORNING & not recent; 'd' is EVENING
    }
  });

  it('excludes recentCardIds but falls back to the full slot pool when all are recent', () => {
    resetStore({ recentCardIds: ['b', 'c', 'a'] });
    useGameStore.getState().drawNextCard(deck);
    const drawn = useGameStore.getState().currentCard;
    // all 3 MORNING cards are recent → falls back to any MORNING card
    expect(['a', 'b', 'c']).toContain(drawn?.id);
  });

  it('does nothing when in game over', () => {
    resetStore({ isGameOver: true, gameOverCause: 'sanity' });
    useGameStore.getState().drawNextCard(deck);
    expect(useGameStore.getState().currentCard).toBeNull();
  });

  it('never draws a card twice in a row', () => {
    resetStore({ currentCard: card('a'), recentCardIds: ['a'] });
    useGameStore.getState().drawNextCard(deck);
    expect(['b', 'c']).toContain(useGameStore.getState().currentCard?.id);
  });
});

describe('setTimeSlot', () => {
  it('overrides the slot and clears recent ids so the new slot draws fresh', () => {
    resetStore({ recentCardIds: ['a', 'b'] });
    useGameStore.getState().setTimeSlot('NIGHT');
    const s = useGameStore.getState();
    expect(s.activeTimeSlot).toBe('NIGHT');
    expect(s.recentCardIds).toEqual([]);
  });
});

describe('restartGame', () => {
  it('resets everything and draws a fresh card', () => {
    const deck = [card('a'), card('b'), card('c')];
    resetStore({
      stats: { energy: 0, affection: 10, sanity: 90, wallet: 20 },
      day: 7,
      isGameOver: true,
      gameOverCause: 'energy',
      recentCardIds: ['x', 'y', 'z'],
      currentCard: card('x'),
    });
    useGameStore.getState().restartGame(deck);
    const s = useGameStore.getState();
    expect(s.stats).toEqual({ energy: 50, affection: 50, sanity: 50, wallet: 50 });
    expect(s.day).toBe(1);
    expect(s.isGameOver).toBe(false);
    expect(s.gameOverCause).toBeNull();
    expect(s.recentCardIds).toEqual([]);
    expect(s.currentCard?.id).toBeDefined();
  });
});

describe('previewModifiers', () => {
  it('sets and clears the live HUD preview', () => {
    useGameStore.getState().setPreviewModifiers({ energy: -10, sanity: 5 });
    expect(useGameStore.getState().previewModifiers).toEqual({ energy: -10, sanity: 5 });
    useGameStore.getState().setPreviewModifiers(null);
    expect(useGameStore.getState().previewModifiers).toBeNull();
  });

  it('applyChoice clears any lingering preview', () => {
    resetStore({
      previewModifiers: { energy: 1 },
      currentCard: card('c1', 'MORNING', { energy: 2 }),
    });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().previewModifiers).toBeNull();
    expect(useGameStore.getState().lastReaction).toBe('reaction L');
  });
});
