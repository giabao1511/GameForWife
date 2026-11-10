'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AmbientBackground from './AmbientBackground';
import { useGameStore } from '@/store/useGameStore';

/** About sub-screen: the boyfriend's personal keepsake note. */
export default function AboutScreen() {
  const returnToTitle = useGameStore((s) => s.returnToTitle);
  const openTimeCapsule = useGameStore((s) => s.openTimeCapsule);
  const openSendMiss = useGameStore((s) => s.openSendMiss);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-[#fff4f6] p-4 text-[#4a3f35]">
      <AmbientBackground />

      <div className="relative z-10 mb-4 flex items-center gap-2">
        <button
          onClick={returnToTitle}
          className="flex items-center gap-1 rounded-full border-2 border-[#f0d9cc] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Quay lại
        </button>
        <h1 className="text-base font-black tracking-tight">Gửi bé yêu 💌</h1>
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded-2xl bg-[#fdf6f2] p-5 shadow-sm"
        >
          <p className="text-[14px] leading-relaxed text-[#4a3f35]/90">
            Game này anh tự tay làm dành riêng cho công chúa của anh.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-[#4a3f35]/90">
            Những lúc anh vắng nhà đi nghĩa vụ, mong mỗi khi em mở app là lại
            thấy anh đang ở thật gần — cùng em cười và đồng hành qua từng ngày.
          </p>
          <p className="mt-4 text-[14px] font-bold italic text-[#c24a5e]">
            From your boyfriend with all my love ❤️
          </p>
        </motion.div>

        <div className="rounded-2xl bg-white/70 p-4">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#b6572e]">
            Ghi nhớ nhé 💖
          </p>
          <ul className="mt-2 flex list-none flex-col gap-1.5 text-[13px] leading-snug text-[#4a3f35]/80">
            <li>• Mở “Hộp thư thời gian” để đọc thư anh theo từng cột mốc.</li>
            <li>• Nhấn gửi nỗi nhớ để an ủi anh từ xa. 💌</li>
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={openTimeCapsule}
              className="w-full rounded-xl border-2 border-[#f0d9cc] bg-white px-4 py-2 text-sm font-bold text-[#4a3f35] transition-transform active:scale-[0.98]"
            >
              📬 Xem hộp thư thời gian
            </button>
            <button
              onClick={openSendMiss}
              className="w-full rounded-xl border-2 border-[#f0d9cc] bg-white px-4 py-2 text-sm font-bold text-[#4a3f35] transition-transform active:scale-[0.98]"
            >
              💌 Gửi nỗi nhớ
            </button>
          </div>
        </div>

        <motion.button
          onClick={returnToTitle}
          whileTap={{ scale: 0.97 }}
          className="mb-2 mt-auto w-full rounded-2xl bg-gradient-to-r from-[#ff8a9b] to-[#e5484d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#e5484d]/40"
        >
          Về menu chính 🏠
        </motion.button>
      </div>
    </div>
  );
}
