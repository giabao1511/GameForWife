import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore, defaultInventory } from '@/store/useGameStore';
import type { GameCard } from '@/data/types';

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

beforeEach(resetStore);

describe('useItem — stat items', () => {
  it('consumes BOBA: decrements count and applies its modifiers', () => {
    useGameStore.getState().useItem('BOBA');
    const s = useGameStore.getState();
    expect(s.inventory.BOBA.count).toBe(1);
    expect(s.stats.affection).toBe(75); // 50 + 25
    expect(s.stats.energy).toBe(65); // 50 + 15
    expect(s.stats.wallet).toBe(40); // 50 - 10
  });

  it('consumes PS5: energy up, affection down', () => {
    useGameStore.getState().useItem('PS5');
    const s = useGameStore.getState();
    expect(s.inventory.PS5.count).toBe(0);
    expect(s.stats.energy).toBe(85); // 50 + 35
    expect(s.stats.affection).toBe(35); // 50 - 15
  });

  it('is a no-op when count is 0', () => {
    const inv = defaultInventory();
    inv.PS5.count = 0;
    useGameStore.setState({ inventory: inv });
    const before = useGameStore.getState().stats;
    useGameStore.getState().useItem('PS5');
    expect(useGameStore.getState().stats).toEqual(before);
    expect(useGameStore.getState().inventory.PS5.count).toBe(0);
  });

  it('clamps item stat gains to 100', () => {
    useGameStore.setState({ stats: { energy: 95, affection: 50, sanity: 50, wallet: 50 } });
    useGameStore.getState().useItem('BOBA');
    expect(useGameStore.getState().stats.energy).toBe(100); // 95 + 15 clamped
  });
});

describe('useItem — PUPPY_EYES shield', () => {
  it('activates the shield instead of applying stats', () => {
    useGameStore.getState().useItem('PUPPY_EYES');
    const s = useGameStore.getState();
    expect(s.activeShield).toBe(true);
    expect(s.inventory.PUPPY_EYES.count).toBe(1);
    expect(s.stats).toEqual({ energy: 50, affection: 50, sanity: 50, wallet: 50 });
  });

  it('shield blocks an affection drop from the next choice and then resets', () => {
    resetStore({
      activeShield: true,
      currentCard: card('c1', {
        leftChoice: { text: 'L', modifiers: { affection: -10, sanity: 5 }, narrativeReaction: 'ouch' },
      }),
    });
    useGameStore.getState().applyChoice('LEFT');
    const s = useGameStore.getState();
    expect(s.stats.affection).toBe(50); // -10 clamped to 0 by shield
    expect(s.stats.sanity).toBe(55); // non-shielded stats still apply
    expect(s.activeShield).toBe(false); // consumed
  });

  it('shield does not block affection gains', () => {
    resetStore({
      activeShield: true,
      currentCard: card('c1', {
        leftChoice: { text: 'L', modifiers: { affection: 10 }, narrativeReaction: 'love' },
      }),
    });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().stats.affection).toBe(60);
  });
});

describe('restartGame resets inventory and shield', () => {
  it('restores full item counts and clears the shield', () => {
    useGameStore.getState().useItem('BOBA');
    useGameStore.getState().useItem('PUPPY_EYES');
    useGameStore.getState().restartGame([]);
    const s = useGameStore.getState();
    expect(s.inventory.BOBA.count).toBe(2);
    expect(s.inventory.PS5.count).toBe(1);
    expect(s.inventory.PUPPY_EYES.count).toBe(2);
    expect(s.activeShield).toBe(false);
  });
});
