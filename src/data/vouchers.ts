export interface LoveVoucher {
  id: string;
  icon: string;
  title: string;
  note: string;
}

/**
 * Real-world "milestone" coupons: unlocked by surviving to a day (or by
 * winning outright) and live in the Voucher Wallet HUD. Separate from the
 * victory-only LOVE_VOUCHERS above — these are claimed *during* the run.
 *
 * The static catalogue below (VOUCHERS_DATA) carries no redemption state.
 * Redemption (isRedeemed / redeemedAt) lives in the game store and is
 * persisted to localStorage as `{ [voucherId]: { isRedeemed, redeemedAt } }`.
 */
export interface VoucherItem {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji
  requiredDay: number; // Day milestone to unlock
  isRedeemed: boolean;
  redeemedAt?: string;
  claimMessage: string; // Message pre-filled when sharing/claiming
}

/** Static catalogue entry — redemption fields filled in by the store. */
export type VoucherDef = Omit<VoucherItem, 'isRedeemed' | 'redeemedAt'>;

export const VOUCHERS_DATA: VoucherDef[] = [
  {
    id: 'voucher_boba',
    title: '1 Ly Trà Sữa Full Topping',
    description: 'Có giá trị ship tận cửa bất kể sáng trưa chiều tối, không tính phí vận chuyển.',
    icon: '🧋',
    requiredDay: 3,
    claimMessage: 'Anh ơi! Em dùng voucher "1 Ly Trà Sữa Full Topping" nè, mau order cho em đi!',
  },
  {
    id: 'voucher_massage',
    title: 'Buổi Massage Vai & Lưng 30 Phút',
    description: 'Bạn trai phục vụ tận tình, có đấm lưng xoa bóp chuẩn spa tại gia.',
    icon: '💆‍♀️',
    requiredDay: 7,
    claimMessage: 'Anh ơi! Em kích hoạt voucher "Massage 30 phút", tối nay chuẩn bị phục vụ em nha!',
  },
  {
    id: 'voucher_forgive',
    title: 'Kim Bài Miễn Tử Giận Dỗi (24h)',
    description: 'Miễn trừ mọi lỗi lầm nhỏ, bạn trai cam kết chỉ cười và đồng ý trong vòng 24 giờ.',
    icon: '🛡️',
    requiredDay: 10,
    claimMessage: 'Em xuất chiêu: "Kim Bài Miễn Tử Giận Dỗi"! Trong 24h tới anh phải ngoan ngoãn chiều chuộng em đó!',
  },
  {
    id: 'voucher_feast',
    title: 'Đại Tiệc Buffet / Món Tùy Chọn',
    description: 'Một bữa ăn ngon lành tùy em chọn quán, bạn trai chịu trách nhiệm thanh toán 100%.',
    icon: '🍲',
    requiredDay: 14,
    claimMessage: 'Em đã phá đảo 14 ngày! Em dùng voucher "Đại Tiệc Món Tùy Chọn", tối nay dẫn em đi ăn quán em thích nhé ❤️',
  },
];

/**
 * Victory-only reward coupons (Day-15 win screen). Kept separate from the
 * milestone-based wallet above — used by VictoryModal + phase3 tests.
 */
export const LOVE_VOUCHERS: LoveVoucher[] = [
  {
    id: 'OBEY_DAY',
    icon: '🎟️',
    title: '1 Ngày ngoan ngoãn tuyệt đối',
    note: 'Không cãi lời dù chỉ 1 câu — kể cả khi anh gọi trà điếu.',
  },
  {
    id: 'MASSAGE_30',
    icon: '💆',
    title: 'Suất Massage lưng & vai 30 phút',
    note: 'Bất cứ khi nào em mỏi, gọi là tới. Không cần hẹn trước.',
  },
  {
    id: 'TEA_MEAL',
    icon: '🧋',
    title: 'Khao 1 bữa ăn / trà sữa bất kỳ món gì em thèm',
    note: 'Full topping, topping gì cũng được. Ví anh chịu thay em.',
  },
  {
    id: 'DRIVE_AIR',
    icon: '🚗',
    title: 'Tài xế riêng đèo đi hóng gió lượn lờ',
    note: 'Không cằn nhằn đi đâu, không hỏi về mấy giờ về.',
  },
];
