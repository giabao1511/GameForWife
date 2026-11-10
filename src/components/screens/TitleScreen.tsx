'use client';

import { motion } from 'framer-motion';
import ChibiFace from '@/components/card/ChibiFace';
import AmbientBackground from './AmbientBackground';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/cn';

/**
 * Title / Start screen — the first thing a player sees.
 *
 * A cozy visual-novel menu: an idle, gently breathing chibi in the center, the
 * big "NUÔI ANH" wordmark, and a stack of tactile rounded buttons. The primary
 * CTA resumes an in-progress run (or starts Day 1) and reads "Chơi tiếp Ngày X"
 * when there is progress to keep.
 */
export default function TitleScreen() {
  const day = useGameStore((s) => s.day);
  const turns = useGameStore((s) => s.turns);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isVictory = useGameStore((s) => s.isVictory);
  const setScreen = useGameStore((s) => s.setScreen);
  const startGame = useGameStore((s) => s.startGame);
  const openTimeCapsule = useGameStore((s) => s.openTimeCapsule);

  const resume = turns > 0 && !isGameOver && !isVictory;

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-[#fff4f6] p-5 text-[#4a3f35]">
      <AmbientBackground />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-6">
        {/* Breathing chibi with a tiny military cap + heart */}
        <div className="relative mb-4">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="grid h-36 w-36 place-items-center rounded-full bg-white/60 shadow-[0_18px_50px_-12px_rgba(229,72,77,0.35)]">
              <ChibiFace state="happy" size={120} />
            </div>
            <span className="absolute -right-1 -top-1 text-3xl" aria-hidden>
              🎖️
            </span>
            <motion.span
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            >
              ❤️
            </motion.span>
          </motion.div>
        </div>

        {/* Wordmark */}
        <h1 className="text-center text-4xl font-black leading-none tracking-tight text-[#3b2f28]">
          NUÔI&nbsp;ANH
        </h1>
        <p className="mt-1 text-center text-sm font-medium text-[#4a3f35]/70">
          Nhật ký sinh tồn &amp; giữ gìn tình yêu 💖
        </p>

        {/* Menu buttons */}
        <div className="mt-7 flex w-full flex-col items-stretch gap-3">
          <div className="relative w-full">
            {/* Gentle pulsing glow behind the primary CTA. */}
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-[#e5484d]/40 blur-md"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.button
              onClick={startGame}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative z-10 w-full rounded-2xl px-5 py-3.5 text-base font-black text-white shadow-lg',
                'bg-gradient-to-r from-[#ff8a9b] to-[#e5484d] shadow-[#e5484d]/40',
              )}
            >
              {resume ? `Chơi tiếp Ngày ${day} 🎮` : 'Bắt đầu chơi 🎮'}
            </motion.button>
          </div>

          <button
            onClick={() => setScreen('how_to_play')}
            className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
          >
            Hướng dẫn cách chơi 📖
          </button>

          <button
            onClick={() => setScreen('about')}
            className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
          >
            Gửi bé yêu (About) 💌
          </button>

          <button
            onClick={openTimeCapsule}
            className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
          >
            Hộp thư thời gian 🎖️
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 pb-2 text-center text-[11px] font-medium text-[#4a3f35]/50">
        v1.0.0 · Made with all my love ❤️
      </p>
    </div>
  );
}
