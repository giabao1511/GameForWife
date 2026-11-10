'use client';

import { useActiveTheme } from '@/components/effects/useActiveTheme';
import InteractiveParticles from '@/components/effects/InteractiveParticles';

/**
 * Soft ambient background shared by the Title / How-to-Play / About screens.
 *
 * Theme-aware ("Đổi Bối Cảnh & Chủ Đề"): instead of a fixed pastel wash it
 * paints the active theme's gradient and its ambient particle system, so the
 * menu screens restyle with the rest of the app. Purely decorative —
 * pointer-events are disabled so it never blocks taps.
 */
export default function AmbientBackground() {
  const theme = useActiveTheme();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Solid base wash so low-opacity theme gradients never bleed the page
          color through; the theme gradient + particles sit on top of it. */}
      <div className="absolute inset-0 bg-stone-100" aria-hidden />
      {/* The theme's gradient, keyable so a switch crossfades. */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient}`} aria-hidden />
      <InteractiveParticles kind={theme.particleType} accent={theme.accent} />
    </div>
  );
}
