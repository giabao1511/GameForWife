'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { CHAPTER1_ALL } from '@/data/cards/chapter1Extra';
import { DEATH_BY_ID } from '@/data/deaths';
import { playGameOverBuzz } from '@/lib/audio';

export default function GameOverModal() {
  const isGameOver = useGameStore((s) => s.isGameOver);
  const deathId = useGameStore((s) => s.deathId);
  const day = useGameStore((s) => s.day);
  const stats = useGameStore((s) => s.stats);
  const restart = useGameStore((s) => s.restartGame);
  const toggleDeathGallery = useGameStore((s) => s.toggleDeathGallery);
  const buzzedRef = useRef(false);

  useEffect(() => {
    if (isGameOver && !buzzedRef.current) {
      buzzedRef.current = true;
      playGameOverBuzz();
    }
    if (!isGameOver) buzzedRef.current = false;
  }, [isGameOver]);

  if (!isGameOver) return null;
  const death = deathId ? DEATH_BY_ID[deathId] : undefined;

  return (
    <AnimatePresence>
      {isGameOver && (
        <motion.div
          key="gameover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#4a3f35]/70 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full max-w-sm rounded-3xl bg-[#fdfbf7] p-6 text-center shadow-2xl"
          >
            <div className="mb-3 text-6xl" aria-hidden>
              {death?.emoji ?? '💀'}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[#4a3f35]">{death?.title ?? 'Rơi vào bóng tối'}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3f35]/80">{death?.body}</p>

            <div className="mt-4 flex justify-center gap-3 text-xs text-[#4a3f35]/60">
              <span>📅 Sống được {day} ngày</span>
              <span>❤️ Cưng chiều {stats.affection}</span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => restart(CHAPTER1_ALL)}
                className="flex-1 rounded-2xl bg-[#4a3f35] px-4 py-3 text-sm font-bold text-[#fdfbf7] transition-transform active:scale-95"
              >
                Yêu lại từ đầu ↻
              </button>
              <button
                onClick={toggleDeathGallery}
                className="rounded-2xl border-2 border-[#e3d9c9] px-4 py-3 text-sm font-bold text-[#4a3f35] transition-transform active:scale-95"
              >
                📖 Sổ tay
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
