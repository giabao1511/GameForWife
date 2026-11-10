import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore, defaultInventory } from '@/store/useGameStore';
import { CHAPTER1_CARDS } from '@/data/cards/chapter1';
import { deathsForStat } from '@/data/deaths';
import type { GameCard } from '@/data/types';

function card(id: string, mods: Partial<GameCard['leftChoice']['modifiers']> = {}): GameCard {
  const base = CHAPTER1_CARDS.find((c) => c.timeSlot === 'MORNING')!;
  return {
    ...base,
    id,
    timeSlot: 'MORNING',
    leftChoice: { text: 'L', modifiers: mods, narrativeReaction: 'rL' },
    rightChoice: { text: 'R', modifiers: mods, narrativeReaction: 'rR' },
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
    isVictory: false,
    gameOverCause: null,
    deathId: null,
    recentCardIds: [],
    previewModifiers: null,
    lastReaction: null,
    inventory: defaultInventory(),
    activeShield: false,
    nextChainedCardId: null,
    hasUsedRevival: false,
    isRevivalActive: false,
    pendingDeathStat: null,
    ...overrides,
  });
}

/** Drive a stat to zero through applyChoice so the interceptor fires naturally. */
function interceptDeath(stat: 'energy' | 'affection' | 'sanity' | 'wallet') {
  resetStore({
    stats: { energy: 5, affection: 5, sanity: 5, wallet: 5 },
    currentCard: card('c1', { [stat]: -5 }),
  });
  useGameStore.getState().applyChoice('LEFT');
}

beforeEach(resetStore);

describe('death interception', () => {
  it('intercepts the first death for every stat (no instant game over)', () => {
    for (const stat of ['energy', 'affection', 'sanity', 'wallet'] as const) {
      interceptDeath(stat);
      const s = useGameStore.getState();
      expect(s.isGameOver, stat).toBe(false);
      expect(s.isRevivalActive, stat).toBe(true);
      expect(s.pendingDeathStat, stat).toBe(stat);
      expect(s.hasUsedRevival, stat).toBe(false);
    }
  });

  it('applyChoice is a no-op while a revival is in progress', () => {
    interceptDeath('energy');
    useGameStore.setState({ currentCard: card('c2') });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().stats).toEqual({ energy: 0, affection: 5, sanity: 5, wallet: 5 });
  });

  it('useItem can also trigger the interception and is locked out while active', () => {
    resetStore({
      stats: { energy: 50, affection: 50, sanity: 50, wallet: 10 },
      currentCard: null,
      inventory: {
        ...defaultInventory(),
        PS5: { ...defaultInventory().PS5, modifiers: { wallet: -10 } },
      },
    });
    useGameStore.getState().useItem('PS5');
    expect(useGameStore.getState().isRevivalActive).toBe(true);
    expect(useGameStore.getState().pendingDeathStat).toBe('wallet');
    // The modal owns the screen — no items may be used mid-rescue.
    useGameStore.getState().useItem('BOBA');
    expect(useGameStore.getState().inventory.BOBA.count).toBe(defaultInventory().BOBA.count);
  });
});

describe('reviveBoyfriendSuccess', () => {
  it('restores the fatal stat to +20 and leaves the run alive', () => {
    interceptDeath('wallet');
    useGameStore.getState().reviveBoyfriendSuccess();
    const s = useGameStore.getState();
    expect(s.isRevivalActive).toBe(false);
    expect(s.isGameOver).toBe(false);
    expect(s.hasUsedRevival).toBe(true);
    expect(s.pendingDeathStat).toBeNull();
    expect(s.stats.wallet).toBe(20);
    expect(s.lastReaction).toBe('Cấp cứu thành công! Bạn trai đã hồi sinh thần kỳ!');
  });

  it('restores affection when affection was the fatal stat', () => {
    interceptDeath('affection');
    useGameStore.getState().reviveBoyfriendSuccess();
    expect(useGameStore.getState().stats.affection).toBe(20);
  });

  it('is a no-op when no revival is in progress', () => {
    const before = useGameStore.getState().stats;
    useGameStore.getState().reviveBoyfriendSuccess();
    expect(useGameStore.getState().stats).toEqual(before);
    expect(useGameStore.getState().hasUsedRevival).toBe(false);
  });

  it('the run can resume: a drawn card can be played after a win', () => {
    interceptDeath('sanity');
    useGameStore.getState().reviveBoyfriendSuccess();
    useGameStore.setState({ currentCard: card('c2', { sanity: 10 }) });
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().stats.sanity).toBe(30);
  });
});

describe('reviveBoyfriendFail', () => {
  it('falls through to standard Game Over with a random ending for the stat', () => {
    interceptDeath('energy');
    useGameStore.getState().reviveBoyfriendFail();
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(true);
    expect(s.isRevivalActive).toBe(false);
    expect(s.hasUsedRevival).toBe(true);
    expect(s.gameOverCause).toBe('energy');
    expect(deathsForStat('energy').map((d) => d.id)).toContain(s.deathId);
    expect(s.lastReaction).toBeNull();
  });

  it('persists a newly found death ending', () => {
    interceptDeath('sanity');
    useGameStore.getState().reviveBoyfriendFail();
    const s = useGameStore.getState();
    expect(s.unlockedDeathIds).toContain(s.deathId!);
  });

  it('is a no-op when no revival is in progress', () => {
    useGameStore.getState().reviveBoyfriendFail();
    expect(useGameStore.getState().isGameOver).toBe(false);
    expect(useGameStore.getState().hasUsedRevival).toBe(false);
  });
});

describe('one-shot + restart semantics', () => {
  it('a second death in the same run is a hard Game Over', () => {
    interceptDeath('energy');
    useGameStore.getState().reviveBoyfriendSuccess();
    // Resume the run: the rescue is resolved (not active) but the one-shot is
    // spent, so the next fatal stat is a hard Game Over.
    resetStore({
      hasUsedRevival: true,
      isRevivalActive: false,
      pendingDeathStat: null,
      stats: { energy: 0, affection: 50, sanity: 50, wallet: 50 },
      currentCard: null,
    });
    useGameStore.setState({ currentCard: card('c2', { energy: -5 }) });
    useGameStore.getState().applyChoice('LEFT');
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(true);
    expect(s.isRevivalActive).toBe(false);
  });

  it('failing the revival still spends the one-shot', () => {
    interceptDeath('wallet');
    useGameStore.getState().reviveBoyfriendFail();
    expect(useGameStore.getState().hasUsedRevival).toBe(true);
  });

  it('restartGame resets the revival one-shot for the next run', () => {
    interceptDeath('energy');
    useGameStore.getState().reviveBoyfriendFail();
    useGameStore.getState().restartGame([card('a'), card('b')]);
    const s = useGameStore.getState();
    expect(s.hasUsedRevival).toBe(false);
    expect(s.isRevivalActive).toBe(false);
    expect(s.pendingDeathStat).toBeNull();
    expect(s.isGameOver).toBe(false);
  });
});
