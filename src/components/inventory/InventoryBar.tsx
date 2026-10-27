'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { playItemPop } from '@/lib/audio';
import type { InventoryItemId } from '@/data/types';
import { cn } from '@/lib/cn';

const CONFETTI_COLORS = ['#f5a623', '#30a46c', '#e5484d', '#8fd0f0', '#f3d9c0'];
const CONFETTI_COUNT = 14;

interface Burst {
  key: number;
  itemId: InventoryItemId;
  angle: number;
  distance: number;
  color: string;
}

/** Pure-ish factory kept at module scope so render never spawns randomness. */
function createBursts(itemId: InventoryItemId): Burst[] {
  const base = Date.now() + Math.random();
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    key: base + i,
    itemId,
    angle: (i / CONFETTI_COUNT) * Math.PI * 2 + Math.random() * 0.4,
    distance: 40 + Math.random() * 50,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
}

export default function InventoryBar() {
  const inventory = useGameStore((s) => s.inventory);
  const activeShield = useGameStore((s) => s.activeShield);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const consumeItem = useGameStore((s) => s.useItem);

  const [openItem, setOpenItem] = useState<InventoryItemId | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  function fireBurst(itemId: InventoryItemId) {
    const newBursts = createBursts(itemId);
    setBursts((prev) => [...prev, ...newBursts]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => !newBursts.some((n) => n.key === b.key)));
    }, 900);
  }

  function consume(itemId: InventoryItemId) {
    const item = inventory[itemId];
    if (!item || item.count <= 0 || isGameOver) return;
    consumeItem(itemId);
    playItemPop();
    fireBurst(itemId);
    setOpenItem(null);
  }

  return (
    <div className="relative rounded-2xl bg-[#f4efe6] p-3">
      {activeShield && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 rounded-lg bg-[#f3d9c0] px-3 py-1 text-center text-xs font-semibold text-[#4a3f35]"
        >
          🥺 Khiếu nũng đang bảo vệ Cưng chiều ở lượt kế tiếp
        </motion.div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(inventory) as InventoryItemId[]).map((id) => {
          const item = inventory[id];
          const disabled = item.count === 0 || isGameOver;
          const open = openItem === id;
          return (
            <div key={id} className="relative">
              <button
                onClick={() => setOpenItem(open ? null : id)}
                disabled={disabled}
                className={cn(
                  'relative flex w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-sm font-semibold transition-colors',
                  disabled
                    ? 'border-[#e3d9c9] bg-white text-[#4a3f35]/30'
                    : 'border-[#e3d9c9] bg-white text-[#4a3f35] hover:bg-[#fdfbf7] active:scale-[0.98]',
                )}
                aria-haspopup="dialog"
                aria-expanded={open}
              >
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
                <span className="truncate">{item.name}</span>
                <span
                  className={cn(
                    'absolute top-1 right-1 rounded-full px-1.5 text-xs font-bold',
                    disabled ? 'bg-[#e3d9c9] text-[#4a3f35]/40' : 'bg-[#4a3f35] text-white',
                  )}
                >
                  {item.count}
                </span>
              </button>

              {/* Micro-popover */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    role="dialog"
                    className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl bg-[#4a3f35] p-3 text-xs text-[#fdfbf7] shadow-lg"
                  >
                    <p className="font-bold">
                      {item.icon} {item.name}
                    </p>
                    <p className="mt-1 opacity-80">{item.description}</p>
                    <button
                      onClick={() => consume(id)}
                      disabled={disabled}
                      className="mt-2 w-full rounded-lg bg-[#f5a623] px-3 py-1.5 font-bold text-white disabled:opacity-40"
                    >
                      Dùng ngay
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confetti burst anchored to the pill */}
              {bursts.filter((b) => b.itemId === id).map((b) => (
                <motion.span
                  key={b.key}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos(b.angle) * b.distance,
                    y: Math.sin(b.angle) * b.distance - 20,
                    scale: 0.4,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ backgroundColor: b.color }}
                  className="pointer-events-none absolute top-1/2 left-1/2 h-2 w-2 rounded-full"
                  aria-hidden
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
