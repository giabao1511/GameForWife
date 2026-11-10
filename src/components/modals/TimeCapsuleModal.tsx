'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, Lock, Heart, Image as ImageIcon, AudioLines, MailOpen } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { ENLISTMENT_CONFIG, TIME_CAPSULE_LETTERS, type TimeCapsuleLetter } from '@/data/militaryLetters';
import {
  getMilitaryTimeSnapshot,
  isLetterUnlocked,
  formatLetterDate,
} from '@/lib/militaryTime';
import { cn } from '@/lib/cn';

const SERIF = 'Georgia, "Times New Roman", serif';

/**
 * Time Capsule Mailbox (Hộp Thư Thời Gian).
 *
 * Two stacked views:
 *  1. The mailbox — discharge countdown banner + the chronological envelope
 *     timeline (unlocked envelopes vs. sealed/locked cards).
 *  2. The reader — a parchment-style full-letter view opened by selecting an
 *     unlocked envelope; opening one fires markLetterAsRead() (chime + haptic
 *     + persistence).
 *
 * The countdown numbers only render after `timeCapsuleHydrated` (post-mount),
 * keeping the SSR paint and first client render identical.
 */
export default function TimeCapsuleModal() {
  const open = useGameStore((s) => s.isTimeCapsuleOpen);
  const close = useGameStore((s) => s.closeTimeCapsule);
  const selectedLetterId = useGameStore((s) => s.selectedLetterId);
  const hydrated = useGameStore((s) => s.timeCapsuleHydrated);

  const selectedLetter = TIME_CAPSULE_LETTERS.find((l) => l.id === selectedLetterId) ?? null;

  return (
    <>
      <AnimatePresence>
        {open && !selectedLetter && (
          <MailboxView key="mailbox" onClose={close} hydrated={hydrated} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && selectedLetter && <LetterReader key="reader" letter={selectedLetter} />}
      </AnimatePresence>
    </>
  );
}

// ── 1. Mailbox ─────────────────────────────────────────────────────────────

function MailboxView({ onClose, hydrated }: { onClose: () => void; hydrated: boolean }) {
  const openLetter = useGameStore((s) => s.setSelectedLetter);
  const readLetters = useGameStore((s) => s.readLetters);
  const openSendMiss = useGameStore((s) => s.openSendMiss);
  const missCount = useGameStore((s) => s.missCount);
  const snapshot = hydrated ? getMilitaryTimeSnapshot() : null;
  // Fresh letters: unlocked and not yet read (drives the list + HUD badge).
  const freshCount = TIME_CAPSULE_LETTERS.filter((l) =>
    hydrated ? isLetterUnlocked(l) && !readLetters[l.id]?.isRead : false,
  ).length;

  return (
    <motion.div
      key="timecapsule"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#2e3425]/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Hộp thư thời gian"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, rotate: -0.5 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="my-auto flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-[#fdfbf7] shadow-2xl"
      >
        <CountdownBanner
          snapshot={snapshot}
          hydrated={hydrated}
          onSendMiss={openSendMiss}
          missCount={missCount}
        />

        <div className="flex items-center justify-between px-5 pt-3">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-[#3c442f]">
            <Mail className="h-5 w-5" aria-hidden />
            Hộp thư thời gian
          </h2>
          <div className="flex items-center gap-2">
            {freshCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e5484d] px-2 py-0.5 text-[10px] font-black text-white">
                {freshCount} MỚI 💌
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-full border border-[#dcd3bf] p-1.5 text-[#3c442f] transition-transform active:scale-90"
              aria-label="Đóng hộp thư thời gian"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="px-5 pt-1 text-xs text-[#3c442f]/60">
          Những lá thư anh viết trước, chờ đến ngày để em mở 📮
        </p>

        {/* The "Gửi Nỗi Nhớ" entry lives in the banner header (SendMissEntry
            below) with an anchored, auto-dismissing hint — so it is prominent
            and the main HUD stays light. */}

        <div className="mt-3 flex-1 space-y-3 overflow-y-auto px-5 pb-5 pt-1">
          {TIME_CAPSULE_LETTERS.map((letter, i) => {
            const unlocked = hydrated ? isLetterUnlocked(letter) : null;
            const isRead = readLetters[letter.id]?.isRead;
            return unlocked === true ? (
              <EnvelopeRow
                key={letter.id}
                letter={letter}
                index={i}
                isNew={!isRead}
                onOpen={() => openLetter(letter.id)}
              />
            ) : (
              <LockedRow key={letter.id} letter={letter} index={i} />
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Discharge countdown banner: army-green header, progress bar, live badge. */
function CountdownBanner({
  snapshot,
  hydrated,
  onSendMiss,
  missCount,
}: {
  snapshot: ReturnType<typeof getMilitaryTimeSnapshot> | null;
  hydrated: boolean;
  onSendMiss: () => void;
  missCount: number;
}) {
  return (
    <div
      className="relative overflow-hidden bg-[#4c5738] px-5 pb-4 pt-4 text-[#f4efe6]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 85% 10%, rgba(244,239,230,0.14), transparent 55%)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#f4efe6]/25 bg-[#f4efe6]/10 text-xl" aria-hidden>
            🎖️
          </span>
          <div>
            <p className="text-sm font-black leading-tight">Hành trình ra quân</p>
            <p className="text-[11px] text-[#f4efe6]/70">
              {formatLetterDate(ENLISTMENT_CONFIG.startDate)} → {formatLetterDate(ENLISTMENT_CONFIG.dischargeDate)}
            </p>
          </div>
        </div>
        <SendMissEntry onOpen={onSendMiss} count={missCount} />
      </div>

      {hydrated && snapshot ? (
        <>
          <div className="mt-3.5">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-[#f4efe6]/80">
                Đã hoàn thành {snapshot.daysServed} / {snapshot.totalDays} ngày
              </span>
              <span className="rounded-full bg-[#f4efe6]/15 px-1.5 py-0.5 text-[10px] font-black">
                {snapshot.progressPercentage}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-[#f4efe6]/20"
              role="progressbar"
              aria-valuenow={snapshot.progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến độ hoàn thành nghĩa vụ"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${snapshot.progressPercentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#c8d3a8] to-[#f4efe6]"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f4efe6]/12 px-3 py-2">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-[#a3e29c]"
                animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#a3e29c]" />
            </span>
            {snapshot.serviceComplete ? (
              <p className="text-[12px] font-bold">
                🎉 Hôm nay anh về bên em rồi!
              </p>
            ) : snapshot.beforeEnlistment ? (
              <p className="text-[12px] font-bold">
                Còn <span className="tabular-nums">{snapshot.daysUntilStart}</span> ngày nữa anh lên đường 🎖️
              </p>
            ) : (
              <p className="text-[12px] font-bold">
                Còn <span className="tabular-nums">{snapshot.daysRemaining}</span> ngày nữa anh về bên em ❤️
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-[11px] italic text-[#f4efe6]/60">Đang cập nhật ngày ra quân…</p>
      )}
    </div>
  );
}

/**
 * Prominent "Gửi Nỗi Nhớ" heart entry, placed in the mailbox banner header.
 * A pulsing heart button with a running counter badge, plus a first-run hint
 * chip anchored directly under the heart (not to the viewport) that auto-
 * dismisses after 3s or on first tap — so the main HUD stays light.
 */
function SendMissEntry({ onOpen, count }: { onOpen: () => void; count: number }) {
  const [hintVisible, setHintVisible] = useState(true);

  // Auto-dismiss the hint after 3s, or immediately on first interaction.
  useEffect(() => {
    const t = window.setTimeout(() => setHintVisible(false), 3000);
    return () => window.clearTimeout(t);
  }, []);

  const dismissHint = useCallback(() => setHintVisible(false), []);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => {
          onOpen();
          dismissHint();
        }}
        className="relative flex items-center gap-2 rounded-xl border border-[#f4efe6]/25 bg-[#f4efe6]/12 px-3 py-2 text-[#f4efe6] transition-transform active:scale-95"
        aria-label="Gửi nỗi nhớ cho anh"
      >
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-[#e5484d]" aria-hidden>
          <motion.span
            className="absolute inset-0 rounded-full bg-[#e5484d]"
            animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <Heart className="relative h-4 w-4 fill-white text-white" />
        </span>
        <span className="text-left">
          <span className="block text-[11px] font-black leading-tight">💖 Gửi nỗi nhớ</span>
          {count > 0 && (
            <span className="block text-[10px] text-[#f4efe6]/70 tabular-nums">{count} đã gửi</span>
          )}
        </span>
      </button>

      {/* Anchored hint chip: sits under the heart button, inside the banner. */}
      <AnimatePresence>
        {hintVisible && (
          <motion.div
            key="send-miss-hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            role="tooltip"
            className="absolute right-0 top-full z-10 mt-2 w-max max-w-[220px] rounded-lg border border-[#f4efe6]/25 bg-[#2e3425] px-3 py-2 text-[11px] font-semibold text-[#f4efe6] shadow-lg"
            onClick={dismissHint}
          >
            Nhấn giữ trái tim để gửi một cái ôm ❤️
            <span
              aria-hidden
              className="absolute -top-1 right-4 h-2 w-2 rotate-45 bg-[#2e3425]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Unlocked letter: vintage envelope with a stamp corner + wax seal. */
function EnvelopeRow({
  letter,
  index,
  isNew,
  onOpen,
}: {
  letter: TimeCapsuleLetter;
  index: number;
  isNew: boolean;
  onOpen: () => void;
}) {
  const tilted = index % 2 === 0;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpen}
      className={cn(
        'relative w-full rounded-xl border border-[#e0d6bf] bg-[#f8f4e9] p-3 text-left shadow-sm transition-transform active:scale-[0.98]',
        tilted ? '-rotate-1' : 'rotate-1',
      )}
    >
      {/* stamp corner */}
      <span
        aria-hidden
        className="absolute right-2 top-2 grid h-7 w-6 place-items-center rounded-[2px] border border-dashed border-[#4c5738]/50 bg-[#eee7d3] text-[11px]"
      >
        💌
      </span>

      <div className="flex items-center gap-1.5 pr-9">
        {isNew ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e5484d] px-2 py-0.5 text-[9px] font-black text-white">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-white"
                animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            MỚI
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#4c5738]/12 px-2 py-0.5 text-[9px] font-black text-[#4c5738]">
            <MailOpen className="h-3 w-3" aria-hidden /> ĐÃ MỞ
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#3c442f]/45">
          {letter.milestoneTitle}
        </span>
      </div>

      <p className="mt-1.5 pr-6 text-[13px] font-bold leading-snug text-[#3c442f]" style={{ fontFamily: SERIF }}>
        {letter.title}
      </p>
      <p className="mt-0.5 line-clamp-1 pr-6 text-[11px] italic text-[#3c442f]/55" style={{ fontFamily: SERIF }}>
        {letter.previewExcerpt}
      </p>
    </motion.button>
  );
}

/** Locked letter: frosted, sealed card with the unlock date. */
function LockedRow({ letter, index }: { letter: TimeCapsuleLetter; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'rounded-xl border border-[#d9d3c2] bg-[#f4f1e8]/60 p-3 backdrop-blur-[2px]',
        index % 2 === 0 ? '-rotate-1' : 'rotate-1',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#3c442f]/10 text-[#3c442f]/50">
          <Lock className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold leading-snug text-[#3c442f]/50" style={{ fontFamily: SERIF }}>
            {letter.milestoneTitle}
          </p>
          <p className="text-[10px] text-[#3c442f]/40">
            Mở khóa vào ngày {formatLetterDate(letter.unlockDate)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] italic text-[#3c442f]/45">
        Đang niêm phong… Hãy kiên nhẫn đợi anh nhé! 🔒
      </p>
    </motion.div>
  );
}

// ── 2. Full letter reader ──────────────────────────────────────────────────

function LetterReader({ letter }: { letter: TimeCapsuleLetter }) {
  const closeReader = useGameStore((s) => s.setSelectedLetter);
  const markLetterAsRead = useGameStore((s) => s.markLetterAsRead);
  const readAt = useGameStore((s) => s.readLetters[letter.id]);

  return (
    <motion.div
      key="letter-reader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#2e3425]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={letter.title}
    >
      <motion.div
        initial={{ scale: 0.85, y: 24, rotate: -1.5 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="relative my-auto w-full max-w-sm overflow-hidden rounded-sm bg-[#fdfbf7] shadow-2xl"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(74,63,53,0.018) 0 2px, transparent 2px 4px)',
        }}
        onClick={() => {
          // Opening the reader counts as reading the letter — fires the chime
          // + haptic + persistence exactly once (markLetterAsRead is idempotent).
          if (!readAt?.isRead) markLetterAsRead(letter.id);
        }}
      >
        {/* paper edge */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, #4c5738, #b6572e, #e5484d, #b6572e, #4c5738)' }}
        />

        <div className="px-6 pb-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4c5738]">
                🎖️ {letter.milestoneTitle}
              </p>
              <p className="pt-1 text-[11px] italic text-[#3c442f]/50" style={{ fontFamily: SERIF }}>
                {readAt?.readAt
                  ? `Em đã đọc ngày ${new Date(readAt.readAt).toLocaleDateString('vi-VN')}`
                  : `Viết cho em · ${formatLetterDate(letter.unlockDate)}`}
              </p>
            </div>
            <button
              onClick={() => closeReader(null)}
              className="shrink-0 rounded-full border border-[#dcd3bf] p-1.5 text-[#3c442f] transition-transform active:scale-90"
              aria-label="Gập thư lại"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="pt-3 text-lg font-black leading-snug text-[#3c442f]" style={{ fontFamily: SERIF }}>
            {letter.title}
          </h3>

          <div className="pt-4 text-[14px] leading-relaxed text-[#3c442f]/90" style={{ fontFamily: SERIF }}>
            {letter.fullLetter.split('\n\n').map((para, i) => (
              <p key={i} className={i === 0 ? '' : 'pt-3'}>
                {para}
              </p>
            ))}
          </div>

          {letter.attachedPhotoUrl && (
            <figure className="pt-4">
              <div className="rounded-sm border-4 border-white shadow-md">
                <img
                  src={letter.attachedPhotoUrl}
                  alt={`Ảnh kỷ niệm: ${letter.milestoneTitle}`}
                  className="w-full rounded-sm"
                  loading="lazy"
                />
              </div>
              <figcaption className="pt-1.5 text-center text-[10px] italic text-[#3c442f]/50" style={{ fontFamily: SERIF }}>
                ️ {letter.milestoneTitle}
              </figcaption>
            </figure>
          )}

          {letter.audioNoteUrl && (
            <div className="flex items-center gap-2 rounded-lg bg-[#f4f1e8] px-3 py-2.5">
              <AudioLines className="h-4 w-4 shrink-0 text-[#4c5738]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-[#3c442f]">Thu âm của anh</p>
                <p className="text-[10px] text-[#3c442f]/50">Nhấn để nghe lời nhắn thoại</p>
              </div>
              <audio controls src={letter.audioNoteUrl} className="h-8 w-full max-w-[180px]" preload="none" />
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-4 text-[#3c442f]/40">
            <ImageIcon className="h-3.5 w-3.5 rotate-90" aria-hidden />
            <span className="text-[10px] italic" style={{ fontFamily: SERIF }}>
              — Anh, từ doanh trại
            </span>
          </div>

          <button
            onClick={() => closeReader(null)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#4c5738] px-4 py-2.5 text-sm font-bold text-[#f4efe6] transition-transform active:scale-95"
          >
            <Heart className="h-4 w-4" aria-hidden />
            Gập thư lại
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
