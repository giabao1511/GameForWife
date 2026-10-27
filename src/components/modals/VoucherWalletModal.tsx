'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Lock, Send } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { VOUCHERS_DATA, type VoucherDef } from '@/data/vouchers';
import { playItemPop } from '@/lib/audio';
import { cn } from '@/lib/cn';

/** Format an ISO timestamp as "14:02 · 28/10" — the stamp's fine print. */
function stampTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} · ${dd}/${mo}`;
}

type ShareResult = 'shared' | 'sms' | 'copied' | 'failed';

const SHARE_HINTS: Record<ShareResult, string> = {
  shared: 'Đã gửi cho anh 💌',
  sms: 'Đã mở tin nhắn cho anh 💬',
  copied: 'Đã sao chép — dán vào Zalo / SMS nhé',
  failed: 'Không gửi được — sao chép thủ công nhé',
};

/**
 * "Gửi cho Anh" claim chain, richest path first:
 *  1. Web Share API — native sheet (Zalo / iMessage / SMS on mobile)
 *  2. sms: URI with the claim message pre-filled (mobile only)
 *  3. Clipboard copy — desktop / last resort
 */
async function shareClaim(message: string): Promise<ShareResult> {
  if (typeof navigator === 'undefined') return 'failed';

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && (nav.canShare ? nav.canShare({ text: message }) : true)) {
    try {
      await nav.share({ text: message });
      return 'shared';
    } catch (error) {
      // Dismissing the share sheet is not a failure — fall through to sms:/clipboard.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        /* capability probe lied; keep going */
      }
    }
  }

  if (/Android|iPhone|iPad/.test(navigator.userAgent)) {
    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
    return 'sms';
  }

  try {
    await navigator.clipboard.writeText(message);
    return 'copied';
  } catch {
    return 'failed';
  }
}

type TicketState = 'available' | 'redeemed' | 'locked';

interface TicketProps {
  voucher: VoucherDef;
  state: TicketState;
  redeemedAt?: string;
  index: number;
}

/** One perforated coupon ticket in the wallet. */
function VoucherTicket({ voucher, state, redeemedAt, index }: TicketProps) {
  const redeemVoucher = useGameStore((s) => s.redeemVoucher);
  /** Springs the stamp live on THIS session's redemption. */
  const [stamped, setStamped] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleRedeem = () => {
    redeemVoucher(voucher.id);
    setStamped(true);
    setShareResult(null);
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    const result = await shareClaim(voucher.claimMessage);
    setShareResult(result);
    if (result === 'copied') playItemPop();
    setSharing(false);
  };

  const isRedeemed = state === 'redeemed';
  const isLocked = state === 'locked';

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'relative flex overflow-hidden rounded-xl border shadow-sm',
        isRedeemed
          ? 'border-[#d8cfbf] bg-[#efe8dd]'
          : isLocked
            ? 'border-[#e3d9c9] bg-[#f4efe6]'
            : 'border-[#f0e0c0] bg-[#fff9f0]',
      )}
      aria-label={voucher.title}
    >
      {/* ── Ticket stub: the perforated left half ── */}
      <div
        className={cn(
          'flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-r-2 border-dashed py-3',
          isRedeemed
            ? 'border-[#d8cfbf] bg-[#e8e0d2]'
            : isLocked
              ? 'border-[#e3d9c9] opacity-60'
              : 'border-[#f0e0c0]',
        )}
      >
        <span className={cn('text-3xl', isLocked && 'opacity-40 grayscale')} aria-hidden>
          {voucher.icon}
        </span>
        <span
          className={cn(
            'text-[8px] font-black uppercase tracking-[0.18em]',
            isRedeemed ? 'text-[#4a3f35]/40' : isLocked ? 'text-[#4a3f35]/35' : 'text-[#f5a623]',
          )}
        >
          Voucher
        </span>
        {/* Punch holes at the seam (clipped to half circles by overflow-hidden). */}
        <span
          aria-hidden
          className="absolute left-16 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fdfbf7]"
        />
        <span
          aria-hidden
          className="absolute left-16 bottom-0 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#fdfbf7]"
        />
      </div>

      {/* ── Body: content + action ── */}
      <div className="relative flex-1 p-3 pl-3.5">
        <h3
          className={cn(
            'text-sm font-black leading-tight',
            isRedeemed
              ? 'text-[#4a3f35]/50'
              : isLocked
                ? 'text-[#4a3f35]/45'
                : 'text-[#4a3f35]',
          )}
        >
          {voucher.title}
        </h3>
        <p
          className={cn(
            'mt-1 text-xs leading-snug',
            isRedeemed || isLocked ? 'text-[#4a3f35]/40' : 'text-[#4a3f35]/65',
          )}
        >
          {voucher.description}
        </p>

        {isLocked && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-[#4a3f35]/50">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Mở khóa khi sống sót đến Ngày {voucher.requiredDay}
          </div>
        )}

        {state === 'available' && (
          <button
            onClick={handleRedeem}
            className="mt-2.5 w-full rounded-lg bg-[#4a3f35] px-3 py-2 text-xs font-bold text-[#fdfbf7] transition-transform active:scale-95"
          >
            ✂️ Sử Dụng Ngay
          </button>
        )}

        {isRedeemed && (
          <div className="mt-2.5 flex flex-col gap-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-[#4a3f35] bg-white px-3 py-2 text-xs font-bold text-[#4a3f35] transition-transform active:scale-95 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Gửi cho Anh
            </button>
            {shareResult && (
              <p className="text-center text-[11px] font-semibold text-[#f5a623]" aria-live="polite">
                {SHARE_HINTS[shareResult]}
              </p>
            )}
          </div>
        )}

        {/* ── ĐÃ DÙNG stamp: springs in on live redemption, static for restored ── */}
        <AnimatePresence>
          {(stamped || isRedeemed) && (
            <motion.div
              key="stamp"
              initial={stamped ? { opacity: 0, scale: 1.7, rotate: -12 } : { opacity: 1, scale: 1, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: -12 }}
              exit={{ opacity: 0 }}
              transition={stamped ? { type: 'spring', stiffness: 500, damping: 14 } : { duration: 0 }}
              className="pointer-events-none absolute bottom-2 right-2 z-10 select-none"
              role="img"
              aria-label={`Đã dùng ${voucher.title}${redeemedAt ? ` lúc ${stampTime(redeemedAt)}` : ''}`}
            >
              <div className="rounded-md border-[3px] border-[#e5484d] bg-white/40 px-3 py-1 text-center">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#e5484d]">ĐÃ DÙNG</p>
                {redeemedAt && (
                  <p className="text-[8px] font-bold tracking-wider text-[#e5484d]/80">{stampTime(redeemedAt)}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export default function VoucherWalletModal() {
  const open = useGameStore((s) => s.isVoucherWalletOpen);
  const close = useGameStore((s) => s.closeVoucherWallet);
  const day = useGameStore((s) => s.day);
  const isVictory = useGameStore((s) => s.isVictory);
  const wallet = useGameStore((s) => s.voucherWallet);

  const isUnlocked = (v: VoucherDef) => day >= v.requiredDay || isVictory;
  const availableCount = VOUCHERS_DATA.filter((v) => isUnlocked(v) && !wallet[v.id]?.isRedeemed).length;

  const nextHint = (() => {
    if (isVictory) return 'Em đã phá đảo toàn bộ vé 🏆';
    const next = VOUCHERS_DATA.find((v) => day < v.requiredDay);
    return next ? `Sống sót đến Ngày ${next.requiredDay} để mở thêm vé` : 'Còn vài vé đang chờ em phá đảo';
  })();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="voucher-wallet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] flex items-center justify-center overflow-y-auto bg-[#4a3f35]/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Kho Voucher Của Em"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="my-auto w-full max-w-sm rounded-3xl bg-[#fdfbf7] p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-[#4a3f35]">
                <span aria-hidden>🎟️</span>
                Kho Voucher Của Em
              </h2>
              <button
                onClick={close}
                className="rounded-full border border-[#e3d9c9] p-1.5 text-[#4a3f35] transition-transform active:scale-90"
                aria-label="Đóng kho voucher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#f4efe6] px-3 py-1 text-xs font-bold text-[#4a3f35]">
              {availableCount}/{VOUCHERS_DATA.length} Voucher khả dụng
            </div>

            <div className="space-y-3">
              {VOUCHERS_DATA.map((voucher, i) => {
                const redeemed = wallet[voucher.id]?.isRedeemed;
                return (
                  <VoucherTicket
                    key={voucher.id}
                    voucher={voucher}
                    index={i}
                    state={redeemed ? 'redeemed' : isUnlocked(voucher) ? 'available' : 'locked'}
                    redeemedAt={redeemed ? wallet[voucher.id]?.redeemedAt : undefined}
                  />
                );
              })}
            </div>

            <p className="mt-4 text-center text-[11px] font-semibold text-[#4a3f35]/45">{nextHint}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
