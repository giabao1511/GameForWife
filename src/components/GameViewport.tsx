'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useActivePeriod } from '@/lib/timeContext';
import { useActiveTheme } from '@/components/effects/useActiveTheme';
import InteractiveParticles from '@/components/effects/InteractiveParticles';

/**
 * Centered mobile container for the whole game.
 *
 * The visual ambience is now owned by the active *theme* ("Đổi Bối Cảnh & Chủ
 * Đề"): a single gradient layer + the InteractiveParticles canvas are the ONLY
 * background sources, so the theme never stacks a second, conflicting ambient
 * layer on top of itself. (The clock-driven `period` still drives *gameplay*
 * logic — deck-draw boost, ambience chime — and is kept as a data attribute;
 * it no longer paints the background.)
 */
export default function GameViewport({ children }: { children: ReactNode }) {
  // useActivePeriod() stays for the data-period attribute (dev tools + logic);
  // useActiveTheme() is the single source of the visual look.
  const period = useActivePeriod();
  const theme = useActiveTheme();

  return (
    <div
      data-period={period}
      className={`relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden bg-[#fdfbf7] p-4 shadow-xl select-none ${theme.textColor}`}
    >
      {/* Single ambient layer: the active theme's gradient + particles. Keyed by
          theme id so a theme switch crossfades instead of stacking. */}
      <motion.div
        key={theme.id}
        data-ambience={theme.particleType}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] bg-gradient-to-br"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient}`} aria-hidden />
        <InteractiveParticles kind={theme.particleType} accent={theme.accent} />
      </motion.div>

      {children}
    </div>
  );
}
