'use client';

import { BookOpen, Camera, Mail, Ticket, Volume2, VolumeX, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useUiStore } from '@/store/useUiStore';
import { MEMORIES_DATA } from '@/data/memories';
import { VOUCHERS_DATA } from '@/data/vouchers';
import { TIME_CAPSULE_LETTERS } from '@/data/militaryLetters';
import { isLetterUnlocked } from '@/lib/militaryTime';
import { unlockAudio } from '@/lib/audio';
import { cn } from '@/lib/cn';
import {
  PERIODS,
  PERIOD_THEMES,
  periodToTimeSlot,
  type RealTimePeriod,
} from '@/lib/timeContext';

// Render the dev controls in every non-production environment (dev + test),
// never in the shipped build.
const IS_DEV = process.env.NODE_ENV !== 'production';

/** Ambient-period dev override rows (icon + Vietnamese label) for the toggle. */
const PERIOD_OPTIONS: Array<{ value: RealTimePeriod; label: string }> = PERIODS.map((p) => ({
  value: p,
  label: PERIOD_THEMES[p].label,
}));

/** Top-right controls: mute the ASMR engine, open the Voucher Wallet, open the
 * Death Gallery, open the Memories Scrapbook, and (dev only) instant victory. */
export default function HudControls() {
  const toggleDeathGallery = useGameStore((s) => s.toggleDeathGallery);
  const unlockedDeathIds = useGameStore((s) => s.unlockedDeathIds);
  const openScrapbook = useGameStore((s) => s.openScrapbook);
  const unlockedMemoryIds = useGameStore((s) => s.unlockedMemoryIds);
  const openTimeCapsule = useGameStore((s) => s.openTimeCapsule);
  const timeCapsuleHydrated = useGameStore((s) => s.timeCapsuleHydrated);
  const readLetters = useGameStore((s) => s.readLetters);
  // Unread fresh letters: unlocked by the real clock but not yet read. Gated
  // on hydration so the badge (and isLetterUnlocked's new Date()) is only
  // evaluated after mount — the first SSR/HTML paint shows no badge.
  const freshLetters = timeCapsuleHydrated
    ? TIME_CAPSULE_LETTERS.filter((l) => isLetterUnlocked(l) && !readLetters[l.id]?.isRead).length
    : 0;
  const openVoucherWallet = useGameStore((s) => s.openVoucherWallet);
  const day = useGameStore((s) => s.day);
  const isVictory = useGameStore((s) => s.isVictory);
  const voucherWallet = useGameStore((s) => s.voucherWallet);
  const triggerInstantVictory = useGameStore((s) => s.triggerInstantVictory);
  const setTimeSlot = useGameStore((s) => s.setTimeSlot);
  const devPeriodOverride = useUiStore((s) => s.devPeriodOverride);
  const setDevPeriodOverride = useUiStore((s) => s.setDevPeriodOverride);
  const muted = useUiStore((s) => s.muted);
  const setMutedState = useUiStore((s) => s.setMutedState);

  // Red badge: unlocked (day milestone or victory) AND not yet redeemed.
  const pendingVouchers = VOUCHERS_DATA.filter(
    (v) => (day >= v.requiredDay || isVictory) && !voucherWallet[v.id]?.isRedeemed,
  ).length;

  function handleInstantVictory() {
    unlockAudio(); // make sure the fanfare the modal plays actually sounds
    triggerInstantVictory();
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setMutedState(!muted)}
          className={cn(
            'rounded-lg border p-1.5 text-[#4a3f35] transition-colors',
            muted ? 'border-[#e3d9c9] bg-white' : 'border-[#4a3f35] bg-[#4a3f35] text-[#fdfbf7]',
          )}
          aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button
          onClick={openVoucherWallet}
          className="relative rounded-lg border border-[#e3d9c9] bg-white p-1.5 text-[#4a3f35] transition-colors hover:bg-[#fdfbf7]"
          aria-label="Kho voucher"
          title="🎟️ Voucher"
        >
          <Ticket className="h-4 w-4" />
          {pendingVouchers > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e5484d] px-1 text-[9px] font-black text-white shadow-sm"
              aria-hidden
            >
              {pendingVouchers}
            </span>
          )}
        </button>

        <button
          onClick={openTimeCapsule}
          className="relative rounded-lg border border-[#e3d9c9] bg-white p-1.5 text-[#4a3f35] transition-colors hover:bg-[#fdfbf7]"
          aria-label="Hộp thư thời gian"
          title="💌 Thư tình & đếm ngược ngày ra quân"
        >
          <Mail className="h-4 w-4" />
          <AnimatePresence>
            {freshLetters > 0 && (
              <motion.span
                key="ping"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e5484d] px-1 text-[9px] font-black text-white shadow-sm"
                aria-hidden
              >
                <span className="relative flex h-2 w-2" aria-hidden>
                  <motion.span
                    className="absolute inline-flex h-full w-full rounded-full bg-white"
                    animate={{ scale: [1, 2.4], opacity: [0.9, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={toggleDeathGallery}
          className="flex items-center gap-0.5 rounded-lg border border-[#e3d9c9] bg-white p-1.5 text-[#4a3f35] transition-colors hover:bg-[#fdfbf7]"
          aria-label="Sổ tay cái chết"
          title="📖 Sổ tay cái chết"
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-[11px] font-bold tabular-nums">{unlockedDeathIds.length}/8</span>
        </button>

        <button
          onClick={openScrapbook}
          className="flex items-center gap-0.5 rounded-lg border border-[#e3d9c9] bg-white p-1.5 text-[#4a3f35] transition-colors hover:bg-[#fdfbf7]"
          aria-label="Sổ kỷ niệm"
          title="📷 Sổ kỷ niệm"
        >
          <Camera className="h-4 w-4" />
          <span className="text-[11px] font-bold tabular-nums">{unlockedMemoryIds.length}/{MEMORIES_DATA.length}</span>
        </button>
      </div>

      {IS_DEV && (
        <>
          <button
            onClick={handleInstantVictory}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-lg border-2 border-dashed border-[#f5a623] bg-white p-1.5 text-[#f5a623] shadow-lg transition-colors hover:bg-[#fdfbf7]"
            aria-label="Dev: nhảy thẳng tới màn hình chiến thắng"
            title="Dev shortcut: xem màn hình Victory ngay"
          >
            <Zap className="h-4 w-4" />
            <span className="text-xs font-bold">Victory</span>
          </button>

          {/* Real-time ambience preview: toggle the active period to force all
              four themes + deck draws at once. Picking a period also snaps
              the in-game slot so the card pool matches the previewed theme.
              "Auto" returns to the real clock. */}
          <div
            className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-lg border-2 border-dashed border-[#b9a8ff] bg-white p-1 shadow-lg"
            role="group"
            aria-label="Dev: xem trước bối cảnh theo giờ"
          >
            {PERIOD_OPTIONS.map(({ value, label }) => {
              const active = devPeriodOverride === value;
              return (
                <button
                  key={value}
                  onClick={() => {
                    unlockAudio();
                    setDevPeriodOverride(value);
                    // Match the deck pool to the previewed ambience.
                    setTimeSlot(periodToTimeSlot(value));
                  }}
                  className={cn(
                    'rounded px-1.5 py-1 text-sm transition-colors',
                    active ? 'bg-[#4a3f35]' : 'bg-transparent',
                  )}
                  aria-pressed={active}
                  aria-label={PERIOD_THEMES[value].icon}
                  title={`Dev: xem ${label}`}
                >
                  {PERIOD_THEMES[value].icon}
                </button>
              );
            })}
            <button
              onClick={() => {
                unlockAudio();
                setDevPeriodOverride(null);
              }}
              className={cn(
                'rounded px-1.5 py-1 text-xs font-bold transition-colors',
                devPeriodOverride === null
                  ? 'bg-[#4a3f35] text-[#fdfbf7]'
                  : 'bg-transparent text-[#4a3f35]/70',
              )}
              aria-pressed={devPeriodOverride === null}
              aria-label="Auto"
              title="Dev: theo giờ thật"
            >
              Auto
            </button>
          </div>
        </>
      )}
    </>
  );
}
