'use client';

import { create } from 'zustand';
import type {
  ChapterId,
  GameCard,
  GameStats,
  InventoryItem,
  InventoryItemId,
  StatKey,
  StatModifiers,
  SwipeDirection,
  TimeSlot,
  UpOutcome,
} from '@/data/types';
import { GLOBAL_UP_FALLBACK_OUTCOMES } from '@/data/upOutcomes';
import { deathsForStat, type DeathId } from '@/data/deaths';
import { MEMORIES_DATA, type MemoryItem } from '@/data/memories';
import { getCurrentTimeSlot } from '@/lib/timeSlot';
import { haptic } from '@/lib/haptics';
import { playVoiceVictory, playItemPop } from '@/lib/audio';

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const INITIAL_STATS: GameStats = { energy: 50, affection: 50, sanity: 50, wallet: 50 };

/** Surviving 14 full days (reaching Day 15) means the run is won. */
export const VICTORY_DAY = 15;

const LS_DEATHS_KEY = 'bf_sim_unlocked_deaths';
const LS_VOUCHERS_KEY = 'bf_sim_redeemed_vouchers';
const LS_MEMORIES_KEY = 'bf_sim_unlocked_memories';
/** Milestone Voucher Wallet state (distinct from the victory-only love vouchers). */
const LS_WALLET_KEY = 'bf_sim_vouchers_state';

/** Per-voucher redemption state, persisted to localStorage as a JSON object. */
export type VoucherWallet = Record<
  string,
  { isRedeemed: boolean; redeemedAt?: string }
>;

function loadWallet(): VoucherWallet {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LS_WALLET_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as VoucherWallet) : {};
  } catch {
    return {};
  }
}

function saveWallet(wallet: VoucherWallet): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_WALLET_KEY, JSON.stringify(wallet));
  } catch {
    // Storage may be unavailable (private mode) — in-memory state still works.
  }
}

function loadLocal(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveLocal(key: string, value: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode) — the in-memory state still works.
  }
}

/** Hydrated collection of unlocked death endings (localStorage-backed). */
export function loadUnlockedDeaths(): DeathId[] {
  return loadLocal(LS_DEATHS_KEY);
}

/** Hydrated collection of redeemed vouchers (localStorage-backed). */
export function loadRedeemedVouchers(): string[] {
  return loadLocal(LS_VOUCHERS_KEY);
}

/** Hydrated collection of unlocked memory photos (localStorage-backed). */
export function loadUnlockedMemories(): string[] {
  return loadLocal(LS_MEMORIES_KEY);
}

/** Weighted random pick over outcomes. Generic so callers may add extra fields. */
export function rollUpOutcome<T extends UpOutcome>(outcomes: readonly T[]): T {
  const total = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let r = Math.random() * total;
  for (const o of outcomes) {
    r -= o.weight;
    if (r < 0) return o;
  }
  return outcomes[outcomes.length - 1];
}

function makeItem(id: InventoryItemId, data: Omit<InventoryItem, 'id' | 'count'> & { count?: number }): InventoryItem {
  return { id, count: 1, ...data };
}

/** Fresh inventory per run (used by initial state, restart, and tests). */
export function defaultInventory(): Record<InventoryItemId, InventoryItem> {
  return {
    BOBA: makeItem('BOBA', {
      name: 'Trà sữa full topping',
      icon: '🧋',
      count: 2,
      description: 'Mồi ngon: +25 Cưng chiều, +15 Pin, -10 Ví tiền.',
      modifiers: { affection: 25, energy: 15, wallet: -10 },
      effectType: 'INSTANT_STATS',
    }),
    PS5: makeItem('PS5', {
      name: 'Vé chơi game tự do',
      icon: '🎮',
      count: 1,
      description: 'Thả anh một trận: +35 Pin, -15 Cưng chiều.',
      modifiers: { energy: 35, affection: -15 },
      effectType: 'INSTANT_STATS',
    }),
    PUPPY_EYES: makeItem('PUPPY_EYES', {
      name: 'Ánh mắt nũng nịu',
      icon: '🥺',
      count: 2,
      description: 'Lấp lánh nhìn anh: chặn mọi lần Cưng chiều giảm ở lượt kế tiếp.',
      modifiers: {},
      effectType: 'SHIELD_AFFECTION',
    }),
  };
}

export interface GameStore {
  stats: GameStats;
  day: number;
  turns: number;
  activeChapter: ChapterId;
  activeTimeSlot: TimeSlot;
  currentCard: GameCard | null;
  isGameOver: boolean;
  isVictory: boolean;
  gameOverCause: StatKey | null;
  /** The specific humorous ending chosen for this death (one of the stat's two). */
  deathId: DeathId | null;
  recentCardIds: string[];
  previewModifiers: StatModifiers | null;
  /** True while the card is being dragged Up (unknown outcome preview). */
  previewUnknown: boolean;
  lastReaction: string | null;
  /** Sum of the applied stat modifiers this turn (drives the tingle direction). */
  lastStatDelta: number | null;
  inventory: Record<InventoryItemId, InventoryItem>;
  /** One-shot shield: the next choice cannot reduce affection. */
  activeShield: boolean;
  /** Deterministic next card (chained narrative); consumed by drawNextCard. */
  nextChainedCardId: string | null;
  unlockedDeathIds: DeathId[];
  redeemedVoucherIds: string[];
  /** Milestone Voucher Wallet (persisted across runs under bf_sim_vouchers_state). */
  voucherWallet: VoucherWallet;
  /** Memory photo ids already unlocked, persisted across runs (localStorage-backed). */
  unlockedMemoryIds: string[];
  /** Set when a new memory unlocks this turn — drives the celebratory modal. */
  newlyUnlockedMemory: MemoryItem | null;
  isDeathGalleryOpen: boolean;
  /** Scrapbook (photo album) modal visibility. */
  isScrapbookOpen: boolean;
  /** Milestone Voucher Wallet modal visibility. */
  isVoucherWalletOpen: boolean;

  applyChoice: (direction: SwipeDirection) => void;
  useItem: (itemId: InventoryItemId) => void;
  setPreviewModifiers: (modifiers: StatModifiers | null, unknown?: boolean) => void;
  setTimeSlot: (slot: TimeSlot) => void;
  drawNextCard: (deck: GameCard[]) => void;
  restartGame: (deck: GameCard[]) => void;
  recordDeath: (deathId: DeathId) => void;
  /** Victory-only love voucher (Day-15 reward, separate from the wallet). */
  redeemLoveVoucher: (voucherId: string) => void;
  /** Redeem a milestone Voucher Wallet coupon; records ISO timestamp + persists. */
  redeemVoucher: (voucherId: string) => void;
  /** Open the Voucher Wallet modal. */
  openVoucherWallet: () => void;
  /** Close the Voucher Wallet modal. */
  closeVoucherWallet: () => void;
  /** Clear all redeemed vouchers (in-memory + localStorage) so they can be reused. */
  resetVouchers: () => void;
  toggleDeathGallery: () => void;
  /** Open / close the Memories Scrapbook album. */
  openScrapbook: () => void;
  closeScrapbook: () => void;
  /** Dismiss the one-shot "newly unlocked" memory popup (the photo stays unlocked). */
  dismissNewlyUnlockedMemory: () => void;
  /** Dev shortcut: skip straight to the Day 15 victory screen. No-op after game over. */
  triggerInstantVictory: () => void;
  /**
   * One-shot, post-mount hydration of client-only state (localStorage deaths
   * + vouchers, and the real time slot). Kept out of initial state so SSR and
   * the first client render stay identical — call it once on mount.
   */
  hydrateFromStorage: () => void;
}

function applyModifiers(stats: GameStats, modifiers: StatModifiers): GameStats {
  const next = { ...stats };
  (Object.keys(modifiers) as StatKey[]).forEach((key) => {
    next[key] = clamp(next[key] + (modifiers[key] ?? 0));
  });
  return next;
}

/** Deck source lives outside the store so the core stays testable:
 * callers pass the full card deck to `drawNextCard` / `restartGame`. */
export const useGameStore = create<GameStore>((set, get) => ({
  stats: { ...INITIAL_STATS },
  day: 1,
  turns: 0,
  activeChapter: 'CH1_DATING',
  // Deterministic on both server and client — the real slot is applied once,
  // after mount, by hydrateFromStorage() (getCurrentTimeSlot() is local-time
  // and would otherwise diverge from the server render).
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
  lastStatDelta: null,
  inventory: defaultInventory(),
  activeShield: false,
  nextChainedCardId: null,
  unlockedDeathIds: [],
  redeemedVoucherIds: [],
  voucherWallet: {},
  unlockedMemoryIds: [],
  newlyUnlockedMemory: null,
  isDeathGalleryOpen: false,
  isScrapbookOpen: false,
  isVoucherWalletOpen: false,

  applyChoice: (direction) => {
    const state = get();
    if (state.isGameOver || !state.currentCard) return;

    const card = state.currentCard;

    // Resolve modifiers + narrative for this direction.
    let modifiers: StatModifiers;
    let narrative: string;
    if (direction === 'UP') {
      const outcomes = card.upChoice?.possibleOutcomes ?? GLOBAL_UP_FALLBACK_OUTCOMES;
      const roll = rollUpOutcome(outcomes);
      modifiers = roll.modifiers;
      narrative = roll.narrativeReaction;
    } else {
      const choice = direction === 'LEFT' ? card.leftChoice : card.rightChoice;
      modifiers = choice.modifiers;
      narrative = choice.narrativeReaction;
    }

    // Shield: the pending shield clamps any affection drop to 0, then resets.
    const shieldActive = state.activeShield;
    if (shieldActive && (modifiers.affection ?? 0) < 0) {
      modifiers = { ...modifiers, affection: 0 };
    }

    const stats = applyModifiers(state.stats, modifiers);
    const cause = (Object.keys(stats) as StatKey[]).find((k) => stats[k] <= 0) ?? null;
    const gameOver = cause !== null;
    const turns = state.turns + 1;
    const day = turns % 3 === 0 ? state.day + 1 : state.day;
    const recentCardIds = [...state.recentCardIds, card.id].slice(-3);
    // Chained narrative: choice-level link wins, then card-level.
    const choiceLevel =
      direction === 'UP' ? undefined : direction === 'LEFT' ? card.leftChoice.nextCardId : card.rightChoice.nextCardId;
    const nextChainedCardId = choiceLevel ?? card.nextCardId ?? null;
    const lastStatDelta = (Object.keys(modifiers) as StatKey[]).reduce(
      (sum, k) => sum + (modifiers[k] ?? 0),
      0,
    );

    // Death: pick one of the two humorous endings for the fatal stat at random.
    let deathId: DeathId | null = null;
    if (gameOver && cause) {
      const endings = deathsForStat(cause);
      deathId = endings[Math.floor(Math.random() * endings.length)].id;
    }
    // Victory: reach day 15 alive. A stat that zeroes on this same turn is a loss.
    const isVictory = !gameOver && day >= VICTORY_DAY;

    // Memories Scrapbook: surviving to a milestone day unlocks a photo.
    // Evaluate against the *new* day so Day 3 / 7 / 10 / 14 trigger on the
    // turn that completes them. (Only the first unmet memory unlocks per turn —
    // days advance by one, so at most one can cross its threshold.)
    const unlockedMemoryIds = [...state.unlockedMemoryIds];
    let newlyUnlockedMemory: MemoryItem | null = null;
    const crossed = MEMORIES_DATA.find((m) => m.unlockDay <= day && !unlockedMemoryIds.includes(m.id));
    if (crossed) {
      unlockedMemoryIds.push(crossed.id);
      newlyUnlockedMemory = crossed;
      saveLocal(LS_MEMORIES_KEY, unlockedMemoryIds);
    }

    set({
      stats,
      day,
      turns,
      isGameOver: gameOver,
      isVictory,
      gameOverCause: cause,
      deathId,
      recentCardIds,
      lastReaction: gameOver || isVictory ? null : narrative,
      lastStatDelta: gameOver ? null : lastStatDelta,
      previewModifiers: null,
      previewUnknown: false,
      nextChainedCardId,
      // The shield only ever protects one choice — it is spent by resolution.
      activeShield: false,
      // Clear the card so the UI transitions out; the next one is filled by
      // drawNextCard(deck) when not gameOver (the deck lives in data, not the store).
      currentCard: null,
      unlockedMemoryIds,
      newlyUnlockedMemory,
    });

    // Haptics: double-pulse the moment the run ends in danger (Game Over), or
    // the moment a stat *drops into* the < 20 danger zone this turn.
    if (gameOver) {
      haptic.dangerPulse();
    } else if ((Object.keys(stats) as StatKey[]).some((k) => state.stats[k] >= 20 && stats[k] < 20)) {
      haptic.dangerPulse();
    }

    // Day-14 anniversary voice message — the winning turn, not the modal.
    if (isVictory) playVoiceVictory();

    // Persist the death collection only when a genuinely new ending is found.
    if (deathId && !state.unlockedDeathIds.includes(deathId)) {
      get().recordDeath(deathId);
    }
  },

  recordDeath: (deathId) => {
    const state = get();
    if (state.unlockedDeathIds.includes(deathId)) return;
    const unlockedDeathIds = [...state.unlockedDeathIds, deathId];
    set({ unlockedDeathIds });
    saveLocal(LS_DEATHS_KEY, unlockedDeathIds);
  },

  redeemLoveVoucher: (voucherId) => {
    const state = get();
    if (!state.isVictory || state.redeemedVoucherIds.includes(voucherId)) return;
    const redeemedVoucherIds = [...state.redeemedVoucherIds, voucherId];
    set({ redeemedVoucherIds });
    saveLocal(LS_VOUCHERS_KEY, redeemedVoucherIds);
  },

  /**
   * Redeem a milestone Voucher Wallet coupon. A coupon is usable from the
   * moment its day milestone is reached (day >= requiredDay) or on victory;
   * redeeming stamps it, records the ISO timestamp, and persists the wallet.
   */
  redeemVoucher: (voucherId) => {
    const state = get();
    if (state.voucherWallet[voucherId]?.isRedeemed) return;
    const voucherWallet: VoucherWallet = {
      ...state.voucherWallet,
      [voucherId]: { isRedeemed: true, redeemedAt: new Date().toISOString() },
    };
    set({ voucherWallet });
    saveWallet(voucherWallet);
    haptic.pop();
    playItemPop();
  },

  openVoucherWallet: () => set({ isVoucherWalletOpen: true }),
  closeVoucherWallet: () => set({ isVoucherWalletOpen: false }),

  toggleDeathGallery: () => set((s) => ({ isDeathGalleryOpen: !s.isDeathGalleryOpen })),

  openScrapbook: () => set({ isScrapbookOpen: true }),
  closeScrapbook: () => set({ isScrapbookOpen: false }),
  dismissNewlyUnlockedMemory: () => set({ newlyUnlockedMemory: null }),

  resetVouchers: () => {
    set({ redeemedVoucherIds: [] });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(LS_VOUCHERS_KEY);
      } catch {
        // ignore
      }
    }
  },

  triggerInstantVictory: () => {
    const state = get();
    if (state.isGameOver || state.isVictory) return;
    set({
      isVictory: true,
      day: VICTORY_DAY,
      currentCard: null,
      previewModifiers: null,
      previewUnknown: false,
      lastReaction: null,
    });
  },

  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return;
    set({
      unlockedDeathIds: loadUnlockedDeaths(),
      redeemedVoucherIds: loadRedeemedVouchers(),
      voucherWallet: loadWallet(),
      unlockedMemoryIds: loadUnlockedMemories(),
    });
    // The deterministic initial slot ('MORNING') may differ from the player's
    // actual clock — switch (and let CardDeck re-draw) only when it does.
    const slot = getCurrentTimeSlot();
    if (get().activeTimeSlot !== slot) get().setTimeSlot(slot);
  },

  useItem: (itemId) => {
    const state = get();
    if (state.isGameOver) return;
    const item = state.inventory[itemId];
    if (!item || item.count <= 0) return;

    const inventory = {
      ...state.inventory,
      [itemId]: { ...item, count: item.count - 1 },
    };

    if (item.effectType === 'SHIELD_AFFECTION') {
      set({ inventory, activeShield: true });
      return;
    }
    const nextStats = applyModifiers(state.stats, item.modifiers);
    set({ inventory, stats: nextStats });
    // The item can also drop a stat into the danger zone — same "oh no" pulse.
    if ((Object.keys(nextStats) as StatKey[]).some((k) => state.stats[k] >= 20 && nextStats[k] < 20)) {
      haptic.dangerPulse();
    }
  },

  setPreviewModifiers: (modifiers, unknown = false) =>
    set({ previewModifiers: modifiers, previewUnknown: unknown }),

  setTimeSlot: (slot) =>
    set({ activeTimeSlot: slot, recentCardIds: [], currentCard: null, nextChainedCardId: null, previewModifiers: null, previewUnknown: false }),

  drawNextCard: (deck) => {
    const state = get();
    if (state.isGameOver || state.isVictory) return;

    // Deterministic chained card wins over the random draw.
    if (state.nextChainedCardId) {
      const chained = deck.find((c) => c.id === state.nextChainedCardId);
      set({ nextChainedCardId: null });
      if (chained) {
        set({ currentCard: chained });
        return;
      }
      // Unknown link (backend data may differ) — fall through to random draw.
    }

    let pool = deck.filter(
      (c) => c.chapterId === state.activeChapter && c.timeSlot === state.activeTimeSlot,
    );
    if (pool.length === 0) pool = deck.filter((c) => c.chapterId === state.activeChapter);

    const fresh = pool.filter((c) => !state.recentCardIds.includes(c.id));
    const candidates = fresh.length > 0 ? fresh : pool;
    if (candidates.length === 0) return;

    const card = candidates[Math.floor(Math.random() * candidates.length)];
    set({ currentCard: card });
  },

  restartGame: (deck) => {
    set({
      stats: { ...INITIAL_STATS },
      day: 1,
      turns: 0,
      activeChapter: 'CH1_DATING',
      activeTimeSlot: getCurrentTimeSlot(),
      currentCard: null,
      isGameOver: false,
      isVictory: false,
      gameOverCause: null,
      deathId: null,
      lastStatDelta: null,
      recentCardIds: [],
      previewModifiers: null,
      previewUnknown: false,
      lastReaction: null,
      inventory: defaultInventory(),
      activeShield: false,
      nextChainedCardId: null,
      // The collections survive across runs — re-hydrate so a fresh session
      // keeps endings and photos unlocked on prior play-throughs.
      unlockedDeathIds: loadUnlockedDeaths(),
      redeemedVoucherIds: loadRedeemedVouchers(),
      voucherWallet: loadWallet(),
      unlockedMemoryIds: loadUnlockedMemories(),
      newlyUnlockedMemory: null,
    });
    get().drawNextCard(deck);
  },
}));
