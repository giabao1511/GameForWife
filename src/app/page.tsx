'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import GameScreen from '@/components/GameScreen';
import TitleScreen from '@/components/screens/TitleScreen';
import HowToPlayScreen from '@/components/screens/HowToPlayScreen';
import AboutScreen from '@/components/screens/AboutScreen';
import TimeCapsuleModal from '@/components/modals/TimeCapsuleModal';
import SendMissModal from '@/components/modals/SendMissModal';
import ThemeSelectorModal from '@/components/modals/ThemeSelectorModal';
import { useActiveTheme } from '@/components/effects/useActiveTheme';
import { unlockAudio, startThemeBed } from '@/lib/audio';

/**
 * Top-level screen router. The whole app lives inside one mobile frame and
 * swaps the active view based on `currentScreen`, with a soft crossfade. The
 * Time Capsule + "Gửi Nỗi Nhớ" + Theme Selector widgets are kept out of the
 * card lifecycle and mounted here so they can be opened from *any* screen.
 */
export default function Home() {
  const screen = useGameStore((s) => s.currentScreen);
  // The theme actually in effect now (clock-driven when sync is ON, otherwise
  // the player's manual pick). One source of truth for the ambient bed.
  const theme = useActiveTheme();

  // Always keep the gesture handler reading the *current* bed (not a stale
  // closure from mount), so the first tap starts whatever theme is active.
  const activeBedRef = useRef<string | null>(theme.ambientAudio ?? null);
  activeBedRef.current = theme.ambientAudio ?? null;

  // Browsers only start audio after a real user gesture. On the first tap
  // anywhere we unlock the ASMR synth and (re-)drive the active theme's
  // ambient bed. A theme with no bed falls back to the default cozy loop
  // (handled inside startThemeBed); a blocked autoplay just stays silent.
  useEffect(() => {
    const onFirstGesture = () => {
      unlockAudio();
      startThemeBed(activeBedRef.current);
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onFirstGesture);
  }, []);

  // Keep the ambient bed in sync with the active theme — including the
  // real-time auto-switch when the clock crosses 17:00 / 20:00 / 06:00.
  // Idempotent per bed; a pre-gesture start() stays silent (play() is caught).
  useEffect(() => {
    startThemeBed(theme.ambientAudio ?? null);
  }, [theme.ambientAudio]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AnimatePresence mode="wait">
        <motion.main
          key={screen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {screen === 'title' && <TitleScreen />}
          {screen === 'how_to_play' && <HowToPlayScreen />}
          {screen === 'about' && <AboutScreen />}
          {screen === 'playing' && <GameScreen />}
        </motion.main>
      </AnimatePresence>

      <TimeCapsuleModal />
      <SendMissModal />
      <ThemeSelectorModal />
    </div>
  );
}
