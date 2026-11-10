/**
 * Time Capsule Letters (Hộp Thư Thời Gian) data.
 *
 * The developer is going on mandatory military service. This feature turns the
 * app into an emotional long-distance keepsake: a real-world countdown to his
 * discharge date plus a "mailbox" of scheduled love letters and photo memories
 * that unlock on real calendar dates (`new Date()`), so his girlfriend reads
 * them over the two years apart.
 *
 * All entries are plain data — the unlock logic and persistence live in the
 * store (useGameStore time-capsule slice) and the countdown math in
 * lib/militaryTime.
 */

export interface TimeCapsuleLetter {
  id: string;
  /** ISO date 'YYYY-MM-DD' — the letter unlocks the moment the clock reaches it. */
  unlockDate: string;
  /** The letter's own title (shown in the reader view). */
  title: string;
  /** The milestone label shown on the envelope / list row. */
  milestoneTitle: string;
  /** Short teaser line for the locked + unlocked list rows. */
  previewExcerpt: string;
  /** The full letter body, read on opening. */
  fullLetter: string;
  /** Optional keepsake photo inside public/capsule/. */
  attachedPhotoUrl?: string;
  /** Optional audio voice note inside public/audio/. */
  audioNoteUrl?: string;
}

/**
 * Configurable enlistment parameters. Set `startDate` to the actual departure
 * date; `dischargeDate` is the target end of service. `totalDays` is the
 * service length (used for progress display) and should equal the day-span
 * between the two dates.
 */
export const ENLISTMENT_CONFIG = {
  startDate: '2027-02-15',
  dischargeDate: '2029-02-15',
  totalDays: 731,
};

export const TIME_CAPSULE_LETTERS: TimeCapsuleLetter[] = [
  {
    id: 'letter_day_1',
    unlockDate: '2027-02-15',
    milestoneTitle: 'Ngày đầu tiên nhập ngũ',
    title: 'Gửi công chúa của anh ngày anh lên đường 💌',
    previewExcerpt: 'Lúc em đọc được thư này chắc anh đã lên xe vào đơn vị rồi...',
    fullLetter: `Lúc em đọc được lá thư này chắc anh đã lên xe đến đơn vị rồi.

Biết là hai năm sắp tới sẽ có những lúc em thấy nhớ, thấy tủi thân vì không có anh kề bên như mọi khi, nhưng anh mong em luôn mỉm cười và sống thật vui vẻ mỗi ngày. Anh đi rèn luyện thật khoẻ mạnh, trưởng thành hơn rồi sẽ về bù đắp lại cho em gấp nhiều lần.

Hãy ăn uống đúng bữa, ngủ sớm và nhớ là anh luôn hướng về em mọi lúc nhé. Thương em nhiều lắm!`,
    // Replace with a real photo at public/capsule/departure.jpg (or .png) — the
    // bundled SVG keepsake below stands in until one is dropped in.
    attachedPhotoUrl: '/capsule/departure.svg',
  },
  {
    id: 'letter_week_1',
    unlockDate: '2027-02-22',
    milestoneTitle: 'Tròn 1 tuần vắng anh',
    title: 'Một tuần trôi qua em đã quen chưa? 🌿',
    previewExcerpt: 'Trong doanh trại kỷ luật lắm nhưng anh vẫn nhớ nụ cười của em...',
    fullLetter: `Đã tròn một tuần anh vào đơn vị rồi. Ở đây từ 5h sáng là kèn báo thức đã thổi vang, gấp chăn màn vuông vức như bánh chưng.

Những lúc rảnh rỗi hiếm hoi, điều đầu tiên anh làm luôn là lôi tấm ảnh nhỏ của em để trong túi ngực ra ngắm. Ngoan ngoãn chờ anh nhé, tuần đầu tiên đã trôi qua rồi nè!`,
  },
  {
    id: 'letter_month_1',
    unlockDate: '2027-03-15',
    milestoneTitle: 'Cột mốc 1 tháng',
    title: 'Chiến binh tí hon đã vượt qua tháng đầu tiên! 🎖️',
    previewExcerpt: 'Em giỏi lắm, thế là chúng mình đã đi qua 30 ngày rồi...',
    fullLetter: `Thế là 1 tháng đã trôi qua thật nhanh! Em ở nhà có ngoan không? Đừng thức khuya lướt điện thoại nhiều đó nhé. Cố gắng thêm từng chút một, anh sẽ sớm được gọi điện về cho em!`,
  },
  {
    id: 'letter_birthday',
    unlockDate: '2028-02-05',
    milestoneTitle: 'Sinh nhật em (05/02) — bù lại muộn một chút 🎂',
    title: 'Chúc mừng sinh nhật cô gái được yêu thương nhất của anh',
    previewExcerpt: 'Thiếu em ở bữa tiệc bánh năm nay, nhưng anh vẫn thổi nến hộ em...',
    fullLetter: `Em gái sinh nhật rồi, còn anh vẫn đội mũ bảo hiểm trong doanh trại không kịp về thổi nến cùng em. Anh xin lỗi, nhưng em hãy hiểu là đây là khoảng thời gian mà anh "nợ" em một lời chúc tốt đẹp nhất.

Anh ước giá như mình có thể xuyên màn hình để ôm em thật chặt. Chúc em luôn trẻ đẹp, luôn bình an và đừng quên là em là niềm kiêu hãnh số 1 của anh trong đơn vị. Thương em!`,
  },
  {
    id: 'letter_halfway',
    unlockDate: '2028-02-15',
    milestoneTitle: 'Tròn 1 năm (giai đoạn giữa)',
    title: 'Nửa chặng đường đã qua rồi em ơi! ⏳',
    previewExcerpt: '365 ngày đã trôi qua... em không biết là anh đã nhớ em nhiều đến mức nào.',
    fullLetter: `Đã tròn một năm kể từ ngày anh lên đường. Nửa chặng đường 2 năm đã qua. Anh biết là 365 ngày xa nhau sẽ có những ngày dài nhất, đêm thâu nhất, em có lúc thấy lạc lõng, có lúc thấy anh như "người xa lạ" vì ít được nghe anh nói chuyện trực tiếp.

Nhưng anh hứa: mọi kỷ luật, mỗi lần thức khuya huấn luyện, mỗi lần mỏi mệt, đều có một phần là vì "mục tiêu" là được về lại bên em. Nửa sau sẽ nhẹ nhàng hơn, anh vững vàng hơn. Cầm tay em thật chặt và cố lên nhé!`,
  },
  {
    id: 'letter_countdown',
    unlockDate: '2028-11-15',
    milestoneTitle: '3 tháng trước khi ra quân',
    title: 'Đi tới đoạn đường cuối cùng 🚀',
    previewExcerpt: 'Chỉ còn 3 tháng thôi em à... anh đếm ngược từng ngày để được ôm em.',
    fullLetter: `Ba tháng nữa thôi là anh được trở về. Hiện tại anh đang đếm ngược từng ngày, từng buổi sáng thức dậy, từng lần được phép gọi điện.

Anh đã chuẩn bị sẵn một món quà nhỏ cho ngày em mở hộp này xong — nhưng bây giờ anh chưa được nói. Em cứ chờ nhé, 90 ngày nữa thôi. Cố gắng thêm một chút, anh sẽ về nhà thật sớm để bù đắp lại mọi thứ. Thương em bằng cả hai năm xa cách.`,
  },
];
