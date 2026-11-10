/**
 * "Gửi Nỗi Nhớ" comfort messages — heartfelt one-liners written by the
 * developer from military service. Shown when she sends a digital hug
 * to the camp (digital heartbeat / virtual squeeze).
 */
export const COMFORT_MESSAGES: string[] = [
  'Anh cũng đang nhớ em nhiều lắm! Ở trong này anh vẫn khỏe, ráng đợi anh về nhé ❤️',
  'Ôm em một cái thật chặt từ xa nè! Hôm nay công chúa của anh đã ăn cơm ngoan chưa?',
  'Đừng buồn nha bé ngoan. Mỗi ngày trôi qua là chúng mình lại gần ngày gặp nhau thêm một chút rồi đó!',
  'Dù ở xa nhưng trái tim anh lúc nào cũng hướng về em. Thơm má em một cái nè 😘',
  'Tối nay nhớ ngủ sớm, đắp chăn cẩn thận kẻo lạnh nha em. Có anh luôn thương em!',
  'Anh đang nhìn lên bầu trời và nghĩ về nụ cười của em đó. Em cười lên một cái cho anh vui nha!',
  'Chiến sĩ của em ở đây rất kiên cường, em ở nhà cũng phải thật vui vẻ và tự hào nhé!',
  'Đếm ngược từng ngày để được về dắt em đi ăn sập quán xá Sài Gòn. Yêu em nhất trên đời!',
];

/**
 * Pick a random comfort message, avoiding the same one back-to-back so the
 * second hug doesn't feel copied-and-pasted.
 */
export function getRandomComfortMessage(lastMessage?: string | null): string {
  const filtered = COMFORT_MESSAGES.filter((m) => m !== lastMessage);
  return filtered[Math.floor(Math.random() * filtered.length)];
}
