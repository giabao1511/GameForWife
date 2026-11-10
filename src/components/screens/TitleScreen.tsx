'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import AvatarReaction from '@/components/card/AvatarReaction';
import InstallGuideModal from '@/components/modals/InstallGuideModal';
import AmbientBackground from './AmbientBackground';
import { useGameStore } from '@/store/useGameStore';
import { useActiveTheme } from '@/components/effects/useActiveTheme';
import { cn } from '@/lib/cn';

const INSTALL_DISMISS_KEY = 'bf_sim_install_guide_dismissed';

/** True when the page runs as an installed PWA (no browser chrome). */
function isStandalone() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  // iOS exposes no `display-mode` media query, so match its legacy alias too.
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(-webkit-display-mode: standalone)').matches
  );
}

/**
 * Title / Start screen — the first thing a player sees.
 *
 * A cozy visual-novel menu: an idle, gently breathing chibi in the center, the
 * big "NUÔI ANH" wordmark, and a stack of tactile rounded buttons. The primary
 * CTA resumes an in-progress run (or starts Day 1) and reads "Chơi tiếp Ngày X"
 * when there is progress to keep.
 */
export default function TitleScreen() {
  const day = useGameStore((s) => s.day);
  const turns = useGameStore((s) => s.turns);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isVictory = useGameStore((s) => s.isVictory);
  const setScreen = useGameStore((s) => s.setScreen);
  const startGame = useGameStore((s) => s.startGame);
  const openTimeCapsule = useGameStore((s) => s.openTimeCapsule);
  const avatarSkin = useGameStore((s) => s.avatarSkin);
  const toggleAvatarSkin = useGameStore((s) => s.toggleAvatarSkin);
  const openThemeSelector = useGameStore((s) => s.openThemeSelector);
  const theme = useActiveTheme();

  const resume = turns > 0 && !isGameOver && !isVictory;

  // --- Install (A2HS) guide ---
  // A gentle, dismissible banner nags the user to "add to home screen" until
  // they tap it (opens the guide sheet) or the app is already running
  // standalone. Dismissal persists so it doesn't re-nag after a reload.
  // Standalone is only trusted post-mount so the server/client first paint
  // matches (the installed-PWA case drops the banner/menu button afterwards).
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [inStandalone, setInStandalone] = useState(false);

  useEffect(() => {
    const standalone = isStandalone();
    setInStandalone(standalone);
    if (standalone) {
      // Already the home-screen app — no install nudge needed at all.
      setShowInstallBanner(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
    } catch {
      /* ignore — private mode etc. */
    }
    if (dismissed) setShowInstallBanner(false);
  }, []);

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    try {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden p-5 ${theme.textColor}`}>
      <AmbientBackground />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-6">
        {/* Breathing chibi + military star-badge easter egg (tap to toggle skin) */}
        <div className="relative mb-4">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="grid h-36 w-36 place-items-center rounded-full bg-white/60 shadow-[0_18px_50px_-12px_rgba(229,72,77,0.35)]">
              <AvatarReaction />
            </div>
            <motion.button
              data-skin-toggle
              type="button"
              onClick={toggleAvatarSkin}
              whileTap={{ scale: 0.9 }}
              className="absolute -right-1 -top-1 text-3xl"
              aria-pressed={avatarSkin === 'military'}
              aria-label={
                avatarSkin === 'military' ? 'Bỏ trang phục lính' : 'Đội trang phục lính'
              }
              title="Easter egg: tap để đổi áo lính 🎖️"
            >
              {avatarSkin === 'military' ? '⭐' : '🎖️'}
            </motion.button>
            <motion.span
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            >
              ❤️
            </motion.span>
          </motion.div>
        </div>

        {/* Wordmark */}
        <h1 className={cn('text-center text-4xl font-black leading-none tracking-tight', theme.textColor)}>
          NUÔI&nbsp;ANH
        </h1>
        <p className={cn('mt-1 text-center text-sm font-medium opacity-70', theme.textColor)}>
          Nhật ký sinh tồn &amp; giữ gìn tình yêu 💖
        </p>

        {/* Gentle, dismissible "add to home screen" prompt (browser only) */}
        <AnimatePresence>
          {showInstallBanner && (
            <motion.button
              type="button"
              data-install-banner
              onClick={() => setInstallGuideOpen(true)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl border-2 border-dashed border-[#f0b9c4] bg-white/70 px-4 py-2.5 text-left shadow-sm"
            >
              <span className="text-xs font-bold leading-snug text-[#4a3f35]">
                📲 <span className="text-[#e5484d]">Cài đặt app lên điện thoại</span>
                <span className="block text-[11px] font-medium text-[#4a3f35]/60">
                  Chạy full-screen, không có thanh trình duyệt
                </span>
              </span>
              <span
                data-install-banner-close
                role="button"
                aria-label="Ẩn hướng dẫn cài đặt"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissInstallBanner();
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80 text-[#4a3f35]/60 transition-transform active:scale-90"
              >
                <X className="h-4 w-4" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Menu buttons */}
        <div className="mt-7 flex w-full flex-col items-stretch gap-3">
          <div className="relative w-full">
            {/* Gentle pulsing glow behind the primary CTA. */}
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-[#e5484d]/40 blur-md"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.button
              onClick={startGame}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative z-10 w-full rounded-2xl px-5 py-3.5 text-base font-black text-white shadow-lg',
                'bg-gradient-to-r from-[#ff8a9b] to-[#e5484d] shadow-[#e5484d]/40',
              )}
            >
              {resume ? `Chơi tiếp Ngày ${day} 🎮` : 'Bắt đầu chơi 🎮'}
            </motion.button>
          </div>

          <button
            onClick={() => setScreen('how_to_play')}
            className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
          >
            Hướng dẫn cách chơi 📖
          </button>

          <button
            onClick={() => setScreen('about')}
            className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
          >
            Gửi bé yêu (About) 💌
          </button>

          <button
            onClick={openTimeCapsule}
            className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
          >
            Hộp thư thời gian 🎖️
          </button>

          <button
            onClick={openThemeSelector}
            className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
          >
            Đổi bối cảnh 🎨
          </button>

          {!inStandalone && (
            <button
              onClick={() => setInstallGuideOpen(true)}
              data-install-menu-button
              className="w-full rounded-2xl border-2 border-[#f0d9cc] bg-white/80 px-5 py-3 text-sm font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-[0.98]"
            >
              Cài đặt app 📲
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className={cn('relative z-10 pb-2 text-center text-[11px] font-medium opacity-50', theme.textColor)}>
        v1.0.0 · Made with all my love ❤️
      </p>

      {/* PWA install guide — bottom sheet, opened from the banner or menu button */}
      <InstallGuideModal
        open={installGuideOpen}
        onClose={() => setInstallGuideOpen(false)}
        onInstalled={dismissInstallBanner}
      />
    </div>
  );
}
