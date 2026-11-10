'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AmbientBackground from './AmbientBackground';
import { useGameStore } from '@/store/useGameStore';
import { useActiveTheme } from '@/components/effects/useActiveTheme';
import { cn } from '@/lib/cn';

const STATS: Array<{ icon: string; label: string; desc: string }> = [
  { icon: '🔋', label: 'Pin', desc: 'Năng lượng & sức khỏe của anh.' },
  { icon: '💖', label: 'Cưng chiều', desc: 'Mức độ ngọt ngào, cưng chiều.' },
  { icon: '🧠', label: 'Tỉnh táo', desc: 'Đầu óc minh mẫn, không stress.' },
  { icon: '💸', label: 'Ví tiền', desc: 'Ngân sách hẹn hò & ăn uống.' },
];

/** How-to-play sub-screen: card-based sections explaining the core loop. */
export default function HowToPlayScreen() {
  const returnToTitle = useGameStore((s) => s.returnToTitle);
  const theme = useActiveTheme();

  return (
    <div className={cn('relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden p-4', theme.textColor)}>
      <AmbientBackground />

      <div className="relative z-10 mb-4 flex items-center gap-2">
        <button
          onClick={returnToTitle}
          className="flex items-center gap-1 rounded-full border-2 border-[#f0d9cc] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#4a3f35] shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Quay lại
        </button>
        <h1 className="text-base font-black tracking-tight">Hướng dẫn cách chơi 📖</h1>
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-3 overflow-y-auto pb-4">
        <Slide title="Cơ chế vuốt" emoji="🎮">
          <p className="text-[13px] leading-relaxed text-[#4a3f35]/80">
            Vuốt thẻ bài sang <strong>Trái</strong> hoặc <strong>Phải</strong>{' '}
            để đưa ra lựa chọn hàng ngày cho anh ấy.
          </p>
        </Slide>

        <Slide title="4 Chỉ số sinh tồn" emoji="⚖️">
          <ul className="flex flex-col gap-2">
            {STATS.map((s) => (
              <li key={s.label} className="flex items-start gap-2.5 rounded-2xl bg-white/70 px-3 py-2">
                <span className="text-xl leading-none" aria-hidden>
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold">{s.label}</p>
                  <p className="text-[12px] leading-snug text-[#4a3f35]/70">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 rounded-xl bg-[#fbe4c8] px-3 py-2 text-[12px] italic text-[#b6572e]">
            Giữ cân bằng cả 4 thanh, đừng để thanh nào chạm 0.
          </p>
        </Slide>

        <Slide title="Tương tác đặc biệt" emoji="✨">
          <ul className="flex list-none flex-col gap-1.5 text-[13px] leading-snug text-[#4a3f35]/80">
            <li>• Chọc má, xoa đầu Chibi để cộng điểm.</li>
            <li>• Dùng vật phẩm ở thanh dưới đáy khi cần cứu nguy chỉ số.</li>
            <li>• Gặp nguy hiểm, có 1 cơ hội sốc điện tim để cứu anh.</li>
          </ul>
        </Slide>

        <motion.button
          onClick={returnToTitle}
          whileTap={{ scale: 0.97 }}
          className="mb-2 mt-auto w-full rounded-2xl bg-gradient-to-r from-[#ff8a9b] to-[#e5484d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#e5484d]/40"
        >
          Em hiểu rồi, chơi thôi! ✨
        </motion.button>
      </div>
    </div>
  );
}

function Slide({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#fdf6f2] p-4 shadow-sm">
      <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wide">
        <span aria-hidden>{emoji}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
