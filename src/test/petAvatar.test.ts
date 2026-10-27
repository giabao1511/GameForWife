import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore, defaultInventory } from '@/store/useGameStore';

function reset(overrides: Record<string, unknown> = {}) {
  // Pin the stat line so "+1" assertions are deterministic.
  useGameStore.setState({
    stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 },
    lastPettedDay: -1,
    isGameOver: false,
    isVictory: false,
    day: 1,
    lastReaction: null,
    inventory: defaultInventory(),
    ...overrides,
  } as never);
}

beforeEach(() => {
  reset();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('petAvatar', () => {
  it('roll < 0.5 → +1 Cưng chiều (affection) and returns the VN toast', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const toast = useGameStore.getState().petAvatar();
    expect(toast).toBe('Được xoa đầu: +1 Cưng chiều ❤️');
    expect(useGameStore.getState().stats.affection).toBe(51); // was 50
    expect(useGameStore.getState().stats.energy).toBe(50);
    expect(useGameStore.getState().lastPettedDay).toBe(useGameStore.getState().day);
  });

  it('roll >= 0.5 → +1 Pin (energy) and returns the VN toast', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const toast = useGameStore.getState().petAvatar();
    expect(toast).toBe('Được xoa đầu: +1 Pin ❤️');
    expect(useGameStore.getState().stats.energy).toBe(51);
    expect(useGameStore.getState().stats.affection).toBe(50);
  });

  it('second pat same day → null (no reward, no toast) — cooldown', () => {
    reset({ lastPettedDay: 3, day: 3 });
    expect(useGameStore.getState().petAvatar()).toBeNull();
    // Cooldown also leaves stats and lastReaction untouched.
    expect(useGameStore.getState().stats).toEqual({ energy: 50, affection: 50, sanity: 50, wallet: 50 });
    expect(useGameStore.getState().lastReaction).toBeNull();
  });

  it('next day resets the cooldown', () => {
    reset({ lastPettedDay: 3, day: 4 });
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(useGameStore.getState().petAvatar()).not.toBeNull();
    expect(useGameStore.getState().lastPettedDay).toBe(4);
  });

  it('game over → null (Review Focus #1)', () => {
    reset({ isGameOver: true });
    expect(useGameStore.getState().petAvatar()).toBeNull();
  });

  it('victory → null (no rewards on a finished run)', () => {
    reset({ isVictory: true });
    expect(useGameStore.getState().petAvatar()).toBeNull();
  });

  it('sets lastReaction to the toast so CardDeck shows it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    useGameStore.getState().petAvatar();
    expect(useGameStore.getState().lastReaction).toContain('Được xoa đầu');
  });
});
