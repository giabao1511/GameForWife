'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationFrame } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import type { StatKey } from '@/data/types';
import {
  playDefibZap,
  playErrorBuzz,
  playFlatline,
  playReviveGasp,
  startEcgBeepLoop,
  startSirenLoop,
} from '@/lib/audio';
import { haptic } from '@/lib/haptics';

/**
 * Emergency Revival — Defibrillator CPR minigame.
 *
 * Intercepts the first death of a run. The player has 8.0s against a
 * decaying cardiac-pressure bar; the sweep cursor runs back and forth over
 * the ECG line and the "SỐC ĐIỆN ⚡" pad must be fired while it sits in the
 * green sweet spot. Three perfect shocks = revival; timer or pressure hitting
 * zero = flatline and the standard Game Over.
 *
 * The sim (countdown, pressure decay, sweep) lives in refs and is advanced by
 * a single rAF loop (frame-scaled, capped so a background-tab stall can't
 * teleport time). Display state syncs a few times a second; the sweep cursor
 * is written straight to the DOM each frame so taps stay zero-latency.
 */

const COUNTDOWN_S = 8.0;
const DECAY_PER_S = 12; // cardiac pressure %/s
const CYCLE_S = 0.85; // full back-and-forth sweep
const SWEET_SPOT = 0.15; // fraction of the width
const PRESSURE_START = 50;
const PRESSURE_ON_HIT = 35;
const HITS_NEEDED = 3;

const STAT_LABELS: Record<StatKey, string> = {
  energy: 'Pin',
  affection: 'Cưng chiều',
  sanity: 'Tỉnh táo',
  wallet: 'Ví tiền',
};

/** Classic PQRST ECG spike — pure function of a cycle position in [0,1). */
function ecgY(phase: number): number {
  const a = Math.abs;
  return (
    (a(phase - 0.15) < 0.02 ? -0.14 : 0) + // P dip
    (a(phase - 0.41) < 0.012 ? -0.35 : 0) + // Q
    (a(phase - 0.46) < 0.016 ? 1 : 0) + // R spike
    (a(phase - 0.52) < 0.014 ? -0.4 : 0) + // S
    (a(phase - 0.68) < 0.05 ? 0.3 : 0) // T wave
  );
}

export default function EmergencyRevivalModal() {
  const isRevivalActive = useGameStore((s) => s.isRevivalActive);
  // Fresh stage on every activation: the inner component's useState initializers
  // re-seed the sim, and its mount effect (re)starts the audio loops.
  return (
    <AnimatePresence>
      {isRevivalActive && <RevivalStage key="revival" />}
    </AnimatePresence>
  );
}

function RevivalStage() {
  const pendingDeathStat = useGameStore((s) => s.pendingDeathStat);
  const reviveSuccess = useGameStore((s) => s.reviveBoyfriendSuccess);
  const reviveFail = useGameStore((s) => s.reviveBoyfriendFail);

  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');
  const [timer, setTimer] = useState(COUNTDOWN_S);
  const [pressure, setPressure] = useState(PRESSURE_START);
  const [hits, setHits] = useState(0);
  const [spot, setSpot] = useState(0.425); // left edge of the sweet zone
  const [fx, setFx] = useState<'hit' | 'miss' | null>(null);

  const fxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorElRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef({
    timer: COUNTDOWN_S,
    pressure: PRESSURE_START,
    cursor: 0,
    spot: 0.425,
    hits: 0,
    direction: 1,
    speed: 1 / CYCLE_S,
    alive: true,
    lastT: 0,
  });
  const phaseRef = useRef<'playing' | 'won' | 'lost'>('playing');
  const pressureSyncRef = useRef(0);
  const endedRef = useRef(false);

  // Audio loops: start on mount, stop on unmount (the store flips
  // isRevivalActive off when the rescue resolves, which unmounts this stage).
  useEffect(() => {
    const siren = startSirenLoop();
    const ecg = startEcgBeepLoop();
    return () => {
      window.clearInterval(siren);
      window.clearInterval(ecg);
    };
  }, []);

  // The one simulation loop: rAF delta drives countdown + pressure decay and
  // the back-and-forth sweep. The cursor writes to the DOM each frame; the
  // numeric readouts sync ~10Hz so taps never compete with a re-render.
  useAnimationFrame((_t, delta) => {
    const sim = simRef.current;
    if (!sim.alive) return;
    const dt = Math.min((delta ?? 16) / 1000, 0.1); // clamp long frame gaps
    sim.timer = Math.max(0, sim.timer - dt);
    sim.pressure = Math.max(0, sim.pressure - DECAY_PER_S * dt);
    sim.cursor += sim.direction * sim.speed * dt;
    if (sim.cursor >= 1) {
      sim.cursor = 1;
      sim.direction = -1;
    } else if (sim.cursor <= 0) {
      sim.cursor = 0;
      sim.direction = 1;
    }
    const el = cursorElRef.current;
    if (el) el.style.left = `${sim.cursor * 100}%`;

    sim.lastT += dt;
    if (sim.lastT >= 0.1) {
      sim.lastT = 0;
      setTimer(sim.timer);
      if (Math.abs(sim.pressure - pressureSyncRef.current) >= 1) {
        pressureSyncRef.current = sim.pressure;
        setPressure(sim.pressure);
      }
    }
    if (sim.timer <= 0 || sim.pressure <= 0) {
      endedRef.current = true;
      phaseRef.current = 'lost';
      setPhase('lost');
      sim.alive = false;
      playFlatline();
      setTimeout(() => reviveFail(), 1400);
    }
  });

  function fireShock() {
    if (phaseRef.current !== 'playing' || endedRef.current) return;
    const sim = simRef.current;
    const inSpot = sim.cursor >= sim.spot && sim.cursor <= sim.spot + SWEET_SPOT;
    if (inSpot) {
      sim.hits += 1;
      sim.pressure = Math.min(100, sim.pressure + PRESSURE_ON_HIT);
      sim.spot = 0.05 + Math.random() * (0.95 - SWEET_SPOT - 0.05);
      setHits(sim.hits);
      setPressure(sim.pressure);
      setSpot(sim.spot);
      setFx('hit');
      if (fxTimerRef.current) clearTimeout(fxTimerRef.current);
      fxTimerRef.current = setTimeout(() => setFx(null), 320);
      playDefibZap();
      haptic.shockTick();
      if (sim.hits >= HITS_NEEDED) {
        endedRef.current = true;
        phaseRef.current = 'won';
        setPhase('won');
        sim.alive = false;
        playReviveGasp();
        setTimeout(() => reviveSuccess(), 1100);
      }
    } else {
      sim.timer = Math.max(0, sim.timer - 1.5);
      setTimer(sim.timer);
      setFx('miss');
      if (fxTimerRef.current) clearTimeout(fxTimerRef.current);
      fxTimerRef.current = setTimeout(() => setFx(null), 280);
      playErrorBuzz();
      haptic.errorThud();
      if (sim.timer <= 0) {
        endedRef.current = true;
        phaseRef.current = 'lost';
        setPhase('lost');
        sim.alive = false;
        playFlatline();
        setTimeout(() => reviveFail(), 1400);
      }
    }
  }

  // Keyboard: Space / Enter = shock (same path as the pad button). The
  // handler ref is kept in sync so the key listener only rebinds when the
  // play phase changes, not on every 10Hz readout render.
  const fireShockRef = useRef<() => void>(() => {});
  useEffect(() => {
    fireShockRef.current = fireShock;
  });
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        fireShockRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (fxTimerRef.current) clearTimeout(fxTimerRef.current);
    };
  }, []);

  const lost = phase === 'lost';
  const won = phase === 'won';

  return (
    <motion.div
      key="revival"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Opaque backdrop dimming the game */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[#0a0508]/85 backdrop-blur-sm"
        style={lost ? { boxShadow: 'inset 0 0 140px 40px rgba(120,10,10,0.8)' } : undefined}
      />
      {/* Red flashing ambient vignette (active rescue only) */}
      {phase === 'playing' && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: 'inset 0 0 120px 30px rgba(229,72,77,0.55)' }}
          animate={{ opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <motion.div
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="relative flex w-full max-w-sm flex-col gap-3 rounded-3xl border-2 border-[#e5484d]/60 bg-[#160b0e] p-5 text-[#fdecef] shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-black tracking-tight text-[#ff8a8e]">🚨 CẤP CỨU GẤP</div>
            <div className="text-xs text-[#fdecef]/70">
              {pendingDeathStat
                ? `${STAT_LABELS[pendingDeathStat]} đã chạm 0 — anh đang lịm dần!`
                : 'Tim đang ngừng đập!'}
            </div>
          </div>
          <div
            aria-label={`Còn ${timer.toFixed(1)} giây`}
            className="rounded-xl bg-black/60 px-3 py-1 font-mono text-2xl font-black tabular-nums text-[#ff5559]"
          >
            {timer.toFixed(1)}s
          </div>
        </div>

        {/* Huyết áp tim — cardiac pressure, constantly draining */}
        <div>
          <div className="mb-1 flex justify-between text-[11px] font-bold text-[#fdecef]/70">
            <span>🫀 Huyết áp tim</span>
            <span className="tabular-nums">{Math.round(pressure)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-black/50">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${pressure}%`,
                background:
                  pressure > 25
                    ? 'linear-gradient(90deg,#ff8a3d,#ffc53d)'
                    : 'linear-gradient(90deg,#e5484d,#ff5559)',
              }}
              animate={{ width: `${pressure}%` }}
              transition={{ duration: 0.15, ease: 'linear' }}
            />
          </div>
        </div>

        {/* ECG oscilloscope: moving sweep cursor + green sweet spot */}
        <div className="relative h-32 overflow-hidden rounded-2xl border border-[#1fd08a]/30 bg-black/70">
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full text-[#1fd08a]/25"
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
          >
            {Array.from({ length: 9 }, (_, i) => (
              <line
                key={i}
                x1={(i + 1) * 10}
                y1="0"
                x2={(i + 1) * 10}
                y2="32"
                stroke="currentColor"
                strokeWidth="0.2"
              />
            ))}
            <line x1="0" y1="16" x2="100" y2="16" stroke="currentColor" strokeWidth="0.25" />
          </svg>

          {/* ECG trace */}
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
          >
            <polyline
              points={Array.from({ length: 61 }, (_, i) => {
                const p = i / 60;
                return `${(p * 100).toFixed(1)},${(16 - ecgY(p) * 14).toFixed(2)}`;
              }).join(' ')}
              fill="none"
              stroke={lost ? '#e5484d' : '#1fd08a'}
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
              style={{ filter: 'drop-shadow(0 0 4px rgba(31,208,138,0.6))' }}
            />
            {lost && (
              <line
                x1="0"
                y1="16"
                x2="100"
                y2="16"
                stroke="#e5484d"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Green sweet zone (Vùng Xanh Sốc Điện) — repositions after each shock */}
          <div
            aria-hidden
            className="absolute inset-y-0"
            style={{
              left: `${spot * 100}%`,
              width: `${SWEET_SPOT * 100}%`,
              background: 'rgba(31,208,138,0.18)',
              borderLeft: '1px solid rgba(31,208,138,0.5)',
              borderRight: '1px solid rgba(31,208,138,0.5)',
              transition: 'left 0.25s ease-out',
            }}
          />

          {/* Sweep cursor — positioned imperatively every frame (ref) */}
          <div
            aria-hidden
            ref={cursorElRef}
            className="absolute inset-y-0"
            style={{
              left: '0%',
              width: '2px',
              background: 'linear-gradient(#fff,#1fd08a)',
              boxShadow: '0 0 8px 2px rgba(31,208,138,0.8)',
            }}
          />

          {lost && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-black tracking-widest text-[#ff5559]">
              TĨNH TIM 😱
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">
            {hits}/{HITS_NEEDED} ⚡ <span className="text-xs text-[#fdecef]/60">Sốc chính xác</span>
          </div>
          <div className="text-xs text-[#fdecef]/50">Bấm đúng VÙNG XANH ⚡</div>
        </div>

        {/* Defibrillator pad — pointerdown fires the shock: zero-latency on touch. */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            fireShock();
          }}
          onContextMenu={(e) => e.preventDefault()}
          disabled={phase !== 'playing'}
          style={{ touchAction: 'manipulation' }}
          className="relative w-full select-none rounded-2xl bg-gradient-to-b from-[#ff8a3d] to-[#e5484d] py-4 text-xl font-black tracking-wide text-white shadow-lg shadow-[#e5484d]/40 active:scale-[0.97] disabled:opacity-40"
        >
          SỐC ĐIỆN ⚡
        </button>

        {/* Impact flashes */}
        <AnimatePresence>
          {fx === 'hit' && (
            <motion.div
              key="hit-fx"
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background:
                  'radial-gradient(circle at 50% 40%, rgba(255,244,180,0.9), rgba(255,214,79,0.35) 40%, transparent 70%)',
              }}
            >
              <span className="absolute left-[12%] top-[20%] text-2xl">⚡</span>
              <span className="absolute right-[14%] top-[30%] text-xl">⚡</span>
              <span className="absolute left-[22%] bottom-[24%] text-3xl">⚡</span>
            </motion.div>
          )}
          {fx === 'miss' && (
            <motion.div
              key="miss-fx"
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 rounded-3xl bg-[#e5484d]/30"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {won && (
            <motion.div
              key="won"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-[#1fd08a]/15 p-3 text-center text-sm font-bold text-[#1fd08a]"
            >
              😮‍💨 Anh đã quay lại! Cấp cứu thành công!
            </motion.div>
          )}
          {lost && (
            <motion.div
              key="lost"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-[#e5484d]/15 p-3 text-center text-sm font-bold text-[#ff8a8e]"
            >
              Máy phát hiện tim tĩnh… 😞
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
