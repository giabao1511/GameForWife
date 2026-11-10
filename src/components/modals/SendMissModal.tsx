'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import type { AnimationPlaybackControls } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/cn';

/** How long the heart must be held (ms) to fire a hug. */
const HOLD_MS = 1200;
/** Number of floating hearts per successful hug. */
const PARTICLE_COUNT = 14;

interface Burst {
  id: number;
  /** Bump so a re-trigger re-plays the particle run. */
  seq: number;
}

/**
 * "Gửi Nỗi Nhớ" (Send a Heartbeat / Digital Hug) widget.
 *
 * A long-press heart: hold ~1.2s and she feels a real lub-dub heartbeat on her
 * phone, a shower of hearts floats up, the running counter ticks, and a warm
 * card reveals a comfort message written by her soldier. Everything works
 * outside the card game loop — it is pure comfort, not gameplay.
 */
export default function SendMissModal() {
  const open = useGameStore((s) => s.isSendMissOpen);
  const close = useGameStore((s) => s.closeSendMiss);
  const missCount = useGameStore((s) => s.missCount);
  const sendMissSignal = useGameStore((s) => s.sendMissSignal);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="send-miss"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-[#2e3425]/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Gửi nỗi nhớ cho anh"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="my-auto w-full max-w-sm overflow-hidden rounded-3xl bg-[#fdf6f2] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Header onClose={close} />
            <HeartStage onFire={sendMissSignal} count={missCount} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#4c5738] to-[#3f4a30] px-5 pb-4 pt-4 text-[#f4efe6]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#f4efe6]/25 bg-[#f4efe6]/10 text-xl" aria-hidden>
            💖
          </span>
          <div>
            <p className="text-sm font-black leading-tight">Gửi nỗi nhớ cho anh</p>
            <p className="text-[11px] text-[#f4efe6]/70">Nhấn giữ trái tim · một cái ôm từ xa 🎖️</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-[#f4efe6]/25 p-1.5 text-[#f4efe6] transition-transform active:scale-90"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HeartStage({ onFire, count }: { onFire: () => string; count: number }) {
  const [held, setHeld] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const holdTimer = useRef<number | null>(null);
  const seq = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  // 0→1 ring fill driven by Framer Motion (restarts each press).
  const progress = useMotionValue(0);
  const stopFill = useRef<AnimationPlaybackControls | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    stopFill.current?.stop();
    stopFill.current = null;
    progress.set(0);
    setHeld(false);
  }, [progress]);

  useEffect(() => clearHold, [clearHold]);

  const startHold = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      start.current = { x: e.clientX, y: e.clientY };
      setHeld(true);

      // Animate the ring 0→1 over exactly HOLD_MS.
      stopFill.current?.stop();
      progress.set(0);
      stopFill.current = animate(progress, 1, {
        duration: HOLD_MS / 1000,
        ease: 'linear',
      });

      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        const msg = onFire();
        setRevealed(msg);
        seq.current += 1;
        setBursts((prev) => [...prev.slice(-2), { id: seq.current, seq: seq.current }]);
        setHeld(false);
      }, HOLD_MS);
    },
    [onFire, progress],
  );

  const endHold = useCallback(() => clearHold(), [clearHold]);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!holdTimer.current) return;
      // A lateral drag (scrolling, repositioning) cancels the press.
      if (Math.abs(e.clientX - start.current.x) + Math.abs(e.clientY - start.current.y) > 32) {
        clearHold();
      }
    },
    [clearHold],
  );

  // Drop a burst once its particle run has played out (3s life).
  useEffect(() => {
    if (bursts.length === 0) return;
    const last = bursts[bursts.length - 1];
    const t = window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== last.id));
    }, 3000);
    return () => window.clearTimeout(t);
  }, [bursts]);

  return (
    <div className="relative flex flex-col items-center px-6 pb-7 pt-6">
      {/* Stage: heart + particles */}
      <div className="relative grid h-44 w-full place-items-center">
        {/* Particles, one run per successful hug */}
        {bursts.map((b) => (
          <HeartBurst key={`${b.id}-${b.seq}`} seq={b.seq} />
        ))}

        <motion.button
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onLostPointerCapture={endHold}
          onPointerMove={onMove}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Nhấn giữ để gửi cái ôm"
          aria-pressed={held}
          className="relative grid h-36 w-36 place-items-center rounded-full select-none touch-none"
          style={{ touchAction: 'none' }}
          whileTap={{ scale: held ? 0.94 : 0.9 }}
        >
          {/* Fill ring: lights up as the hold approaches the threshold. */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="47" fill="none" stroke="#f7d6de" strokeWidth="3" />
            <motion.circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke="#e5484d"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 47}
              style={{ strokeDashoffset: progress }}
            />
          </svg>

          {/* Idle: gentle heartbeat idle pulse; while holding: a tighter beat. */}
          <motion.div
            className="pointer-events-none grid place-items-center"
            animate={held ? { scale: [1, 1.06, 1] } : { scale: [1, 1.14, 1, 1.08, 1], rotate: 0 }}
            transition={
              held
                ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'grid h-24 w-24 place-items-center rounded-full',
                'bg-gradient-to-br from-[#ff8a9b] to-[#e5484d] shadow-[0_10px_30px_-8px_rgba(229,72,77,0.7)]',
              )}
            >
              <Heart
                className="h-11 w-11 fill-white/90 text-white drop-shadow"
                aria-hidden
              />
            </motion.div>
          </motion.div>
        </motion.button>
      </div>

      <p className="text-center text-sm font-bold text-[#3c442f]">Nhấn giữ để gửi cái ôm ❤️</p>
      <p className="mt-0.5 text-[11px] text-[#3c442f]/55">Giữ khoảng {HOLD_MS / 1000}s để tim anh đập lên</p>

      {/* Running counter */}
      <div className="mt-4 flex items-center gap-2 rounded-full bg-[#fbeae0] px-4 py-1.5 text-[#b6572e]">
        <Heart className="h-3.5 w-3.5 fill-[#e5484d] text-[#e5484d]" aria-hidden />
        <span className="text-xs font-black tabular-nums">
          Em đã gửi {count} nỗi nhớ về doanh trại cho anh 🎖️
        </span>
      </div>

      {/* Comfort message card — reveals the fresh line each hug, with a
          "Gửi thêm cái nữa" CTA so she can keep sending without closing. */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            key="comfort-card"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-4 w-full rounded-2xl border border-[#f0d9cc] bg-white/70 p-4 shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b6572e]">
              Tin nhắn từ doanh trại 💌
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#3c442f]">{revealed}</p>
            <button
              onClick={() => {
                const msg = onFire();
                setRevealed(msg);
                seq.current += 1;
                setBursts((prev) => [...prev.slice(-2), { id: seq.current, seq: seq.current }]);
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff8a9b] to-[#e5484d] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
            >
              <Heart className="h-4 w-4 fill-white" aria-hidden />
              Gửi thêm cái nữa
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A one-shot burst of hearts drifting up and fading. */
function HeartBurst({ seq }: { seq: number }) {
  // This component mounts exactly once per burst (keyed by seq in the
  // parent), so a lazy state initializer rolls the particle specs once per
  // burst — stable across re-renders, impure-safe by design.
  const [hearts] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 90, // px drift
      delay: Math.random() * 0.25,
      size: 12 + Math.random() * 12,
      duration: 1.1 + Math.random() * 0.8,
    })),
  );
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
      {hearts.map((h) => (
        <motion.span
          key={`${seq}-${h.id}`}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: h.x, y: -150, opacity: [0, 1, 0], scale: 1 }}
          transition={{
            duration: h.duration,
            delay: h.delay,
            ease: 'easeOut',
          }}
          style={{ fontSize: h.size }}
        >
          ❤️
        </motion.span>
      ))}
    </div>
  );
}
