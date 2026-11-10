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
  /** Heavy single thud for a successful defibrillator shock. */
  shockTick: () => vibrate(60),
  /** Stuttering triple-pulse for a missed shock (error buzz). */
  errorThud: () => vibrate([18, 24, 18]),
  /**
   * Realistic "lub-dub" heartbeat for the Send-a-Miss long-press: a double
   * pulse (70ms tick, 100ms rest, 120ms tick) so a phone in her hand
   * literally beats like his heart.
   */
  heartbeatPulse: () => vibrate([70, 100, 120]),
};
