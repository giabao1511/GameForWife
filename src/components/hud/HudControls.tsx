'use client';

import { BookOpen, Camera, Ticket, Volume2, VolumeX, Zap } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useUiStore } from '@/store/useUiStore';
import { MEMORIES_DATA } from '@/data/memories';
import { VOUCHERS_DATA } from '@/data/vouchers';
import { unlockAudio } from '@/lib/audio';
import { cn } from '@/lib/cn';

const IS_DEV = process.env.NODE_ENV === 'development';

/** Top-right controls: mute the ASMR engine, open the Voucher Wallet, open the
 * Death Gallery, open the Memories Scrapbook, and (dev only) instant victory. */
export default function HudControls() {
  const toggleDeathGallery = useGameStore((s) => s.toggleDeathGallery);
  const unlockedDeathIds = useGameStore((s) => s.unlockedDeathIds);
  const openScrapbook = useGameStore((s) => s.openScrapbook);
  const unlockedMemoryIds = useGameStore((s) => s.unlockedMemoryIds);
  const openVoucherWallet = useGameStore((s) => s.openVoucherWallet);
  const day = useGameStore((s) => s.day);
  const isVictory = useGameStore((s) => s.isVictory);
  const voucherWallet = useGameStore((s) => s.voucherWallet);
  const triggerInstantVictory = useGameStore((s) => s.triggerInstantVictory);
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
          className="relative flex items-center gap-1 rounded-lg border border-[#e3d9c9] bg-white p-1.5 text-[#4a3f35] transition-colors hover:bg-[#fdfbf7]"
          aria-label="Kho voucher"
        >
          <Ticket className="h-4 w-4" />
          <span className="text-xs font-bold">🎟️ Voucher</span>
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
          onClick={toggleDeathGallery}
          className="flex items-center gap-1 rounded-lg border border-[#e3d9c9] bg-white p-1.5 text-[#4a3f35] transition-colors hover:bg-[#fdfbf7]"
          aria-label="Sổ tay cái chết"
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-xs font-bold">📖 {unlockedDeathIds.length}/8</span>
        </button>

        <button
          onClick={openScrapbook}
          className="flex items-center gap-1 rounded-lg border border-[#e3d9c9] bg-white p-1.5 text-[#4a3f35] transition-colors hover:bg-[#fdfbf7]"
          aria-label="Sổ kỷ niệm"
        >
          <Camera className="h-4 w-4" />
          <span className="text-xs font-bold">📷 {unlockedMemoryIds.length}/{MEMORIES_DATA.length}</span>
        </button>
      </div>

      {IS_DEV && (
        <button
          onClick={handleInstantVictory}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-lg border-2 border-dashed border-[#f5a623] bg-white p-1.5 text-[#f5a623] shadow-lg transition-colors hover:bg-[#fdfbf7]"
          aria-label="Dev: nhảy thẳng tới màn hình chiến thắng"
          title="Dev shortcut: xem màn hình Victory ngay"
        >
          <Zap className="h-4 w-4" />
          <span className="text-xs font-bold">Victory</span>
        </button>
      )}
    </>
  );
}
