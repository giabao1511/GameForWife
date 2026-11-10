'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import GameScreen from '@/components/GameScreen';
import TitleScreen from '@/components/screens/TitleScreen';
import HowToPlayScreen from '@/components/screens/HowToPlayScreen';
import AboutScreen from '@/components/screens/AboutScreen';
import TimeCapsuleModal from '@/components/modals/TimeCapsuleModal';
import SendMissModal from '@/components/modals/SendMissModal';
import { unlockAudio, startBgm } from '@/lib/audio';

/**
 * Top-level screen router. The whole app lives inside one mobile frame and
 * swaps the active view based on `currentScreen`, with a soft crossfade. The
 * Time Capsule + "Gửi Nỗi Nhớ" widgets are kept out of the card lifecycle and
 * mounted here so they can be opened from *any* screen (title, about, play).
 */
export default function Home() {
  const screen = useGameStore((s) => s.currentScreen);

  // Browsers only start audio after a real user gesture. On the first tap
  // anywhere we both unlock the ASMR synth and start the looping BGM. The
  // gentle startBgm() is a no-op before this point and stays silent (rather
  // than throwing) if autoplay is still blocked or the file is missing.
  useEffect(() => {
    const onFirstGesture = () => {
      unlockAudio();
      startBgm();
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onFirstGesture);
  }, []);

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
    </div>
  );
}
