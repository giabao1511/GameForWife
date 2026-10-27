'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pin, Camera } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { playMemoryTingle, unlockAudio } from '@/lib/audio';

/** Handwritten-feel fallback stack — no external font load, safe on mobile. */
const HANDWRITTEN = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";

/**
 * Celebratory one-shot popup: a polaroid of the freshly unlocked memory
 * slides in with a slight rotation. Dismissed via "Lưu vào Sổ tay" —
 * the photo itself stays permanently unlocked (it is in localStorage).
 */
export default function MemoryUnlockModal() {
  const memory = useGameStore((s) => s.newlyUnlockedMemory);
  const dismiss = useGameStore((s) => s.dismissNewlyUnlockedMemory);
  const openScrapbook = useGameStore((s) => s.openScrapbook);

  // Gentle tingle as the card lands — once per unlock.
  useEffect(() => {
    if (!memory) return;
    unlockAudio(); // make sure the AudioContext is unlocked before the tone
    const t = window.setTimeout(() => playMemoryTingle(), 350);
    return () => window.clearTimeout(t);
  }, [memory]);

  return (
    <AnimatePresence>
      {memory && (
        <motion.div
          key="memory-unlock"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#4a3f35]/70 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Kỷ niệm mới: ${memory.title}`}
        >
          <motion.div
            key={memory.id}
            initial={{ y: 80, opacity: 0, rotate: -2 }}
            animate={{ y: 0, opacity: 1, rotate: -2 }}
            exit={{ y: 60, opacity: 0, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="w-full max-w-xs rounded-sm bg-white p-3 shadow-2xl"
          >
            {/* Polaroid frame: photo, then handwritten caption strip */}
            <div className="overflow-hidden rounded-sm bg-[#4a3f35]">
              <img
                src={memory.imageSrc}
                alt={memory.title}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="flex items-center gap-1.5 px-1 pt-2 text-[11px] font-semibold text-[#4a3f35]/60">
              <Camera className="h-3.5 w-3.5" aria-hidden />
              <span>{memory.dateStr}</span>
            </div>

            <h3
              className="px-1 pt-1 text-lg font-bold leading-tight text-[#4a3f35]"
              style={{ fontFamily: HANDWRITTEN }}
            >
              {memory.title}
            </h3>
            {memory.location && (
              <p className="flex items-center gap-1 px-1 pt-0.5 text-xs text-[#4a3f35]/70">
                <Pin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {memory.location}
              </p>
            )}
            <p
              className="px-1 pt-2 text-sm leading-snug text-[#4a3f35]/85"
              style={{ fontFamily: HANDWRITTEN }}
            >
              {memory.note}
            </p>

            <button
              onClick={() => {
                dismiss();
                openScrapbook();
              }}
              className="mt-3 w-full rounded-xl bg-[#4a3f35] px-4 py-3 text-sm font-bold text-[#fdfbf7] transition-transform active:scale-95"
            >
              Lưu vào Sổ tay 📖
            </button>
            <button
              onClick={dismiss}
              className="mt-1.5 w-full rounded-xl px-4 py-1.5 text-xs font-semibold text-[#4a3f35]/50 underline underline-offset-2"
            >
              Xem sau
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
