'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Camera, Lock, MapPin } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { MEMORIES_DATA, type MemoryItem } from '@/data/memories';
import { cn } from '@/lib/cn';

const HANDWRITTEN = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";

/** Washi tape strip in a corner of a photo — the scrapbook signature. */
function WashiTape({ color, tilt }: { color: string; tilt: string }) {
  return (
    <span
      aria-hidden
      className={cn('absolute -top-2 h-5 w-20 rounded-[2px] border border-black/5 opacity-90 shadow-sm', tilt)}
      style={{ backgroundColor: color, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 8px, transparent 8px 16px)' }}
    />
  );
}

/** One unlocked polaroid card in the grid. Tilt alternates for a hand-pinned look. */
function UnlockedPolaroid({ memory, index, onZoom }: { memory: MemoryItem; index: number; onZoom: () => void }) {
  const tilted = index % 2 === 0;
  const tapes = [
    { color: '#f6c6cf', tilt: '-left-2 -rotate-6' },
    { color: '#c9e4ca', tilt: '-right-2 -rotate-6' },
  ];
  const tape = tapes[index % tapes.length];
  return (
    <motion.button
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onZoom}
      aria-label={`Phóng lớn ảnh: ${memory.title}`}
      className={cn(
        'relative rounded-sm bg-white p-2 pb-3 text-left shadow-md transition-transform active:scale-[0.98]',
        tilted ? '-rotate-2' : 'rotate-1',
      )}
    >
      <div className="relative overflow-hidden rounded-sm">
        <WashiTape color={tape.color} tilt={tape.tilt} />
        <img src={memory.imageSrc} alt={memory.title} className="aspect-square w-full object-cover" loading="lazy" />
      </div>
      <p className="pt-2 text-sm font-bold leading-tight text-[#4a3f35]" style={{ fontFamily: HANDWRITTEN }}>
        {memory.title}
      </p>
      {memory.location && (
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#4a3f35]/60">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {memory.location}
        </p>
      )}
      <p className="mt-1 line-clamp-3 text-xs leading-snug text-[#4a3f35]/75" style={{ fontFamily: HANDWRITTEN }}>
        {memory.note}
      </p>
    </motion.button>
  );
}

/** Locked slot: dashed silhouette card with the unlock hint. */
function LockedSlot({ memory }: { memory: MemoryItem }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative rounded-sm border-2 border-dashed border-[#d9cfc0] bg-[#f4efe6]/50 p-2"
    >
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-sm bg-[#efe8dd]">
        <Lock className="h-6 w-6 text-[#4a3f35]/40" aria-hidden />
        <span className="px-3 text-center text-sm font-bold text-[#4a3f35]/40">??? / ???</span>
      </div>
      <p className="pt-2 text-xs font-bold text-[#4a3f35]/60">Chưa mở khóa</p>
      <p className="mt-1 text-[11px] italic leading-snug text-[#4a3f35]/50">
        Sống sót đến Ngày {memory.unlockDay} để mở khóa mảnh ký ức này
      </p>
    </motion.div>
  );
}

export default function ScrapbookModal() {
  const open = useGameStore((s) => s.isScrapbookOpen);
  const close = useGameStore((s) => s.closeScrapbook);
  const unlockedMemoryIds = useGameStore((s) => s.unlockedMemoryIds);
  const unlocked = MEMORIES_DATA.filter((m) => unlockedMemoryIds.includes(m.id)).length;

  // Full-screen zoom of the tapped photo.
  const [zoomed, setZoomed] = useState<MemoryItem | null>(null);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrapbook"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#4a3f35]/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Sổ kỷ niệm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, rotate: -0.5 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="my-auto w-full max-w-sm rounded-3xl bg-[#fdfbf7] p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-[#4a3f35]">
                  <Camera className="h-5 w-5" aria-hidden />
                  Sổ ký ức
                </h2>
                <button
                  onClick={close}
                  className="rounded-full border border-[#e3d9c9] p-1.5 text-[#4a3f35] transition-transform active:scale-90"
                  aria-label="Đóng sổ ký ức"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#f4efe6] px-3 py-1 text-xs font-bold text-[#4a3f35]">
                {unlocked}/{MEMORIES_DATA.length} Kỷ niệm đã mở khóa
              </div>

              <div className="grid grid-cols-2 gap-3">
                {MEMORIES_DATA.map((memory, i) =>
                  unlockedMemoryIds.includes(memory.id) ? (
                    <UnlockedPolaroid key={memory.id} memory={memory} index={i} onZoom={() => setZoomed(memory)} />
                  ) : (
                    <LockedSlot key={memory.id} memory={memory} />
                  ),
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen photo zoom */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            key="zoom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#4a3f35]/90 p-6 backdrop-blur-sm"
            onClick={() => setZoomed(null)}
            role="dialog"
            aria-modal="true"
            aria-label={zoomed.title}
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="w-full max-w-xs rounded-sm bg-white p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={zoomed.imageSrc} alt={zoomed.title} className="w-full rounded-sm" />
              <h3 className="pt-3 text-lg font-bold leading-tight text-[#4a3f35]" style={{ fontFamily: HANDWRITTEN }}>
                {zoomed.title}
              </h3>
              {zoomed.location && (
                <p className="flex items-center gap-1 text-xs text-[#4a3f35]/70">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {zoomed.location}
                </p>
              )}
              <p className="pt-1.5 text-sm leading-snug text-[#4a3f35]/85" style={{ fontFamily: HANDWRITTEN }}>
                {zoomed.note}
              </p>
              <button
                onClick={() => setZoomed(null)}
                className="mt-3 w-full rounded-xl border-2 border-[#e3d9c9] px-4 py-2 text-sm font-bold text-[#4a3f35] active:scale-95"
              >
                Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
