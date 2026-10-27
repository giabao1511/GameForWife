/**
 * Memories Scrapbook (Photo Album) data.
 * Surviving to a milestone day unlocks a shared photo — the emotional payoff
 * of the run, collected in the scrapbook album (ScrapbookModal).
 */
export interface MemoryItem {
  id: string;
  unlockDay: number;
  title: string;
  dateStr: string;
  imageSrc: string;
  note: string;
  location?: string;
}

export const MEMORIES_DATA: MemoryItem[] = [
  {
    id: 'mem_day_3',
    unlockDay: 3,
    title: 'Buổi hẹn hò đầu tiên',
    dateStr: 'Lần đầu gặp gỡ',
    imageSrc: '/memories/day3.svg',
    note: 'Cái ngày mà ai đó ngại ngùng không dám nhìn thẳng vào mắt anh quá 3 giây.',
    location: 'Quán cà phê quen',
  },
  {
    id: 'mem_day_7',
    unlockDay: 7,
    title: 'Chuyến đi xa cùng nhau',
    dateStr: 'Chuyến đi đầu tiên',
    imageSrc: '/memories/day7.svg',
    note: 'Lần đầu đèo nhau đi hơn 100km, dính mưa nhưng vẫn cười toe toét.',
    location: 'Bờ biển hoàng hôn',
  },
  {
    id: 'mem_day_10',
    unlockDay: 10,
    title: 'Bức ảnh dìm hàng lịch sử',
    dateStr: 'Một tối lười biếng',
    imageSrc: '/memories/day10.svg',
    note: 'Ăn no xong lăn ra ngủ như hai chú mèo con.',
    location: 'Góc sofa thân quen',
  },
  {
    id: 'mem_day_14',
    unlockDay: 14,
    title: '14 Ngày bên nhau & Mãi mãi',
    dateStr: 'Hiện tại & Tương lai',
    imageSrc: '/memories/day14.svg',
    note: 'Cảm ơn em vì đã luôn kiên nhẫn chăm sóc một bạn trai đôi khi hơi ngốc xít này ❤️',
    location: 'Trong tim anh',
  },
];
