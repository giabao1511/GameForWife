export type StatKey = 'energy' | 'affection' | 'sanity' | 'wallet';
export type StatModifiers = Partial<Record<StatKey, number>>;
export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type ChapterId = 'CH1_DATING' | 'CH2_COHABITATION' | 'CH3_FUTURE';

export type SwipeDirection = 'LEFT' | 'RIGHT' | 'UP';

export interface CardChoice {
  text: string;
  modifiers: StatModifiers;
  narrativeReaction: string;
  nextCardId?: string;
}

/** One possible result of swiping Up ("Bỏ mặc / Kệ anh"). */
export interface UpOutcome {
  weight: number;
  modifiers: StatModifiers;
  narrativeReaction: string;
}

export interface UpChoice {
  text: string;
  possibleOutcomes: UpOutcome[];
}

export type InventoryItemId = 'BOBA' | 'PS5' | 'PUPPY_EYES';

export type ItemEffectType = 'INSTANT_STATS' | 'SHIELD_AFFECTION';

export interface InventoryItem {
  id: InventoryItemId;
  name: string;
  icon: string;
  count: number;
  description: string;
  modifiers: StatModifiers;
  effectType?: ItemEffectType;
}

export type AvatarMood = 'neutral' | 'tired' | 'stressed' | 'happy' | 'flirty';

export interface GameCard {
  id: string;
  chapterId: ChapterId;
  timeSlot: TimeSlot;
  situation: string;
  avatarMood: AvatarMood;
  leftChoice: CardChoice;
  rightChoice: CardChoice;
  /** Custom Up roll; falls back to the global table when absent. */
  upChoice?: UpChoice;
  /** Card-level chained narrative: the next card to serve after this one resolves. */
  nextCardId?: string;
}

export interface GameStats {
  energy: number;
  affection: number;
  sanity: number;
  wallet: number;
}
