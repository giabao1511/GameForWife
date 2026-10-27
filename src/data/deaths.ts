import type { StatKey } from './types';

export type DeathId = string;

export interface DeathEnding {
  id: DeathId;
  stat: StatKey;
  emoji: string;
  title: string;
  body: string;
  hint: string; // shown on locked gallery slots as a nudge
}

/**
 * The Death Gallery — 8 humorous endings, 2 per stat. When a stat hits 0 the
 * store picks one of that stat's two endings at random, so different runs
 * unlock different slots and replay stays interesting.
 */
export const DEATH_ENDINGS: DeathEnding[] = [
  {
    id: 'ENERGY_DEPLETED',
    stat: 'energy',
    emoji: '🥔',
    title: 'Sập nguồn vĩnh viễn',
    body: 'Bạn trai biến thành củ khoai tây bất động trên giường. Màn hình điện thoại tắt lịm, duy nhất còn lại là tiếng ngáy kéo dài như nhạc nền phim tài liệu.',
    hint: 'Thử để anh kiệt pin trong một ngày dài',
  },
  {
    id: 'ENERGY_ZOMBIE_SHIFT',
    stat: 'energy',
    emoji: '🧟',
    title: 'Ca làm zombie',
    body: 'Hết pin giữa ca trực, anh gào "em là ai vậy à?" trong lúc vẫn đang gõ email. Sếp tưởng anh upgrade thành nhân viên mode không cần sleep.',
    hint: 'Càng ép lịch, càng nhanh sập — thử để pin chạm 0',
  },
  {
    id: 'SANITY_DEPLETED',
    stat: 'sanity',
    emoji: '🧠',
    title: 'Nổ tung não bộ',
    body: 'Cố gắng giải mã hàm ý câu "Em có sao đâu" quá lâu, chip xử lý cảm xúc bật khói. Giờ anh chỉ biết gật gù không phản bác.',
    hint: 'Đừng trả lời nhanh — dồn căng thẳng dồn dập',
  },
  {
    id: 'SANITY_EXISTENTIAL_3AM',
    stat: 'sanity',
    emoji: '🌀',
    title: 'Crisis 3 giờ sáng',
    body: 'Thức tỉnh lúc 3h, anh ngồi suy tư sự đời trong pose thiền. Từ đó mỗi lần em hỏi "ăn gì?", anh im lặng nhìn vào hư không.',
    hint: 'Giữ sanity rã rài nhiều ngày rồi cho cú va cuối cùng',
  },
  {
    id: 'AFFECTION_DEPLETED',
    stat: 'affection',
    emoji: '🧊',
    title: 'Chiến tranh lạnh',
    body: 'Bị bỏ rơi quá lâu, bạn trai tự thu mình vào góc sofa, quấn mình bằng remote. Anh vẫn trả lời nhưng mỗi câu một chữ.',
    hint: 'Thử swipe "Kệ anh" nhiều lần liên tiếp',
  },
  {
    id: 'AFFECTION_ROOMMATE',
    stat: 'affection',
    emoji: '🪑',
    title: 'Giáng cấp thành phòng bạn',
    body: 'Từ "anh yêu" chuyển sang "cậu". Anh tự đóng gói đồ riêng, trả góp phần tiền nhà sòng phẳng. Tình yêu giờ có hợp đồng.',
    hint: 'Để cưng chiều cạn dần mà không cứu vãn',
  },
  {
    id: 'WALLET_DEPLETED',
    stat: 'wallet',
    emoji: '🍜',
    title: 'Viêm màng túi cấp',
    body: 'Cả hai ăn mì tôm trừ bữa đến hết tháng. Anh nhìn bảng giá ly trà sữa bằng ánh mắt như đọc thư từ biệt.',
    hint: 'Chi tiêu hoang phí để ví chạm 0',
  },
  {
    id: 'WALLET_FOOD_DELIVERY_BLACKOUT',
    stat: 'wallet',
    emoji: '💸',
    title: 'Blacklist shipper',
    body: 'Shipper nhận ra anh, đổi shift không giao khu này nữa. Từ nay đồ ăn tự nấu, mà tủ lạnh thì trống trơn 4 mặt.',
    hint: 'Cứ order đồ ăn cho đến khi ví lên tiếng',
  },
];

export const DEATH_BY_ID: Record<DeathId, DeathEnding> = Object.fromEntries(
  DEATH_ENDINGS.map((d) => [d.id, d]),
);

export function deathsForStat(stat: StatKey): DeathEnding[] {
  return DEATH_ENDINGS.filter((d) => d.stat === stat);
}
