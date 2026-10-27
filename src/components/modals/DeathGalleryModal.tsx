'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { DEATH_ENDINGS } from '@/data/deaths';
import type { StatKey } from '@/data/types';
import ChibiFace, { type ChibiState } from '../card/ChibiFace';
import { cn } from '@/lib/cn';

/** Which doodle mood fits each death's fatal stat. */
const STAT_FACE: Record<StatKey, ChibiState> = {
  energy: 'exhausted',
  sanity: 'stressed',
  affection: 'pouting',
  wallet: 'broke',
};

export default function DeathGalleryModal() {
  const open = useGameStore((s) => s.isDeathGalleryOpen);
  const toggle = useGameStore((s) => s.toggleDeathGallery);
  const unlockedDeathIds = useGameStore((s) => s.unlockedDeathIds);
  const unlockedCount = DEATH_ENDINGS.filter((d) => unlockedDeathIds.includes(d.id)).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="gallery"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#4a3f35]/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Sổ tay cái chết"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="my-auto w-full max-w-sm rounded-3xl bg-[#fdfbf7] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-[#4a3f35]">
                <BookOpen className="h-5 w-5" aria-hidden />
                Sổ tay cái chết
              </h2>
              <button
                onClick={toggle}
                className="rounded-full border border-[#e3d9c9] p-1.5 text-[#4a3f35] transition-transform active:scale-90"
                aria-label="Đóng sổ tay"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#f4efe6] px-3 py-1 text-xs font-bold text-[#4a3f35]">
              {unlockedCount}/{DEATH_ENDINGS.length} Đã mở khóa
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DEATH_ENDINGS.map((death) => {
                const unlocked = unlockedDeathIds.includes(death.id);
                return (
                  <motion.div
                    key={death.id}
                    layout
                    className={cn(
                      'rounded-2xl p-3 text-left shadow-sm',
                      unlocked ? 'border border-[#e3d9c9] bg-white' : 'border-2 border-dashed border-[#d9cfc0] bg-[#f4efe6]/50',
                    )}
                  >
                    {unlocked ? (
                      <>
                        <ChibiFace state={STAT_FACE[death.stat]} size={56} />
                        <div className="mt-2 flex items-center gap-1 text-base" aria-hidden>
                          {death.emoji}
                        </div>
                        <p className="mt-1 text-sm font-bold leading-tight text-[#4a3f35]">{death.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#4a3f35]/70">{death.body}</p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 items-center justify-center text-3xl opacity-30" aria-hidden>
                          <ChibiFace state="happy" size={48} />
                        </div>
                        <p className="mt-2 text-sm font-bold text-[#4a3f35]/50">Chưa khám phá</p>
                        <p className="mt-1 text-xs italic leading-relaxed text-[#4a3f35]/50">
                          Gợi ý: {death.hint}
                        </p>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
