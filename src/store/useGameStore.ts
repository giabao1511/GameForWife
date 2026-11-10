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
import { getActivePeriod } from '@/lib/timeContext';
import { haptic } from '@/lib/haptics';
import { playVoiceVictory, playItemPop, playLetterChime, playHeartbeatChime } from '@/lib/audio';
import { TIME_LATENIGHT_SPECIAL_ID } from '@/data/timeCards';
import { getRandomComfortMessage } from '@/data/comfortMessages';
import {
  loadThemeConfig,
  saveThemeConfig,
  type AppTheme,
  type AppThemeId,
} from '@/data/themes';

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const INITIAL_STATS: GameStats = { energy: 50, affection: 50, sanity: 50, wallet: 50 };

/** Surviving 14 full days (reaching Day 15) means the run is won. */
export const VICTORY_DAY = 15;

const LS_DEATHS_KEY = 'bf_sim_unlocked_deaths';
const LS_VOUCHERS_KEY = 'bf_sim_redeemed_vouchers';
const LS_MEMORIES_KEY = 'bf_sim_unlocked_memories';
/** Theme preference (bf_sim_theme) is read/written by helpers in src/data/themes.ts. */
/** Milestone Voucher Wallet state (distinct from the victory-only love vouchers). */
const LS_WALLET_KEY = 'bf_sim_vouchers_state';
/** Time Capsule read-letter state (military letters opened across real-world time). */
const LS_READ_LETTERS_KEY = 'bf_sim_read_letters';
/** "Gửi Nỗi Nhớ" total hug counter (persists across sessions + runs). */
const LS_MISS_COUNT_KEY = 'bf_sim_miss_count';

/** Hydrated total "Nỗi nhớ đã gửi" counter (localStorage-backed). */
export function loadMissCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(LS_MISS_COUNT_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveMissCount(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_MISS_COUNT_KEY, String(count));
  } catch {
    // Storage may be unavailable (private mode) — the in-memory state still works.
  }
}

/** Per-letter read state, persisted to localStorage under bf_sim_read_letters. */
export type ReadLetters = Record<string, { isRead: boolean; readAt?: string }>;

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

/** Hydrated Time Capsule read-letter map (localStorage-backed). */
export function loadReadLetters(): ReadLetters {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LS_READ_LETTERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as ReadLetters) : {};
  } catch {
    return {};
  }
}

function saveReadLetters(readLetters: ReadLetters): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_READ_LETTERS_KEY, JSON.stringify(readLetters));
  } catch {
    // Storage may be unavailable (private mode) — in-memory state still works.
  }
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

export type GameScreenView = 'title' | 'playing' | 'how_to_play' | 'about';

/**
 * Cosmetic chibi outfit. 'civilian' is the default; 'military' (Áo lính &
 * nón tai bèo) auto-equips while the Time Capsule mailbox is open and can be
 * force-toggled from the star badge easter egg on the Title screen.
 */
export type AvatarSkin = 'civilian' | 'military';

export interface GameStore {
  stats: GameStats;
  day: number;
  /** Top-level view the app is showing (title / menu / gameplay). */
  currentScreen: GameScreenView;
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
  /**
   * Late-night special (TIME_LATENIGHT_SPECIAL_ID) already served this run.
   * Session-scoped by design — it must draw at most once per run and is
   * intentionally NOT persisted (restarts reset it, so a new run gets it).
   */
  lateNightSpecialDrawn: boolean;
  /** In-game day of the last granted head-pat reward (per-run cooldown). */
  lastPettedDay: number;
  /** Whether the one-shot Emergency Revival has been spent this run. */
  hasUsedRevival: boolean;
  /** True while the defibrillator CPR minigame is intercepting a death. */
  isRevivalActive: boolean;
  /** The stat that zeroed and is pending the revival outcome (or null). */
  pendingDeathStat: StatKey | null;

  // ── Time Capsule (military letters) ───────────────────────────
  /** True once the Time Capsule letter state has been hydrated from localStorage. */
  timeCapsuleHydrated: boolean;
  /** Per-letter read status (persisted under bf_sim_read_letters). */
  readLetters: ReadLetters;
  /** Time Capsule Mailbox modal visibility. */
  isTimeCapsuleOpen: boolean;
  /** The letter currently open in the reader view, or null when none. */
  selectedLetterId: string | null;
  /**
   * Cosmetic chibi outfit. Opens in the Time Capsule mailbox / letter reader
   * auto-equip 'military'; a manual toggle on the star badge forces the skin
   * for viewing letters without re-opening the capsule.
   */
  avatarSkin: AvatarSkin;
  /** Toggle the cosmetic skin (Title screen easter egg). */
  toggleAvatarSkin: () => void;

  // ── Theme & room customization ("Đổi Bối Cảnh & Chủ Đề") ────────
  /**
   * The player's manual theme pick (persisted under bf_sim_theme). This is the
   * authoritative value when real-time sync is OFF.
   */
  appThemeId: AppThemeId;
  /**
   * "Đồng bộ theo thời gian thực": when true the wall clock picks the theme
   * (pastel / sunset / starry_camp by hour) and the manual pick is parked.
   */
  themeSyncOn: boolean;
  /** Theme & room-customization modal visibility. */
  isThemeSelectorOpen: boolean;
  /** Choose a theme manually (sets appThemeId + persists to bf_sim_theme). */
  setAppTheme: (themeId: AppThemeId) => void;
  /** Toggle real-time clock-driven theme switching (persists). */
  setThemeSync: (on: boolean) => void;
  /** Open the theme & room-customization modal. */
  openThemeSelector: () => void;
  /** Close the theme & room-customization modal. */
  closeThemeSelector: () => void;

  // ── Gửi Nỗi Nhớ (digital hug / heartbeat) ────────────────────
  /** Total hugs sent to the camp (persisted under bf_sim_miss_count). */
  missCount: number;
  /** The last comfort message shown — keeps consecutive hugs fresh. */
  lastComfortMessage: string | null;
  /** Dedicated "Gửi nỗi nhớ" widget modal visibility. */
  isSendMissOpen: boolean;

  applyChoice: (direction: SwipeDirection) => void;
  /**
   * Emergency Revival outcome: the defibrillator won. Restores the fatal
   * stat to +20, marks the one-shot spent, clears the interception and
   * leaves the run alive so the normal draw lifecycle resumes.
   */
  reviveBoyfriendSuccess: () => void;
  /**
   * Emergency Revival outcome: the defibrillator lost. Marks the one-shot
   * spent and falls through to the standard Game Over flow for the
   * pending stat (with a humorous ending picked at random).
   */
  reviveBoyfriendFail: () => void;
  /**
   * Head-pat reward: +1 Cưng chiều OR +1 Pin (50/50) at most once per
   * in-game day. Returns the Vietnamese toast string when a reward was
   * granted (and stores it in lastReaction so the card bubble shows it),
   * or null on cooldown / finished runs (the visual reaction still plays).
   */
  petAvatar: () => string | null;
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

  /** Open the Time Capsule Mailbox modal. */
  openTimeCapsule: () => void;
  /** Close the Time Capsule Mailbox modal. */
  closeTimeCapsule: () => void;
  /** Set which letter is open in the reader view (null closes the reader). */
  setSelectedLetter: (id: string | null) => void;
  /**
   * Mark a letter as read: record the ISO timestamp, fire a haptic tick +
   * soft chime, and persist. Idempotent — an already-read letter is a no-op.
   */
  markLetterAsRead: (id: string) => void;

  /**
   * "Gửi Nỗi Nhớ": send one digital hug to the camp. Increments the
   * persistent counter, picks a fresh comfort message (never the last one),
   * persists the count, and fires the lub-dub heartbeat haptic + soft chime.
   * Returns the message that just landed (drives the card reveal).
   */
  sendMissSignal: () => string;
  /** Open the dedicated "Gửi nỗi nhớ" widget. */
  openSendMiss: () => void;
  /** Close the dedicated "Gửi nỗi nhớ" widget. */
  closeSendMiss: () => void;

  // ── Title / Menu navigation ─────────────────────────────────
  /** Set which top-level view is shown. */
  setScreen: (screen: GameScreenView) => void;
  /**
   * Enter gameplay. If there is an ongoing in-session run (progress made and
   * not finished) it is resumed as-is; otherwise a fresh Day 1 run is started.
   */
  startGame: () => void;
  /** Return to the Title / Menu screen (the run is kept alive in the store). */
  returnToTitle: () => void;
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
  currentScreen: 'title',
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
  lateNightSpecialDrawn: false,
  lastPettedDay: -1,
  hasUsedRevival: false,
  isRevivalActive: false,
  pendingDeathStat: null,
  // Time Capsule: deterministic on the server — the real read-letter map and
  // the "hydrated" flag are applied once, post-mount, by hydrateFromStorage().
  timeCapsuleHydrated: false,
  readLetters: {},
  isTimeCapsuleOpen: false,
  selectedLetterId: null,
  avatarSkin: 'civilian',
  // Theme: deterministic default so SSR + first paint match; the persisted pick
  // (and the sync toggle) is applied once, post-mount, by hydrateFromStorage().
  appThemeId: 'pastel',
  themeSyncOn: false,
  isThemeSelectorOpen: false,
  // Gửi Nỗi Nhớ: the true counter is hydrated once, post-mount, by
  // hydrateFromStorage() — the SSR render must stay deterministic (0).
  missCount: 0,
  lastComfortMessage: null,
  isSendMissOpen: false,

  applyChoice: (direction) => {
    const state = get();
    if (state.isGameOver || state.isRevivalActive || !state.currentCard) return;

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
    // Emergency Revival: the first fatal stat of a run is intercepted by the
    // defibrillator minigame instead of a hard Game Over.
    const revivalIntercepted = cause !== null && !state.hasUsedRevival;
    const gameOver = cause !== null && !revivalIntercepted;
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
    // Victory: reach day 15 alive. A stat that zeroes on this same turn is a
    // loss — even when that zero is intercepted by the revival (the run is not
    // safely over until the defibrillator decides).
    const isVictory = !gameOver && !revivalIntercepted && day >= VICTORY_DAY;

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
      // The standard Game Over modal stays silent while the revival is
      // intercepting; reviveBoyfriendFail() fills in the cause + ending.
      gameOverCause: gameOver ? cause : null,
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
      isRevivalActive: revivalIntercepted,
      pendingDeathStat: revivalIntercepted ? cause : null,
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

  /**
   * Emergency Revival WON: the defibrillator pulled the boyfriend back.
   * Restores the fatal stat to +20 (off the zero), spends the one-shot,
   * and clears the interception — the normal card-draw lifecycle resumes
   * (the card was cleared, so the deck draws the next one).
   */
  reviveBoyfriendSuccess: () => {
    const state = get();
    if (!state.isRevivalActive) return;
    const stat = state.pendingDeathStat;
    const stats = stat ? applyModifiers(state.stats, { [stat]: 20 }) : state.stats;
    set({
      stats,
      hasUsedRevival: true,
      isRevivalActive: false,
      pendingDeathStat: null,
      lastReaction: 'Cấp cứu thành công! Bạn trai đã hồi sinh thần kỳ!',
    });
  },

  /**
   * Emergency Revival LOST: the flatline won. Spends the one-shot and runs
   * the standard Game Over flow for the pending stat — including picking a
   * random humorous ending and persisting it if it is a first-timer.
   */
  reviveBoyfriendFail: () => {
    const state = get();
    if (!state.isRevivalActive) return;
    const stat = state.pendingDeathStat;
    const endings = stat ? deathsForStat(stat) : [];
    const deathId: DeathId | null =
      endings.length > 0 ? endings[Math.floor(Math.random() * endings.length)].id : null;
    set({
      isGameOver: true,
      gameOverCause: stat,
      deathId,
      hasUsedRevival: true,
      isRevivalActive: false,
      pendingDeathStat: null,
      lastReaction: null,
      lastStatDelta: null,
    });
    if (stat) haptic.dangerPulse();
    if (deathId && !state.unlockedDeathIds.includes(deathId)) get().recordDeath(deathId);
  },

  /**
   * Head-pat reward with per-day cooldown. One random roll decides both
   * the stat and the toast text so the bubble always matches what landed.
   */
  petAvatar: () => {
    const state = get();
    if (state.isGameOver || state.isVictory || state.isRevivalActive) return null;
    if (state.day === state.lastPettedDay) return null; // per-day cooldown
    const roll = Math.random();
    const affectionReward = roll < 0.5;
    const stats = applyModifiers(
      state.stats,
      affectionReward ? { affection: 1 } : { energy: 1 },
    );
    const toast = affectionReward
      ? 'Được xoa đầu: +1 Cưng chiều ❤️'
      : 'Được xoa đầu: +1 Pin ❤️';
    set({ stats, lastPettedDay: state.day, lastReaction: toast });
    return toast;
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

  openTimeCapsule: () => set({ isTimeCapsuleOpen: true, avatarSkin: 'military' }),
  closeTimeCapsule: () => set({ isTimeCapsuleOpen: false, selectedLetterId: null, avatarSkin: 'civilian' }),
  toggleAvatarSkin: () => set((s) => ({ avatarSkin: s.avatarSkin === 'civilian' ? 'military' : 'civilian' })),

  setAppTheme: (themeId) => {
    set({ appThemeId: themeId });
    saveThemeConfig({ theme: themeId, sync: get().themeSyncOn });
  },

  setThemeSync: (on) => {
    set({ themeSyncOn: on });
    saveThemeConfig({ theme: get().appThemeId, sync: on });
  },

  openThemeSelector: () => set({ isThemeSelectorOpen: true }),
  closeThemeSelector: () => set({ isThemeSelectorOpen: false }),

  setSelectedLetter: (id) => set({ selectedLetterId: id }),

  /**
   * Mark a letter read. Records the ISO timestamp, fires a haptic tick + a
   * soft chime, and persists the map. No-op (no sound, no haptic) when the
   * letter was already read, so the seal only "breaks" once.
   */
  markLetterAsRead: (id) => {
    const state = get();
    if (state.readLetters[id]?.isRead) return;
    const readLetters: ReadLetters = {
      ...state.readLetters,
      [id]: { isRead: true, readAt: new Date().toISOString() },
    };
    set({ readLetters });
    saveReadLetters(readLetters);
    haptic.pop();
    playLetterChime();
  },

  toggleDeathGallery: () => set((s) => ({ isDeathGalleryOpen: !s.isDeathGalleryOpen })),

  /**
   * Gửi Nỗi Nhớ — one digital hug: counter +1 (persisted), a fresh comfort
   * message (never the one just shown), the lub-dub heartbeat haptic, and a
   * soft two-note chime. Works outside the card lifecycle (no gameplay guard).
   */
  sendMissSignal: () => {
    const state = get();
    const missCount = state.missCount + 1;
    const lastComfortMessage = getRandomComfortMessage(state.lastComfortMessage);
    set({ missCount, lastComfortMessage });
    saveMissCount(missCount);
    haptic.heartbeatPulse();
    playHeartbeatChime();
    return lastComfortMessage;
  },

  openSendMiss: () => set({ isSendMissOpen: true }),
  closeSendMiss: () => set({ isSendMissOpen: false }),

  setScreen: (screen) => set({ currentScreen: screen }),

  /**
   * Enter gameplay. An ongoing in-session run (progress made, not yet
   * finished) is resumed as-is; anything else (a finished or fresh store)
   * is reset to a clean Day 1 first. The card itself is drawn by CardDeck
   * when the 'playing' screen mounts, so no deck is passed here.
   */
  startGame: () => {
    const state = get();
    const ongoing = state.turns > 0 && !state.isGameOver && !state.isVictory;
    if (!ongoing) state.restartGame([]);
    set({ currentScreen: 'playing' });
  },

  /** Return to the Title / Menu. The run stays alive in the store. */
  returnToTitle: () => set({ currentScreen: 'title' }),

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
      // Time Capsule read status (localStorage) + flip the deterministic flag
      // so components render the real countdown state from here on.
      readLetters: loadReadLetters(),
      timeCapsuleHydrated: true,
      // Gửi Nỗi Nhớ: the persistent hug counter (SSR stays 0 until this).
      missCount: loadMissCount(),
      // Theme preference (manual pick + real-time sync flag) from bf_sim_theme.
      ...(() => {
        const tc = loadThemeConfig();
        return { appThemeId: tc.theme, themeSyncOn: tc.sync };
      })(),
    });
    // The deterministic initial slot ('MORNING') may differ from the player's
    // actual clock — switch (and let CardDeck re-draw) only when it does.
    const slot = getCurrentTimeSlot();
    if (get().activeTimeSlot !== slot) get().setTimeSlot(slot);
  },

  useItem: (itemId) => {
    const state = get();
    if (state.isGameOver || state.isRevivalActive) return;
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
    const cause = (Object.keys(nextStats) as StatKey[]).find((k) => nextStats[k] <= 0) ?? null;
    // The one-shot interceptor treats item-caused death the same as choice
    // death: no hard Game Over on the first fatal stat of the run.
    const revivalIntercepted = cause !== null && !state.hasUsedRevival;
    set({
      inventory,
      stats: nextStats,
      isGameOver: cause !== null && !revivalIntercepted,
      isRevivalActive: revivalIntercepted,
      pendingDeathStat: revivalIntercepted ? cause : null,
    });
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

    // Late-night guarantee: when the active period is latenight and the
    // special hasn't been drawn this session, it is served first — even
    // ahead of a pending chained card (spec: "guaranteed as the first
    // drawn card" of a late session). Skipped when the deck lacks it.
    if (
      getActivePeriod() === 'latenight' &&
      !state.lateNightSpecialDrawn
    ) {
      const special = deck.find((c) => c.id === TIME_LATENIGHT_SPECIAL_ID);
      if (special) {
        set({ currentCard: special, lateNightSpecialDrawn: true });
        return;
      }
    }

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

    // Real-time period boost: 70% of draws prefer cards tagged for the
    // active period; otherwise fall back to the standard candidate pool.
    // Untagged legacy decks have an empty `matching` and behave as before.
    const period = getActivePeriod();
    const matching = candidates.filter((c) => c.preferredPeriod === period);
    const pick =
      matching.length > 0 && Math.random() < 0.7 ? matching : candidates;
    const card = pick[Math.floor(Math.random() * pick.length)];
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
      lateNightSpecialDrawn: false,
      lastPettedDay: -1,
      hasUsedRevival: false,
      isRevivalActive: false,
      pendingDeathStat: null,
    });
    get().drawNextCard(deck);
  },
}));
