'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { useGameStore, VICTORY_DAY } from '@/store/useGameStore';
import { CHAPTER1_ALL } from '@/data/cards/chapter1Extra';
import { LOVE_VOUCHERS } from '@/data/vouchers';
import { playVictoryFanfare } from '@/lib/audio';
import { cn } from '@/lib/cn';

const CONFETTI_COLORS = ['#f5d68a', '#c9e4ca', '#f7f1e1', '#f6c6cf', '#f5a623'];

export default function VictoryModal() {
  const isVictory = useGameStore((s) => s.isVictory);
  const day = useGameStore((s) => s.day);
  const redeemedVoucherIds = useGameStore((s) => s.redeemedVoucherIds);
  const redeemLoveVoucher = useGameStore((s) => s.redeemLoveVoucher);
  const resetVouchers = useGameStore((s) => s.resetVouchers);
  const restartGame = useGameStore((s) => s.restartGame);
  const firedRef = useRef(false);
  const [confirmReset, setConfirmReset] = useState(false);
  /** Polaroid export: the live DOM node + a busy flag for the share button. */
  const polaroidRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const fireConfetti = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.4 },
      colors: CONFETTI_COLORS,
      scalar: 1.1,
    });
    const followUp = window.setTimeout(
      () =>
        confetti({
          particleCount: 90,
          spread: 110,
          origin: { y: 0.55 },
          colors: CONFETTI_COLORS,
        }),
      500,
    );
    playVictoryFanfare();
    return followUp;
  }, []);

  useEffect(() => {
    if (!isVictory) {
      firedRef.current = false;
      return;
    }
    const t = fireConfetti();
    return () => window.clearTimeout(t);
  }, [isVictory, fireConfetti]);

  const redeemedCount = LOVE_VOUCHERS.filter((v) => redeemedVoucherIds.includes(v.id)).length;
  const survivesDays = Math.min(day, VICTORY_DAY - 1); // 14 full days survived on Day 15
  const title =
    survivesDays >= 14 ? 'Bạn Gái Kiên Nhẫn Nhất Hệ Mặt Trời' : 'Người Dựng Anh Lên Từ Xa';

  /**
   * Render the Polaroid DOM card into a high-res PNG, then offer the
   * richest path the browser supports:
   *  1. navigator.share (Web Share API, level 2 — shares the file, perfect
   *     for "khoe story" on mobile)
   *  2. plain download (desktop / browsers without file share)
   */
  const savePolaroid = useCallback(async () => {
    if (!polaroidRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(polaroidRef.current, {
        pixelRatio: 3, // crisp on retina; ~3x for story-sized exports
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'ban-gai-kien-nhan.png', { type: 'image/png' });

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Boyfriend Survival Simulator', text: 'Tôi sống sót 14 ngày 💀❤️' });
      } else {
        // Desktop / no file-share: trigger a native download.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ban-gai-kien-nhan.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (error) {
      // Share was dismissed (or export failed) — stay silent, stay calm.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Polaroid export failed', error);
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return (
    <AnimatePresence>
      {isVictory && (
        <motion.div
          key="victory"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#4a3f35]/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="my-auto w-full max-w-sm rounded-3xl bg-[#fdfbf7] p-6 text-center shadow-2xl"
          >
            <div className="text-6xl" aria-hidden>
              🏆
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#4a3f35]">Sống sót 14 ngày!</h2>

            {/* ── Shareable Polaroid recap card ─────────────────────
                A self-contained "photo" the player can snap and save to
                their photo library / story. Exported at 3x via html-to-image. */}
            <div
              ref={polaroidRef}
              className="mx-auto mt-4 w-full max-w-[300px] rounded-md bg-[#f7f1e1] p-3 pb-2 shadow-[0_10px_30px_rgba(74,63,53,0.35)] ring-1 ring-[#e8dfd5]"
              style={{ backgroundImage: 'radial-gradient(rgba(74,63,53,0.05) 1px, transparent 1px)', backgroundSize: '8px 8px' }}
            >
              <div className="relative bg-white p-4 text-center shadow-sm">
                {/* Cute corner seal */}
                <div className="absolute -top-3 -right-3 flex h-12 w-12 -rotate-12 items-center justify-center rounded-full border-4 border-[#e5484d] bg-[#f6c6cf] text-[9px] font-black uppercase leading-tight text-[#e5484d] shadow-md">
                  Sống
                  <br />
                  sót 💀
                </div>
                <div className="text-5xl" aria-hidden>
                  🥰
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a3f35]/50">
                  Boyfriend Survival
                </p>
                <h3 className="mt-1 text-lg font-black leading-snug text-[#4a3f35]">{title}</h3>
                <div className="mt-3 flex items-center justify-center gap-3 text-xs font-bold text-[#4a3f35]">
                  <span>📅 {survivesDays}/14 ngày</span>
                  <span className="text-[#4a3f35]/30">•</span>
                  <span>🎟️ {redeemedCount} voucher</span>
                </div>
                <p className="mt-2 text-[10px] italic text-[#4a3f35]/50">
                  — ký: người sống sót duy nhất ngày {survivesDays}
                </p>
              </div>
            </div>

            <button
              onClick={savePolaroid}
              disabled={saving}
              className="mx-auto mt-3 flex items-center gap-1.5 rounded-full bg-[#4a3f35] px-4 py-2 text-xs font-bold text-[#fdfbf7] transition-transform active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Đang tạo ảnh…' : '📸 Lưu ảnh khoe Story'}
            </button>

            <p className="mx-auto mt-3 max-w-[17rem] rounded-2xl border-2 border-dashed border-[#c9e4ca] bg-[#c9e4ca]/30 p-3 text-left text-sm leading-relaxed text-[#4a3f35]/90">
              Gửi cô gái ấy,
              <br />
              Cô đã đưa anh qua 14 ngày hỗn loạn — giữa những câu &ldquo;Em có sao đâu&rdquo;,
              những đêm khuya, những ly trà sữa và những cú vuốt &ldquo;Kệ anh&rdquo;. Anh vẫn
              đứng đây, còn nguyên vẹn (gần như). Đây là phần thưởng cho cô:
            </p>

            <div className="mt-4 space-y-2 text-left">
              {LOVE_VOUCHERS.map((voucher) => {
                const redeemed = redeemedVoucherIds.includes(voucher.id);
                return (
                  <button
                    key={voucher.id}
                    onClick={() => redeemLoveVoucher(voucher.id)}
                    disabled={redeemed}
                    className={cn(
                      'relative w-full overflow-hidden rounded-xl border-2 border-dashed p-3 text-left transition-transform',
                      redeemed
                        ? 'border-[#b8ac98] bg-[#efe8dd]'
                        : 'border-[#f5a623] bg-white hover:scale-[1.01] active:scale-[0.99]',
                    )}
                    aria-pressed={redeemed}
                  >
                    <span className="flex items-start gap-2">
                      <span className="text-xl" aria-hidden>
                        {voucher.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-[#4a3f35]">{voucher.title}</span>
                        <span className="block text-xs text-[#4a3f35]/60">{voucher.note}</span>
                      </span>
                    </span>
                    <AnimatePresence>
                      {redeemed && (
                        <motion.span
                          initial={{ opacity: 0, scale: 1.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute right-2 top-2 rotate-6 rounded border-2 border-[#e5484d] px-1.5 py-0.5 text-[10px] font-black tracking-widest text-[#e5484d]"
                        >
                          ĐÃ KÍCH HOẠT
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs font-semibold text-[#4a3f35]/50">
              {redeemedCount}/{LOVE_VOUCHERS.length} voucher đã kích hoạt
            </p>

            {redeemedCount > 0 && (
              <div className="mt-2 flex items-center justify-center gap-2">
                {confirmReset ? (
                  <>
                    <span className="text-xs font-semibold text-[#4a3f35]/70">Đổi lại từ đầu?</span>
                    <button
                      onClick={() => {
                        resetVouchers();
                        setConfirmReset(false);
                      }}
                      className="rounded-lg bg-[#e5484d] px-3 py-1 text-xs font-bold text-white"
                    >
                      Có
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="rounded-lg border border-[#e3d9c9] px-3 py-1 text-xs font-bold text-[#4a3f35]"
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="text-xs font-semibold text-[#4a3f35]/50 underline underline-offset-2"
                  >
                    Reset All Vouchers
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => restartGame(CHAPTER1_ALL)}
                className="flex-1 rounded-2xl bg-[#4a3f35] px-4 py-3 text-sm font-bold text-[#fdfbf7] transition-transform active:scale-95"
              >
                Yêu lại từ đầu ↻
              </button>
              <button
                onClick={() => useGameStore.getState().toggleDeathGallery()}
                className="rounded-2xl border-2 border-[#e3d9c9] px-4 py-3 text-sm font-bold text-[#4a3f35] transition-transform active:scale-95"
              >
                📖
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
