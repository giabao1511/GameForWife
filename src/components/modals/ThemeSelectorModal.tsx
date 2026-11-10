'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useActiveTheme } from '@/components/effects/useActiveTheme';
import { APP_THEMES, type AppTheme } from '@/data/themes';
import { cn } from '@/lib/cn';

/** A few static glyphs that hint at each theme's ambient particle style. */
const PARTICLE_PREVIEW: Record<AppTheme['particleType'], string[]> = {
  hearts: ['💗', '✨', '💕'],
  rain: ['🌧️', '💧', '☔'],
  petals: ['🌸', '🌷', '🌺'],
  stars: ['⭐', '✨', '🌙'],
};

/**
 * "Đổi Bối Cảnh & Chủ Đề" — theme & room-customization modal.
 *
 * A centered dialog with a 2×2 grid of live theme previews (each card shows
 * the real gradient + a hint of its particle style), and a toggle for
 * "Đồng bộ theo thời gian thực" (auto-switching the theme by the real clock).
 *
 *   · Sync ON  → the wall clock drives the theme; the manual grid is gently
 *     locked (dimmed + "Đang đồng bộ tự động theo giờ thực tế").
 *   · Sync OFF → the player's manual pick wins 100%; tapping a card applies it
 *     instantly (live preview).
 *
 * Page-level: mounted once in the root page so it can be opened from the
 * Title screen, the in-play HUD, or anywhere else — it reads/writes the store.
 */
export default function ThemeSelectorModal() {
  const open = useGameStore((s) => s.isThemeSelectorOpen);
  const close = useGameStore((s) => s.closeThemeSelector);
  const setAppTheme = useGameStore((s) => s.setAppTheme);
  const setThemeSync = useGameStore((s) => s.setThemeSync);
  const themeSyncOn = useGameStore((s) => s.themeSyncOn);
  // The theme in effect now; when sync is ON this already reflects the clock.
  const active = useActiveTheme();

  // Escape closes (keyboard parity with the X / backdrop tap).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="theme-selector"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#2e2338]/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Đổi bối cảnh và chủ đề"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-sm overflow-hidden rounded-3xl bg-[#fdf6f2] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-[#7a5c86] to-[#5a4870] px-5 py-4 text-[#f4efe6]">
              <div>
                <h2 className="text-base font-black tracking-tight">🎨 Đổi bối cảnh &amp; chủ đề</h2>
                <p className="mt-0.5 text-[11px] text-[#f4efe6]/70">
                  Chọn không gian &amp; âm thanh phù hợp lúc này.
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Đóng"
                className="rounded-full border border-white/25 p-1.5 text-[#f4efe6] transition-transform active:scale-90"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-4">
              {/* 2×2 live-preview grid — locked (dimmed, non-interactive) while
                  real-time sync is ON, so the clock owns the theme. */}
              <div
                className={cn(
                  'grid grid-cols-2 gap-2.5',
                  themeSyncOn && 'pointer-events-none opacity-55 saturate-[0.6]',
                )}
                aria-disabled={themeSyncOn || undefined}
              >
                {APP_THEMES.map((t) => {
                  // `active.id` already reflects the clock when sync is ON, so a
                  // single comparison covers both manual and auto selection.
                  const selected = active.id === t.id;
                  const isAutoPick = selected && themeSyncOn;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAppTheme(t.id)}
                      aria-pressed={selected}
                      className={cn(
                        'relative flex flex-col overflow-hidden rounded-2xl border-2 p-3 text-left shadow-sm transition-transform active:scale-[0.98]',
                        bgThemeCard(t),
                        selected ? 'border-[#7a5c86]' : 'border-transparent',
                      )}
                    >
                      {/* Live gradient preview (the theme's actual background). */}
                      <div className={cn('mb-2 flex h-16 items-center justify-center rounded-xl bg-gradient-to-br', t.bgGradient)} aria-hidden>
                        <span className="text-3xl drop-shadow-sm">{t.badge}</span>
                      </div>
                      <p className={cn('text-[13px] font-black leading-tight', themeNameText(t))}>{t.name}</p>
                      <div className="mt-1 flex items-center gap-1 text-[15px] opacity-70" aria-hidden>
                        {PARTICLE_PREVIEW[t.particleType].map((g, i) => (
                          <span key={i} className={themeGlyphText(t)}>
                            {g}
                          </span>
                        ))}
                        {t.ambientAudio && <span title="Có nhạc nền">🎵</span>}
                      </div>

                      {/* Selected badge: a lock when the clock auto-picked it,
                          a check when the player picked it manually. */}
                      <AnimatePresence>
                        {selected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={cn(
                              'absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-white shadow',
                              isAutoPick ? 'bg-[#818cf8]' : 'bg-[#7a5c86]',
                            )}
                          >
                            {isAutoPick ? (
                              <Lock className="h-3 w-3" aria-hidden />
                            ) : (
                              <Check className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>

              {/* Locked-state label shown only while the clock owns the theme. */}
              {themeSyncOn && (
                <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-[#e9e1f2] px-3 py-2 text-[11px] font-semibold text-[#5a4870]">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Đang đồng bộ tự động theo giờ thực tế
                </p>
              )}

              {/* Real-time sync toggle */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-[#e9e1f2] bg-white/70 p-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-[#3b2f28]">Đồng bộ theo thời gian thực</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#4a3f35]/60">
                    Tự đổi bối cảnh theo giờ: ban ngày Kẹo Ngọt · hoàng hôn Bờ Kè · đêm Doanh Trại.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={themeSyncOn}
                  onClick={() => setThemeSync(!themeSyncOn)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                    themeSyncOn ? 'bg-[#7a5c86]' : 'bg-[#d7cbe6]',
                  )}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    className={cn(
                      'absolute top-0.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow',
                      themeSyncOn ? 'right-0.5' : 'left-0.5',
                    )}
                    aria-hidden
                  >
                    {themeSyncOn ? <span className="text-[13px]">🕐</span> : <span className="text-[13px] opacity-40">🕐</span>}
                  </motion.span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Per-theme card surface helpers ────────────────────────────────────────
// Keep the modal's own text readable on each theme's gradient by picking a
// light/dark card face from the theme id (dark card for starry_camp).

const isDarkTheme = (t: AppTheme) => t.id === 'starry_camp';

function bgThemeCard(t: AppTheme): string {
  return isDarkTheme(t) ? 'bg-slate-900' : 'bg-white';
}
function themeNameText(t: AppTheme): string {
  return isDarkTheme(t) ? 'text-indigo-100' : 'text-[#3b2f28]';
}
function themeGlyphText(t: AppTheme): string {
  return isDarkTheme(t) ? 'text-indigo-200' : 'text-[#4a3f35]';
}
