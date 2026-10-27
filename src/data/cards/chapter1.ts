import type { GameCard } from '@/data/types';

/**
 * Chapter 1 — Early Dating.
 * 3 cards per TimeSlot. Modifiers are intentionally sharp enough to reach 0
 * from the 50 baseline within a few bad choices, so Game Over is reachable.
 */
export const CHAPTER1_CARDS: GameCard[] = [
  // ── MORNING ────────────────────────────────────────────────
  {
    id: 'ch1-morning-alarm',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'Báo thức reo 6:30 sáng. Anh liẻn ra: "Cho anh ngủ nướng thêm 15 phút nha em?"',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Dậy đi anh, giờ này còn ngủ! (giật chăn)',
      modifiers: { energy: 5, affection: -5, sanity: 5 },
      narrativeReaction: 'Anh dụi mắt, mếu máo nhưng vẫn tỉnh táo hơn hẳn. "Em đúng là cục đá..."',
    },
    rightChoice: {
      text: 'Ngủ đi anh, em để anh ngủ nướng thêm',
      modifiers: { energy: 10, affection: 10, sanity: -5 },
      narrativeReaction: 'Anh ôm chầm lấy em ngủ tiếp. Pin đầy nhưng em thì hơi lo khi anh lỡ giờ.',
    },
  },
  {
    id: 'ch1-morning-breakfast',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: '"Sáng nay em muốn anh mua xôi hay hủ tiếu?" — câu hỏi tưởng nhỏ mà định mệnh.',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Mua xôi đi, em thích xôi',
      modifiers: { affection: 5, wallet: -10, sanity: 5 },
      narrativeReaction: 'Xôi nóng hổi, anh mua kèm thêm cà phê. Bụng em no, ví anh hơi mỏng.',
    },
    rightChoice: {
      text: 'Hủ tiếu! Nhưng anh tự bỏ tiền nha',
      modifiers: { wallet: 10, affection: -5, energy: 5 },
      narrativeReaction: 'Anh xẻng ví nhanh hơn ăn. Em thấy hơi xa cách nhưng cũng ổn.',
      nextCardId: 'ch1-morning-breakfast-queue',
    },
  },
  {
    id: 'ch1-morning-breakfast-queue',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'Hủ tiếu nhà quen hôm nay có người xếp hàng trước mặt anh. Anh quay mặt chờ, liếc em dò ý.',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Xếp đi anh, em mua cho luôn',
      modifiers: { energy: 5, wallet: -10, sanity: 5 },
      narrativeReaction: 'Em tự giác xếp hàng, anh đỡ mệt và thêm điểm ở lòng em.',
    },
    rightChoice: {
      text: 'Về nhà mình ăn nhanh đi anh',
      modifiers: { energy: -5, sanity: 5, affection: 5 },
      narrativeReaction: 'Anh gật đầu, bỏ về làm ly mì gói. Nhanh nhưng hơi nhạt.',
    },
  },
  {
    id: 'ch1-morning-outfit',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'Anh xoay vòng trước gương: "Bộ đồ này anh mặc đi làm nhìn ổn không em?"',
    avatarMood: 'stressed',
    leftChoice: {
      text: 'Đẹp lắm anh ơi, cứ mặc bộ đó',
      modifiers: { affection: 8, sanity: -3, energy: 3 },
      narrativeReaction: 'Anh tự tin bước ra. Có thể bộ đồ hơi... đặc biệt, nhưng anh thì xinh.',
    },
    rightChoice: {
      text: 'Thôi anh thử bộ kia đi, cái này hơi quê',
      modifiers: { affection: -3, sanity: 5, energy: -3 },
      narrativeReaction: 'Anh cau mày đổi đồ, có chút buồn nhưng nhìn có vẻ hợp gu hơn.',
    },
  },

  // ── AFTERNOON ──────────────────────────────────────────────
  {
    id: 'ch1-afternoon-lunch',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    situation: 'Câu hỏi bẫy kinh điển: "Trưa nay ăn gì em ơi?" — không ai biết câu trả lời.',
    avatarMood: 'neutral',
    leftChoice: {
      text: 'Cùng em ăn phở bò đi anh',
      modifiers: { energy: 8, affection: 5, wallet: -15, sanity: 5 },
      narrativeReaction: 'Bát phở nóng hổi, em cười khúc khích. Anh tốn kha khá tiền.',
    },
    rightChoice: {
      text: 'Mấy nay chán phở rồi, ăn cơm tấm không?',
      modifiers: { energy: 5, affection: -3, wallet: -5, sanity: 8 },
      narrativeReaction: 'Cơm tấm + trứng ốp. Bè bé, no nê, ví nhẹ nhàng hơn.',
    },
  },
  {
    id: 'ch1-afternoon-late-reply',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    situation: 'Tin nhắn 2 giờ chưa rep: "Anh vừa họp xong, đừng giận anh nha... 🙈"',
    avatarMood: 'stressed',
    leftChoice: {
      text: 'Sao anh rep trễ vậy! Em chờ mỏi cả tay',
      modifiers: { sanity: -15, affection: 3, energy: -3 },
      narrativeReaction: 'Anh xin lỗi rối rít, em thấy khá bực nhưng cũng được an ủi.',
    },
    rightChoice: {
      text: 'Dạ không sao đâu, anh bận thì cũng phải',
      modifiers: { sanity: 10, affection: 5, energy: 3 },
      narrativeReaction: 'Anh thở phào nhẹ nhõm. Em là một người bạn gái cực kỳ hiểu chuyện.',
    },
  },
  {
    id: 'ch1-afternoon-drowsy',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    situation: 'Tin nhắn lúc 2h chiều: "Anh đang buồn ngủ quá, em có order nước không?"',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Em order cho anh 1 ly cà phê đen đá nè',
      modifiers: { energy: 10, wallet: -10, affection: 5 },
      narrativeReaction: 'Cà phê về kịp, anh tỉnh như sáo. Phí ship + phí cà phê rơi vào ví anh.',
    },
    rightChoice: {
      text: 'Buồn ngủ thì về nhà ngủ, em không rảnh order đâu',
      modifiers: { energy: -5, affection: -8, sanity: 8 },
      narrativeReaction: 'Anh hơi hụt hẫng. Em đúng là tỉnh táo, nhưng anh thì... chui vào ngủ.',
    },
  },

  // ── EVENING ────────────────────────────────────────────────
  {
    id: 'ch1-evening-workdone',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    situation: 'Tan ca, anh gọi: "Tối nay lượn phố hóng gió hay mình về phòng nấu ăn?"',
    avatarMood: 'happy',
    leftChoice: {
      text: 'Lượn phố đi anh, em thích đi dạo',
      modifiers: { energy: -5, affection: 8, wallet: -10, sanity: 5 },
      narrativeReaction: 'Hai đứa đi bộ dọc phố, nghe nhau kể chuyện. Chán ăn nhưng vui.',
    },
    rightChoice: {
      text: 'Về nhà nấu ăn đi, em học được món mới',
      modifiers: { energy: 8, wallet: 5, affection: 5, sanity: -5 },
      narrativeReaction: 'Hầm nồi nấu nướng, em vui nhưng bếp thì khá lộn xộn.',
    },
  },
  {
    id: 'ch1-evening-gamefriends',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    situation: '"Tối nay mấy đứa bạn rủ anh chơi game 1 tiếng được không?"',
    avatarMood: 'neutral',
    leftChoice: {
      text: 'Chơi đi anh, 1 tiếng cũng được',
      modifiers: { affection: -5, sanity: 5, energy: -3 },
      narrativeReaction: 'Em hơi thất vọng nhưng chấp nhận. Anh chơi game say sưa.',
    },
    rightChoice: {
      text: 'Thôi em muốn ở bên anh hơn, từ chối họ đi',
      modifiers: { affection: 8, sanity: -8, energy: 3 },
      narrativeReaction: 'Anh hủy kèo, em được quan tâm. Nhưng anh thì hơi mất vui.',
    },
    upChoice: {
      text: 'Kệ anh, chơi cho đã đi',
      possibleOutcomes: [
        {
          weight: 40,
          modifiers: { energy: 15, affection: -5 },
          narrativeReaction: 'Anh cày game đã đời, pin tăng vọt nhưng em hơi bị lãng quên.',
        },
        {
          weight: 30,
          modifiers: { energy: 25, sanity: 10, affection: -10 },
          narrativeReaction: 'Thắng trận, anh happy lịm. Có vẻ anh quên nhắn em câu nào cả tối nay.',
        },
        {
          weight: 30,
          modifiers: { sanity: -15, affection: -10 },
          narrativeReaction: 'Anh thua liên tục, đỏ mặt gào "đứng hình cái con đồ" và dỗi em bỏ mặc anh.',
        },
      ],
    },
  },
  {
    id: 'ch1-evening-date',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    situation: '"Tối nay mình đi ăn quán quen hay thử nhà hàng mới?"',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Quán quen đi anh, em thích chỗ đó',
      modifiers: { energy: 5, wallet: -10, sanity: 5, affection: 3 },
      narrativeReaction: 'Quán cũ quen thuộc, giá vừa phải. An toàn và ấm cúng.',
    },
    rightChoice: {
      text: 'Thử nhà hàng mới! Em muốn trải nghiệm mới',
      modifiers: { wallet: -25, affection: 8, sanity: -5, energy: -3 },
      narrativeReaction: 'Nhà hàng sang chảnh, view đẹp. Ví anh thì... xẹp lép.',
    },
  },

  // ── NIGHT ───────────────────────────────────────────────────
  {
    id: 'ch1-night-movie',
    chapterId: 'CH1_DATING',
    timeSlot: 'NIGHT',
    situation: '11h đêm: "Cày nốt tập phim này rồi ngủ nha em?"',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Ok cày đi, xong ngủ nha',
      modifiers: { energy: -10, affection: 5, sanity: 3 },
      narrativeReaction: 'Xem phim hết tập, em buồn ngủ rũ rượi. Pin đỏ oanh.',
    },
    rightChoice: {
      text: 'Thôi ngủ đi anh, ngày mai em còn dậy sớm',
      modifiers: { energy: 10, sanity: 5, affection: -3 },
      narrativeReaction: 'Ngủ sớm, khỏe re. Nhưng em hơi tiếc chưa xem xong tập.',
    },
  },
  {
    id: 'ch1-night-facetime',
    chapterId: 'CH1_DATING',
    timeSlot: 'NIGHT',
    situation: '"Call ngủ cùng nhau nhé?" — 1h đêm mà vẫn còn năng lượng.',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Ok em mở camera, ngủ cùng nha',
      modifiers: { energy: -5, affection: 10, sanity: 3 },
      narrativeReaction: 'Hai đứa call nhau đến sáng, ôm màn hình ngủ. Ngọt lắm.',
    },
    rightChoice: {
      text: 'Em buồn ngủ quá rồi, ngủ trước nha anh',
      modifiers: { energy: 10, affection: -8, sanity: -3 },
      narrativeReaction: 'Em tắt máy sớm, anh có chút buồn nhưng cũng cho qua.',
    },
  },
  {
    id: 'ch1-night-trap',
    chapterId: 'CH1_DATING',
    timeSlot: 'NIGHT',
    situation: '11h30, anh nhắn: "Tự nhiên em thấy hơi buồn..." — câu hỏi bẫy đêm muộn.',
    avatarMood: 'stressed',
    leftChoice: {
      text: 'Em có sao đâu, ngủ đi, đừng nghĩ nhiều',
      modifiers: { sanity: -20, affection: -5, energy: -3 },
      narrativeReaction: 'Câu "Em có sao đâu" kinh điển. Não anh quá tải, sanity tụt dốc không phanh.',
      nextCardId: 'ch1-night-trap-aftermath',
    },
    rightChoice: {
      text: 'Anh buồn gì, kể em nghe đi, em ở đây nè',
      modifiers: { sanity: 15, affection: 10, energy: -5 },
      narrativeReaction: 'Em lắng nghe, an ủi. Anh thấy nhẹ lòng, nhưng cả hai cùng mệt.',
    },
  },
  {
    id: 'ch1-night-trap-aftermath',
    chapterId: 'CH1_DATING',
    timeSlot: 'NIGHT',
    situation: 'Anh im lặng 20 phút rồi nhắn: "Em vừa nói gì đó... em coi anh như con nít à?" — dây sau sập bẫy.',
    avatarMood: 'stressed',
    leftChoice: {
      text: 'Sao em nói vậy chứ, lỗi tại anh thôi anh',
      modifiers: { sanity: 10, affection: 5 },
      narrativeReaction: 'Em chủ động làm lành. Anh ấm lại trong 30 giây rồi ngủ mất.',
    },
    rightChoice: {
      text: 'Đấy là em nói đó, anh tự nghĩ nhiều quá',
      modifiers: { sanity: -15, affection: -10 },
      narrativeReaction: 'Xung đột đêm khuya. Cả hai cùng càu nhàu rồi tắt đèn im lặng.',
    },
  },
];

export const CHAPTER1_CARD_MAP: Record<string, GameCard> = Object.fromEntries(
  CHAPTER1_CARDS.map((c) => [c.id, c]),
);
