import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore, defaultInventory, loadUnlockedDeaths, loadRedeemedVouchers } from '@/store/useGameStore';
import { deathsForStat } from '@/data/deaths';
import type { GameCard } from '@/data/types';

const LS_DEATHS = 'bf_sim_unlocked_deaths';
const LS_VOUCHERS = 'bf_sim_redeemed_vouchers';

function card(id: string, mods: Partial<GameCard['leftChoice']['modifiers']> = {}): GameCard {
  return {
    id,
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'test',
    avatarMood: 'neutral',
    leftChoice: { text: 'L', modifiers: mods, narrativeReaction: 'rL' },
    rightChoice: { text: 'R', modifiers: mods, narrativeReaction: 'rR' },
  };
}

function resetStore(overrides: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  localStorage.removeItem(LS_DEATHS);
  localStorage.removeItem(LS_VOUCHERS);
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
    previewUnknown: false,
    lastReaction: null,
    inventory: defaultInventory(),
    activeShield: false,
    nextChainedCardId: null,
    unlockedDeathIds: [],
    redeemedVoucherIds: [],
    isDeathGalleryOpen: false,
    ...overrides,
  } as never);
}

beforeEach(resetStore);

describe('victory trigger', () => {
  it('sets isVictory when day reaches 15', () => {
    resetStore({ day: 14, turns: 41, currentCard: card('c1') });
    useGameStore.getState().applyChoice('LEFT');
    const s = useGameStore.getState();
    expect(s.day).toBe(15);
    expect(s.isVictory).toBe(true);
    expect(s.isGameOver).toBe(false);
    expect(s.currentCard).toBeNull();
  });

  it('a stat zero on the final day still wins with game over, not victory', () => {
    resetStore({
      day: 14,
      turns: 41,
      stats: { energy: 10, affection: 50, sanity: 50, wallet: 50 },
      currentCard: card('c1', { energy: -10 }),
    });
    useGameStore.getState().applyChoice('LEFT');
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(true);
    expect(s.isVictory).toBe(false);
  });

  it('drawNextCard is a no-op after victory', () => {
    resetStore({ day: 14, turns: 41, currentCard: card('c1') });
    useGameStore.getState().applyChoice('LEFT');
    useGameStore.getState().drawNextCard([card('c2')]);
    expect(useGameStore.getState().currentCard).toBeNull();
  });

  it('restartGame clears victory but keeps the death collection', () => {
    resetStore({ day: 14, turns: 41, currentCard: card('c1') });
    useGameStore.getState().recordDeath('ENERGY_DEPLETED');
    useGameStore.getState().applyChoice('LEFT');
    expect(useGameStore.getState().isVictory).toBe(true);
    useGameStore.getState().restartGame([card('c1')]);
    const s = useGameStore.getState();
    expect(s.isVictory).toBe(false);
    expect(s.day).toBe(1);
    expect(s.unlockedDeathIds).toEqual(['ENERGY_DEPLETED']);
  });
});

describe('death endings & gallery persistence', () => {
  it('picking a fatal stat sets deathId to one of that stat two endings', () => {
    const energyEndings = deathsForStat('energy').map((d) => d.id);
    resetStore({
      stats: { energy: 5, affection: 50, sanity: 50, wallet: 50 },
      currentCard: card('c1', { energy: -10 }),
    });
    useGameStore.getState().applyChoice('LEFT');
    const s = useGameStore.getState();
    expect(s.isGameOver).toBe(true);
    expect(s.gameOverCause).toBe('energy');
    expect(energyEndings).toContain(s.deathId);
    expect(s.unlockedDeathIds).toContain(s.deathId!);
  });

  it('recordDeath deduplicates and persists to localStorage', () => {
    const { recordDeath } = useGameStore.getState();
    recordDeath('WALLET_DEPLETED');
    recordDeath('WALLET_DEPLETED');
    recordDeath('AFFECTION_DEPLETED');
    const s = useGameStore.getState();
    expect(s.unlockedDeathIds).toEqual(['WALLET_DEPLETED', 'AFFECTION_DEPLETED']);
    expect(JSON.parse(localStorage.getItem(LS_DEATHS)!)).toEqual(['WALLET_DEPLETED', 'AFFECTION_DEPLETED']);
  });

  it('loadUnlockedDeaths reads storage and falls back to [] when empty', () => {
    localStorage.setItem(LS_DEATHS, JSON.stringify(['ENERGY_DEPLETED', 'SANITY_DEPLETED']));
    expect(loadUnlockedDeaths()).toEqual(['ENERGY_DEPLETED', 'SANITY_DEPLETED']);
    localStorage.removeItem(LS_DEATHS);
    expect(loadUnlockedDeaths()).toEqual([]);
  });

  it('restartGame re-hydrates the death collection from localStorage', () => {
    localStorage.setItem(LS_DEATHS, JSON.stringify(['ENERGY_DEPLETED', 'SANITY_DEPLETED']));
    useGameStore.getState().restartGame([card('c1')]);
    expect(useGameStore.getState().unlockedDeathIds).toEqual(['ENERGY_DEPLETED', 'SANITY_DEPLETED']);
  });

  it('loadUnlockedDeaths tolerates corrupt storage', () => {
    localStorage.setItem(LS_DEATHS, '{not json');
    expect(loadUnlockedDeaths()).toEqual([]);
    localStorage.removeItem(LS_DEATHS);
  });

  it('toggleDeathGallery opens and closes', () => {
    useGameStore.getState().toggleDeathGallery();
    expect(useGameStore.getState().isDeathGalleryOpen).toBe(true);
    useGameStore.getState().toggleDeathGallery();
    expect(useGameStore.getState().isDeathGalleryOpen).toBe(false);
  });
});

describe('voucher redemption', () => {
  it('redeemLoveVoucher marks a voucher and deduplicates', () => {
    resetStore({ isVictory: true });
    const { redeemLoveVoucher } = useGameStore.getState();
    redeemLoveVoucher('OBEY_DAY');
    redeemLoveVoucher('OBEY_DAY');
    redeemLoveVoucher('MASSAGE_30');
    expect(useGameStore.getState().redeemedVoucherIds).toEqual(['OBEY_DAY', 'MASSAGE_30']);
  });

  it('persists redeemed vouchers to localStorage', () => {
    resetStore({ isVictory: true });
    useGameStore.getState().redeemLoveVoucher('TEA_MEAL');
    expect(JSON.parse(localStorage.getItem(LS_VOUCHERS)!)).toEqual(['TEA_MEAL']);
    expect(loadRedeemedVouchers()).toEqual(['TEA_MEAL']);
  });

  it('redeeming is a no-op outside victory', () => {
    useGameStore.getState().redeemLoveVoucher('DRIVE_AIR');
    expect(useGameStore.getState().redeemedVoucherIds).toEqual([]);
  });
});

describe('resetVouchers', () => {
  it('clears redeemed vouchers and localStorage, allowing re-redemption', () => {
    resetStore({ isVictory: true });
    useGameStore.getState().redeemLoveVoucher('OBEY_DAY');
    expect(useGameStore.getState().redeemedVoucherIds).toEqual(['OBEY_DAY']);

    useGameStore.getState().resetVouchers();
    expect(useGameStore.getState().redeemedVoucherIds).toEqual([]);
    expect(localStorage.getItem(LS_VOUCHERS)).toBe(null);

    useGameStore.getState().redeemLoveVoucher('MASSAGE_30');
    expect(useGameStore.getState().redeemedVoucherIds).toEqual(['MASSAGE_30']);
  });
});

describe('triggerInstantVictory (dev shortcut)', () => {
  it('jumps to Day 15 victory from a mid-run state', () => {
    resetStore({ day: 3, turns: 7, currentCard: card('c1') });
    useGameStore.getState().triggerInstantVictory();
    const s = useGameStore.getState();
    expect(s.isVictory).toBe(true);
    expect(s.day).toBe(15);
    expect(s.currentCard).toBeNull();
    expect(s.isGameOver).toBe(false);
  });

  it('is a no-op after game over', () => {
    resetStore({ isGameOver: true, gameOverCause: 'wallet', currentCard: card('c1') });
    useGameStore.getState().triggerInstantVictory();
    const s = useGameStore.getState();
    expect(s.isVictory).toBe(false);
    expect(s.day).toBe(1);
  });
});
