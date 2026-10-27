/**
 * Web Haptic API (navigator.vibrate) with a safe fallback: browsers without
 * support (all desktops, Safari) get a silent no-op.
 */
function vibrate(pattern: number | number[]): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some platforms throw without a user gesture — the game stays playable.
  }
}

export const haptic = {
  /** Gentle 12ms tick the moment a swipe crosses a choice threshold. */
  thresholdTick: () => vibrate(12),
  /** Single soft pulse for a satisfying "pop" (item used, voucher stamped). */
  pop: () => vibrate(30),
  /** Double pulse for the danger zone (a stat dropping below 20) or Game Over. */
  dangerPulse: () => vibrate([20, 50, 20]),
};
