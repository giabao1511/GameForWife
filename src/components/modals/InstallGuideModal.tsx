import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Bottom sheet that teaches the user how to install the game as a PWA
 * ("Add to Home Screen") on iPhone (Safari) and Android (Chrome). Opened from
 * the TitleScreen install banner / menu button, which auto-hides there when
 * the app already runs in standalone mode.
 *
 * Kept prop-driven (no 'use client' marker) because it only ever mounts
 * inside TitleScreen, which is itself a client entry.
 */

/** iOS share glyph (tray + up arrow) — lucide has no equivalent. */
function IosShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3v9" />
      <path d="m8 6 4-4 4 4" />
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
    </svg>
  );
}

interface Step {
  text: ReactNode;
  icon?: ReactNode;
}

/** One platform's numbered guide — number badges + per-step icons keep it scannable. */
function GuideSection({ label, steps }: { label: string; steps: Step[] }) {
  return (
    <section aria-label={label} className="mb-5 last:mb-0">
      <h3 className="mb-2 text-sm font-black tracking-tight text-[#3b2f28]">{label}</h3>
      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff8a9b] to-[#e5484d] text-xs font-black text-white shadow-sm"
            >
              {i + 1}
            </span>
            <p className="flex-1 text-sm leading-snug text-[#4a3f35]">{step.text}</p>
            {step.icon && (
              <span
                aria-hidden
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#f0d9cc] bg-white/80 text-[#4a3f35]"
              >
                {step.icon}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

const IOS_STEPS: Step[] = [
  {
    text: (
      <>
        Nhấn vào nút <b>Chia sẻ</b> ở thanh dưới của trình duyệt.
      </>
    ),
    icon: <IosShareIcon className="h-3.5 w-3.5" />,
  },
  {
    text: (
      <>
        Cuộn xuống và chọn <b>“Thêm vào Màn hình chính”</b> (Add to Home Screen).
      </>
    ),
  },
  {
    text: (
      <>
        Nhấn <b>“Thêm”</b> ở góc phải trên cùng.
      </>
    ),
  },
];

const ANDROID_STEPS: Step[] = [
  {
    text: (
      <>
        Nhấn vào biểu tượng <b>3 chấm</b> ở góc phải trên.
      </>
    ),
    icon: <MoreVertical className="h-3.5 w-3.5" />,
  },
  {
    text: (
      <>
        Chọn <b>“Cài đặt ứng dụng”</b> hoặc <b>“Thêm vào Màn hình chính”</b>.
      </>
    ),
  },
];

export default function InstallGuideModal({
  open,
  onClose,
  onInstalled,
}: {
  open: boolean;
  onClose: () => void;
  /** Fired by the "Đã cài xong" CTA — lets the caller remember the dismissal. */
  onInstalled?: () => void;
}) {
  // Escape closes the sheet (keyboard parity with the X button / backdrop tap).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="install-guide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex flex-col justify-end bg-[#4a3f35]/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Hướng dẫn cài đặt ứng dụng"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            // Clear the home-bar / safe-area inset below the sheet in standalone mode.
            className={cn(
              'max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-[#fdf2f8] px-5 pt-4',
              'pb-[max(env(safe-area-inset-bottom),_1.5rem)] text-[#4a3f35] shadow-2xl',
            )}
          >
            {/* Grab handle — the "swipe up to open, down to close" affordance. */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#e5484d]/25" aria-hidden />

            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#3b2f28]">
                  📲 Cài đặt app về máy
                </h2>
                <p className="mt-0.5 text-xs text-[#4a3f35]/60">
                  Chạy full-screen, không có thanh trình duyệt — gọn như app thật.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Đóng hướng dẫn cài đặt"
                className="shrink-0 rounded-full border border-[#f0d9cc] bg-white/80 p-1.5 text-[#4a3f35] transition-transform active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <GuideSection label="🍎 Dành cho iPhone (Safari)" steps={IOS_STEPS} />
            <GuideSection label="🤖 Dành cho Android (Chrome)" steps={ANDROID_STEPS} />

            <button
              onClick={() => {
                onInstalled?.();
                onClose();
              }}
              className={cn(
                'mt-5 w-full rounded-2xl bg-gradient-to-r from-[#ff8a9b] to-[#e5484d]',
                'px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#e5484d]/40',
                'transition-transform active:scale-[0.98]',
              )}
            >
              Đã cài xong ✨
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
