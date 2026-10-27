import type { GameCard } from './types';

/**
 * Real-time ambience cards. Six follow the clock (preferredPeriod boost in
 * the deck draw), one is the late-night exclusive special (guaranteed once
 * per session when the real period is latenight).
 */

/** The late-night special's id (referenced by the deck-draw guarantee). */
export const TIME_LATENIGHT_SPECIAL_ID = 'time-latenight-bedtime';

export const TIME_CARDS: GameCard[] = [
  // ── Morning ───────────────────────────────────────────────
  {
    id: 'time-morning-wake',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    preferredPeriod: 'morning',
    situation:
      'Chuông báo thức reo 3 lần rồi mà anh chưa dậy nổi. Em kéo chăn hay thơm má gọi anh dậy đây?',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Kéo chăn choàng kín lên, ngủ tiếp đi anh',
      modifiers: { energy: 10, affection: 8, sanity: -3 },
      narrativeReaction: 'Anh dụi mắt trong chăn rồi ngủ tiếp 10 phút. Pin đầy hơn, nhưng giờ anh lại hơi muộn.',
    },
    rightChoice: {
      text: 'Thơm má một cái rồi gọi dậy ngay',
      modifiers: { sanity: 8, affection: 10, energy: -5 },
      narrativeReaction: 'Anh mở mắt ra với nụ cười ngái ngủ. Sáng nay ngọt hơn bình thường.',
    },
  },
  {
    id: 'time-morning-food',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    preferredPeriod: 'morning',
    situation: 'Sáng nay ăn gì em ơi? Bánh mì chảo đầu ngõ hay ghé mua xôi mặn?',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Bánh mì chảo đi, em thèm nóng hổi',
      modifiers: { wallet: -10, affection: 5, energy: 5 },
      narrativeReaction: 'Cái bánh mì chảo nóng hổi, thịt xèo xèo. No căng mà ví hơi mỏng.',
    },
    rightChoice: {
      text: 'Xôi mặn em yêu hơn, mua thêm ly sữa nóng',
      modifiers: { wallet: -5, sanity: 8, energy: 5 },
      narrativeReaction: 'Xôi + sữa nóng, cả hai ấm bụng ấm lòng. Rẻ mà hợp mồm.',
    },
  },

  // ── Afternoon ─────────────────────────────────────────────
  {
    id: 'time-afternoon-coffee',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    preferredPeriod: 'afternoon',
    situation:
      '2h chiều mắt díp lại rồi sếp ơi... Cứu anh một ly trà mãng cầu / cà phê muối được không?',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Order ngay ly cà phê muối cho anh',
      modifiers: { wallet: -10, energy: 10, sanity: 5 },
      narrativeReaction: 'Ly cà phê muối về tới tay, anh tỉnh như sáo cầm ca. Phí ship + cà phê rơi vào ví anh.',
    },
    rightChoice: {
      text: 'Ngồi đó nghỉ mắt 5 phút rồi tự đi mua nha',
      modifiers: { energy: -5, sanity: 5, wallet: 5 },
      narrativeReaction: 'Anh tự đi mua, ví nguyên vẹn. Nhưng 5 phút ngồi lì thì hơi ngáp dài.',
    },
  },
  {
    id: 'time-afternoon-lunch-run',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    preferredPeriod: 'afternoon',
    situation:
      'Trưa nay công ty rủ ăn cơm tấm, anh order thêm cho em một phần mang qua cty em nhé?',
    avatarMood: 'neutral',
    leftChoice: {
      text: 'Mang qua em liền, phần trứng ốp lớn nha',
      modifiers: { wallet: -15, affection: 10, energy: 5 },
      narrativeReaction: 'Cơm tấm + trứng ốp tới nơi vẫn nóng. Em được quan tâm, ví anh chịu trận.',
    },
    rightChoice: {
      text: 'Trưa em ăn nhẹ thôi, anh ăn ngon hộ em',
      modifiers: { wallet: 5, sanity: 5, affection: -5 },
      narrativeReaction: 'Tiết kiệm được tiền nhưng em hơi thấy xa. Anh ăn một mình no nê.',
    },
  },

  // ── Evening ───────────────────────────────────────────────
  {
    id: 'time-evening-fresh-air',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    preferredPeriod: 'evening',
    situation:
      'Tan làm rồi! Anh qua đón em đi lượn một vòng hóng gió bờ kè hay tấp vào ăn ốc luôn?',
    avatarMood: 'happy',
    leftChoice: {
      text: 'Lượn bờ kè trước, gió mát đã rồi tính',
      modifiers: { affection: 8, sanity: 8, energy: -5 },
      narrativeReaction: 'Hai đứa lượn bờ kè, gió lùa tóc bay. Nhẹ tênh, không tốn đồng nào.',
    },
    rightChoice: {
      text: 'Ăn ốc luôn đi, ngồi xổm ăn cho đã',
      modifiers: { wallet: -15, energy: -5, affection: 10, sanity: 10 },
      narrativeReaction: 'Ốc nóng + gió mát bờ kè. Lạc đường hóa ra là kỷ niệm đẹp nhất tuần.',
    },
  },
  {
    id: 'time-evening-movie-or-noodles',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    preferredPeriod: 'evening',
    situation:
      'Tối nay có phim mới ra rạp, em muốn đi xem phim hay về nhà nấu mì gói xem Netflix cùng anh?',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Đi xem phim rạp đi anh, có date như phim',
      modifiers: { wallet: -25, energy: -5, affection: 10, sanity: 5 },
      narrativeReaction: 'Rạp phim mát rượi, bắp + nước ngọt. Ví anh hơi xẹp nhưng em thì vui.',
    },
    rightChoice: {
      text: 'Về nhà mì gói + Netflix thôi, ấm cúng hơn',
      modifiers: { wallet: 5, energy: 5, sanity: -5, affection: 5 },
      narrativeReaction: 'Mì gói nóng + Netflix trên sofa. Rẻ, ấm, nhưng hơi... ít lãng mạn.',
    },
  },

  // ── Late night special (exclusive, once per session) ─────
  {
    id: TIME_LATENIGHT_SPECIAL_ID,
    chapterId: 'CH1_DATING',
    timeSlot: 'NIGHT',
    preferredPeriod: 'latenight',
    exclusivePeriod: 'latenight',
    situation:
      'Đã hơn 11h đêm rồi sao công chúa của anh vẫn chưa ngủ? Mau đắp chăn nhắm mắt lại đi, thức khuya là anh xót đó!',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Em bấm nốt rồi ngủ ngay',
      modifiers: { sanity: 10, affection: 8 },
      narrativeReaction: 'Em bấm nốt một nhịp rồi lăn vào chăn. Tỉnh táo thêm một chút, ngọt thêm một chút.',
    },
    rightChoice: {
      text: 'Ngoan ngoãn đi ngủ',
      modifiers: { energy: 15, sanity: 5 },
      narrativeReaction: 'Em ngoan nghe lời, tắt đèn ngủ ngay. Pin hồi phục, mai sẽ tỉnh táo hơn hẳn.',
    },
  },
];
