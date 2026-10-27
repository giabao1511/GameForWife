import type { GameCard } from '../types';
import { CHAPTER1_CARDS } from './chapter1';

/**
 * Phase 3 expansion: 11 more Chapter 1 scenarios — relatable daily-life
 * dilemmas, weekend date tension, plus chained dominoes (e.g. buying the
 * wrong tea leads straight to exchanging it in the rain).
 */
const EXTRA_CARDS: GameCard[] = [
  {
    id: 'ch1-afternoon-buy-wrong-tea',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    situation: 'Anh mua trà sữa giúp em nhưng... đặt nhầm hoàn toàn. Em: "Đây không phải món của em, anh ơi."',
    avatarMood: 'stressed',
    leftChoice: {
      text: 'Thôi uống thử đi, biết đâu em thích',
      modifiers: { wallet: -15, affection: -5, sanity: -5 },
      narrativeReaction: 'Em cầm thử ngụm đầu tiên rồi đặt xuống im lặng. Ví anh mỏng hơn, không khí nặng hơn.',
      nextCardId: 'ch1-afternoon-exchange-tea-rain',
    },
    rightChoice: {
      text: 'Anh xin lỗi, anh đổi lại liền. Em đợi anh nha',
      modifiers: { wallet: -25, affection: 10, energy: -5, sanity: 5 },
      narrativeReaction: 'Anh chạy lại quán đổi. Chậm 10 phút nhưng em gật gù: "Anh mà xin lỗi nhanh thì em tha."',
      nextCardId: 'ch1-afternoon-exchange-tea-rain',
    },
  },
  {
    id: 'ch1-afternoon-exchange-tea-rain',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    situation: 'Đi đổi trà sữa giữa trời mưa lất phất. Anh: "Chạy nhanh không dính mưa, em có muốn dính mưa không em?"',
    avatarMood: 'neutral',
    leftChoice: {
      text: 'Chạy em ơi! Dính mưa cùng là kỷ niệm đẹp',
      modifiers: { energy: -10, affection: 10, sanity: 10, wallet: 5 },
      narrativeReaction: 'Hai đứa chạy như điên dưới mưa, cười không ngẩng đầu lên được. Cảm giác rất phim.',
    },
    rightChoice: {
      text: 'Thôi vào quán khác ngồi chờ, mưa xong tính',
      modifiers: { energy: 5, wallet: -10, affection: -5 },
      narrativeReaction: 'An toàn nhưng hơi mất vui. Em thì thầm "chán anh quá" — nhẹ thôi, nhưng em nghe thấy.',
    },
  },
  {
    id: 'ch1-morning-weekend-weather',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'Cuối tuần, trời đẹp bất ngờ. Anh hỏi: "Ra ngoài hay ở nhà anh?"',
    avatarMood: 'happy',
    leftChoice: {
      text: 'Ra ngoài đi! Picnic công viên đi anh',
      modifiers: { wallet: -20, energy: -10, affection: 10, sanity: 5 },
      narrativeReaction: 'Chiều cuối tuần hai đứa nằm trên cỏ. Anh mang đồ ăn hết, em mang điện thoại hết.',
    },
    rightChoice: {
      text: 'Ở nhà xem phim ngủ bù đi anh, tạnh mưa rồi ngủ luôn',
      modifiers: { energy: 15, affection: 5, sanity: -5 },
      narrativeReaction: 'Buổi sáng ở nhà rất ấm. Nhưng anh tiếc cái trời đẹp lắm. Em cũng vậy.',
    },
  },
  {
    id: 'ch1-afternoon-shopping-choice',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    situation: 'Em cầm hai cái áo, quay sang hỏi: "Anh thấy cái nào đẹp? Trả lời sai là không có gì hay đâu."',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Cả hai đều đẹp, em thích cái nào mặc cái đó',
      modifiers: { sanity: -10, affection: 10 },
      narrativeReaction: 'Hòa cả làng. Nhưng sau đó em phải chọn một mình. Anh thì nhẹ nhõm vì không mất điểm.',
    },
    rightChoice: {
      text: 'Cái đỏ! Đứng tuổi em lắm, mua đi',
      modifiers: { wallet: -30, affection: 15, energy: -5 },
      narrativeReaction: 'Em mắt sáng lên. Anh đứng đó với ví mỏng như tờ giấy, nhưng em nhìn anh bằng ánh mắt của người yêu.',
    },
  },
  {
    id: 'ch1-evening-snack-4am',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    situation: 'Em bụng đói lúc tối muộn: "Anh ơi, em thèm bánh mì pate không anh?"',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Tối muộn rồi em ơi, mai ăn sáng đi',
      modifiers: { affection: -10, sanity: 5, energy: 5 },
      narrativeReaction: 'Em im lặng, bụng thì gào. Anh nghe được cả hai tiếng. Điểm trừ nhẹ.',
    },
    rightChoice: {
      text: 'Anh đi em, 10 phút có mặt. Pate extra nha',
      modifiers: { wallet: -15, affection: 15, energy: -10 },
      narrativeReaction: 'Anh chạy xe giữa đêm đi mua bánh mì. Em ngồi chờ như một vị hoàng hậu đói.',
    },
  },
  {
    id: 'ch1-night-gaming-vs-cuddles',
    chapterId: 'CH1_DATING',
    timeSlot: 'NIGHT',
    situation: 'Em nằm cạnh: "Anh chọn đi: game hay ôm em ngủ?"',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Game đi em, để anh thắng thêm 1 trận nữa',
      modifiers: { affection: -10, energy: 10, sanity: 5 },
      narrativeReaction: 'Em dỗi ra góc giường. Anh thắng game một mình. Không ngon bằng nghĩ.',
    },
    rightChoice: {
      text: 'Đặt xuống ngay, ôm em ngủ. Game mai tính',
      modifiers: { affection: 15, energy: 5, sanity: 10 },
      narrativeReaction: 'Anh đặt tay xuống điện thoại, ôm em ngủ say. Game chờ được, em thì không.',
    },
    upChoice: {
      text: 'Kệ anh, cứ để cả hai ngủ',
      possibleOutcomes: [
        {
          weight: 45,
          modifiers: { affection: 10, energy: 10 },
          narrativeReaction: 'Em mỉm cười, tự dụi mắt. Cả hai ngủ ngon, không ai phải chọn ai.',
        },
        {
          weight: 35,
          modifiers: { affection: -5, energy: 5 },
          narrativeReaction: 'Em giả vờ mất ngủ quay mặt đi. Anh thấy em "ngủ" rất cố gắng.',
        },
        {
          weight: 20,
          modifiers: { sanity: -10, affection: -5 },
          narrativeReaction: 'Em thức trắng vì nghĩ anh chọn game. Sáng ra em hỏi: "Tối qua anh ngủ ngon không?"',
        },
      ],
    },
  },
  {
    id: 'ch1-morning-late-wedding',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'Cuối tuần có đám cưới xa. Anh cần quyết định: đi hay ở nhà?',
    avatarMood: 'neutral',
    leftChoice: {
      text: 'Đi em ơi, cô dâu rất thân với em, không đi là mất thể diện',
      modifiers: { wallet: -30, energy: -10, affection: 5 },
      narrativeReaction: 'Hai đứa đến đám cưới, hai đứa ăn hai đĩa, hai đứa đi về. Đắt nhưng có không khí.',
    },
    rightChoice: {
      text: 'Thôi ở nhà em, cuối tuần mình quất game cùng',
      modifiers: { energy: 15, affection: 5, sanity: 10, wallet: 10 },
      narrativeReaction: 'Ở nhà, cùng ăn mì gói, cùng chơi game. Rẻ nhưng ấm.',
    },
  },
  {
    id: 'ch1-afternoon-socks-missing',
    chapterId: 'CH1_DATING',
    timeSlot: 'AFTERNOON',
    situation: 'Em gọi: "Anh ơi, tất của em đâu rồi? Anh có lấy không?"',
    avatarMood: 'neutral',
    leftChoice: {
      text: 'Em tự tìm đi anh không thấy, có thể rơi ở máy giặt',
      modifiers: { sanity: -10, affection: -5 },
      narrativeReaction: 'Em mất tích cả 20 phút tìm chiếc tất. Em im lặng nhưng em nhớ điều đó.',
    },
    rightChoice: {
      text: 'Anh kiểm tra giúp em, ngồi đây chờ anh',
      modifiers: { energy: -5, affection: 10, sanity: 5 },
      narrativeReaction: 'Tất rơi ở ngăn kéo tủ. Em nhìn anh bằng ánh mắt biết ơn. Một chiếc tất, một điểm.',
    },
  },
  {
    id: 'ch1-evening-movie-queue',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    situation: 'Xem phim cuối tuần. 70 phút chờ đến giờ. Anh: "Em có muốn đổi không, hay vẫn kiên nhẫn?"',
    avatarMood: 'tired',
    leftChoice: {
      text: 'Kiên nhẫn đi anh, mình coi cùng, có em nè',
      modifiers: { energy: -5, sanity: 5, affection: 10 },
      narrativeReaction: 'Hai đứa ngồi chờ cùng nhau, nói chuyện, hát. 70 phút không đáng kể.',
    },
    rightChoice: {
      text: 'Đổi sang buổi khác đi, hôm nay quá mệt',
      modifiers: { energy: 15, sanity: 10, wallet: 5, affection: -5 },
      narrativeReaction: 'Tiết kiệm được sức nhưng em thất vọng nhẹ. "Mai nhé" — nhưng mai lại chưa chắc có.',
    },
  },
  {
    id: 'ch1-night-wedding-dance',
    chapterId: 'CH1_DATING',
    timeSlot: 'NIGHT',
    situation: 'Em khoe: "Hôm nay em đi chơi với bạn, về muộn nha. Anh có giận không?"',
    avatarMood: 'flirty',
    leftChoice: {
      text: 'Giận chết em đi, 12h rồi chưa thấy về',
      modifiers: { affection: -10, sanity: -5 },
      narrativeReaction: 'Em nghe vậy chỉ cười: "Anh giận em rồi à? Vậy mai em cho anh một cái 😘" — nhưng anh mất điểm trong em.',
    },
    rightChoice: {
      text: 'Vui đi em, anh ở nhà chơi game, về chậm không sao đâu',
      modifiers: { affection: 15, sanity: 10, energy: 5 },
      narrativeReaction: 'Em về 11h, cười tít: "Anh dễ thương nhất quả đất". Anh thì nhìn đồng hồ, nghĩ về 23h.',
    },
  },
  {
    id: 'ch1-morning-birthday-surprise',
    chapterId: 'CH1_DATING',
    timeSlot: 'MORNING',
    situation: 'Sáng nay sinh nhật em. Anh: "Em muốn quà gì? Anh chưa kịp chuẩn bị."',
    avatarMood: 'happy',
    leftChoice: {
      text: 'Không cần gì, anh nhớ là em vui rồi',
      modifiers: { affection: 15, sanity: 10, energy: 5 },
      narrativeReaction: 'Em mỉm cười: "Giọng anh nghe như anh đang xin lỗi vậy". Nhưng em yêu anh nhiều hơn vì câu đó.',
    },
    rightChoice: {
      text: 'Anh mua hoa + trà sữa đi, em đợi 10 phút',
      modifiers: { wallet: -25, affection: 10, energy: -5 },
      narrativeReaction: 'Anh chạy xe đi mua hoa, về hơi muộn. Em nhận hoa: "Cảm ơn, nhưng em đói từ nãy rồi".',
    },
  },
  // ── Chained domino: wrong alley → windy riverside snails ──────
  {
    id: 'ch1-evening-wrong-alley',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    situation: 'Anh chở em đi ăn nhưng hình như rẽ nhầm hẻm rồi...',
    avatarMood: 'stressed',
    leftChoice: {
      text: 'Về đi anh, mai tính lại',
      modifiers: { energy: 5, sanity: 5, wallet: 5, affection: -3 },
      narrativeReaction: 'Hai đứa quay xe về. Hẻm cụt đúng nghĩa, ví thì nguyên vẹn.',
    },
    rightChoice: {
      text: 'Cứ đi tiếp xem sao',
      modifiers: { energy: -5, sanity: -5, affection: 5 },
      narrativeReaction: 'Hẻm nối hẻm, đèn thì thưa dần. Nhưng không khí hơi kỳ lạ, và... em thấy tò mò.',
      nextCardId: 'ch1-evening-riverside-snails',
    },
  },
  {
    id: 'ch1-evening-riverside-snails',
    chapterId: 'CH1_DATING',
    timeSlot: 'EVENING',
    situation: 'Đi thêm 2km nữa và chính thức lạc ra bờ kè lộng gió! Giờ tấp vào ăn ốc luôn nha?',
    avatarMood: 'happy',
    leftChoice: {
      text: 'Ăn đi anh, ốc nóng + gió mát thì còn gì bằng',
      modifiers: { wallet: -15, affection: 15, sanity: 10, energy: -5 },
      narrativeReaction: 'Hai đứa ngồi xổm ăn ốc trên bờ kè, gió thổi tung tóc. Lạc đường hóa ra là kỷ niệm đẹp nhất tuần.',
    },
    rightChoice: {
      text: 'Thôi về em sợ dark, để mai em dẫn anh đi chỗ khác',
      modifiers: { energy: 5, sanity: 5, wallet: 10, affection: -5 },
      narrativeReaction: 'Bỏ lỡ cả bờ kè lẫn ổ ốc, nhưng ví anh giữ được. Em hơi tiếc cái gió đêm nay.',
    },
  },
];

/** Combined Chapter 1 deck (Phase 1 + Phase 3 expansion), 25+ cards. */
export const CHAPTER1_ALL: GameCard[] = [...CHAPTER1_CARDS, ...EXTRA_CARDS];

export const CHAPTER1_ALL_MAP: Record<string, GameCard> = Object.fromEntries(
  CHAPTER1_ALL.map((c) => [c.id, c]),
);
