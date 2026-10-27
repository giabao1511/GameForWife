import type { UpOutcome } from './types';

/**
 * Global fallback RNG table for "Bỏ mặc / Kệ anh" (swipe Up) when a card
 * has no custom `upChoice`. A chaotic emotional roll: mostly hurts
 * Affection or stresses him, occasionally jackpots Energy, 10% catastrophe.
 *
 * Weights sum to 100. Mock data for now — swap for backend data in the
 * future; the store only depends on this constant.
 */
export const GLOBAL_UP_FALLBACK_OUTCOMES: UpOutcome[] = [
  {
    weight: 40,
    modifiers: { affection: -15, sanity: -10 },
    narrativeReaction: 'Em bơ anh thật luôn á hả... Tự nhiên thấy hơi trống vắng.',
  },
  {
    weight: 25,
    modifiers: { energy: 20, sanity: 15, affection: -10 },
    narrativeReaction: 'Được em thả xích! Tranh thủ làm ván game một chút.',
  },
  {
    weight: 15,
    modifiers: { energy: 5, wallet: -5 },
    narrativeReaction: 'Thôi anh tự order ly nước uống tạm, không dám phiền công chúa.',
  },
  {
    weight: 10,
    modifiers: { wallet: -25, affection: 15, sanity: -10 },
    narrativeReaction: 'Em im lặng làm anh sợ quá, lén order trà sữa tạ lỗi dù không biết mình sai gì!',
  },
  {
    weight: 10,
    modifiers: { affection: -30, energy: -20 },
    narrativeReaction: 'Anh tự quyết xong hỏng bét hết cả... Giờ thì cả hai đứa cùng dỗi nhau!',
  },
];
