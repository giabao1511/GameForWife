'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import GameScreen from '@/components/GameScreen';
import TitleScreen from '@/components/screens/TitleScreen';
import HowToPlayScreen from '@/components/screens/HowToPlayScreen';
import AboutScreen from '@/components/screens/AboutScreen';
import TimeCapsuleModal from '@/components/modals/TimeCapsuleModal';
import SendMissModal from '@/components/modals/SendMissModal';

/**
 * Top-level screen router. The whole app lives inside one mobile frame and
 * swaps the active view based on `currentScreen`, with a soft crossfade. The
 * Time Capsule + "Gửi Nỗi Nhớ" widgets are kept out of the card lifecycle and
 * mounted here so they can be opened from *any* screen (title, about, play).
 */
export default function Home() {
  const screen = useGameStore((s) => s.currentScreen);

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
