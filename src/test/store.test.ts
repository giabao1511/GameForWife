import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore, loadMissCount } from '@/store/useGameStore';
import { CHAPTER1_CARDS } from '@/data/cards/chapter1';
import { COMFORT_MESSAGES } from '@/data/comfortMessages';
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
    currentScreen: 'title',
    turns: 0,
    activeChapter: 'CH1_DATING',
    activeTimeSlot: 'MORNING',
    currentCard: null,
    isGameOver: false,
    gameOverCause: null,
    recentCardIds: [],
    previewModifiers: null,
    lastReaction: null,
    hasUsedRevival: false,
    isRevivalActive: false,
    pendingDeathStat: null,
    missCount: 0,
    lastComfortMessage: null,
    isSendMissOpen: false,
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
  it('intercepts the first death with the Emergency Revival instead of instant game over', () => {
    resetStore({
      stats: { energy: 10, affection: 50, sanity: 50, wallet: 50 },
      currentCard: card('c1', 'MORNING', { energy: -10 }),
    });
    useGameStore.getState().applyChoice('LEFT');
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(false);
    expect(s.isRevivalActive).toBe(true);
    expect(s.pendingDeathStat).toBe('energy');
    expect(s.gameOverCause).toBeNull();
    expect(s.currentCard).toBeNull();
  });

  it('falls through to standard game over when the revival is already spent', () => {
    resetStore({
      hasUsedRevival: true,
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

describe('Gửi Nỗi Nhớ (digital hug)', () => {
  const LS_MISS_KEY = 'bf_sim_miss_count';

  beforeEach(() => {
    localStorage.removeItem(LS_MISS_KEY);
  });

  it('increments the counter and persists it to localStorage', () => {
    const msg = useGameStore.getState().sendMissSignal();
    const s = useGameStore.getState();
    expect(s.missCount).toBe(1);
    expect(msg).toBe(s.lastComfortMessage);
    expect(msg).toBeTypeOf('string');
    expect(msg.length).toBeGreaterThan(0);
    expect(loadMissCount()).toBe(1);
  });

  it('returns a message that is always one of the known comfort lines', () => {
    const msg = useGameStore.getState().sendMissSignal();
    expect(COMFORT_MESSAGES).toContain(msg);
  });

  it('never repeats the same message back-to-back', () => {
    useGameStore.setState({ missCount: 0, lastComfortMessage: null });
    const first = useGameStore.getState().sendMissSignal();
    // Force the same line to be picked again by seeding it as "last".
    useGameStore.setState({ lastComfortMessage: first });
    const second = useGameStore.getState().sendMissSignal();
    expect(second).not.toBe(first);
  });

  it('openSendMiss / closeSendMiss toggle the widget visibility', () => {
    expect(useGameStore.getState().isSendMissOpen).toBe(false);
    useGameStore.getState().openSendMiss();
    expect(useGameStore.getState().isSendMissOpen).toBe(true);
    useGameStore.getState().closeSendMiss();
    expect(useGameStore.getState().isSendMissOpen).toBe(false);
  });

  it('hydrateFromStorage reads the persisted hug count back into the store', () => {
    localStorage.setItem(LS_MISS_KEY, '7');
    useGameStore.setState({ missCount: 0 });
    useGameStore.getState().hydrateFromStorage();
    expect(useGameStore.getState().missCount).toBe(7);
  });
});

describe('Title / Menu navigation', () => {
  it('starts on the title screen by default', () => {
    expect(useGameStore.getState().currentScreen).toBe('title');
  });

  it('startGame begins a fresh Day 1 run when none is in progress', () => {
    resetStore({ currentCard: null, turns: 0, isGameOver: false, isVictory: false });
    useGameStore.getState().startGame();
    const s = useGameStore.getState();
    expect(s.currentScreen).toBe('playing');
    expect(s.day).toBe(1);
    expect(s.turns).toBe(0);
  });

  it('startGame resumes an ongoing run instead of resetting it', () => {
    resetStore({
      currentCard: null,
      turns: 5,
      day: 3,
      isGameOver: false,
      isVictory: false,
      stats: { energy: 10, affection: 90, sanity: 40, wallet: 70 },
    });
    useGameStore.getState().startGame();
    const s = useGameStore.getState();
    expect(s.currentScreen).toBe('playing');
    expect(s.day).toBe(3);
    expect(s.turns).toBe(5);
    expect(s.stats.energy).toBe(10);
  });

  it('startGame resets a finished run to a fresh Day 1 before entering play', () => {
    resetStore({ turns: 44, day: 15, isVictory: true, isGameOver: false });
    useGameStore.getState().startGame();
    const s = useGameStore.getState();
    expect(s.currentScreen).toBe('playing');
    expect(s.day).toBe(1);
    expect(s.turns).toBe(0);
    expect(s.isVictory).toBe(false);
  });

  it('returnToTitle goes back to the menu and keeps the run', () => {
    resetStore({ turns: 5, day: 3, currentScreen: 'playing' });
    useGameStore.getState().returnToTitle();
    const s = useGameStore.getState();
    expect(s.currentScreen).toBe('title');
    expect(s.day).toBe(3);
    expect(s.turns).toBe(5);
  });

  it('setScreen navigates to sub-screens', () => {
    useGameStore.getState().setScreen('how_to_play');
    expect(useGameStore.getState().currentScreen).toBe('how_to_play');
    useGameStore.getState().setScreen('about');
    expect(useGameStore.getState().currentScreen).toBe('about');
    useGameStore.getState().returnToTitle();
    expect(useGameStore.getState().currentScreen).toBe('title');
  });
});
