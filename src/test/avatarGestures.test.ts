import { describe, expect, it } from 'vitest';
import { detectGestures, type PointerSample } from '@/lib/avatarGestures';

const tap = (x: number, y: number, t: number): PointerSample => ({ x, y, t });

describe('detectGestures', () => {
  it('single tap → one poke', () => {
    expect(detectGestures([tap(30, 30, 0)])).toEqual([{ type: 'poke', x: 30, y: 30, t: 0 }]);
  });

  it('two quick taps → two pokes (not dizzy)', () => {
    const out = detectGestures([tap(30, 30, 0), tap(32, 31, 300)]);
    expect(out).toHaveLength(2);
    expect(out.every((e) => e.type === 'poke')).toBe(true);
  });

  it('3 rapid taps → three pokes (dizzy needs 4)', () => {
    const out = detectGestures([tap(30, 30, 0), tap(30, 30, 300), tap(30, 30, 600)]);
    expect(out).toHaveLength(3);
    expect(out.every((e) => e.type === 'poke')).toBe(true);
  });

  it('4 rapid taps within 1.2s → one dizzy, no pokes for that burst', () => {
    const out = detectGestures([
      { x: 20, y: 20, t: 0 },
      { x: 20, y: 20, t: 300 },
      { x: 20, y: 20, t: 600 },
      { x: 20, y: 20, t: 900 },
    ]);
    expect(out).toEqual([{ type: 'dizzy', t: 900 }]);
  });

  it('a slow 4th tap (>1.2s gap) does not make a dizzy', () => {
    const out = detectGestures([
      tap(30, 30, 0),
      tap(30, 30, 1300),
      tap(30, 30, 1350),
      tap(30, 30, 1400),
    ]);
    expect(out.filter((e) => e.type === 'dizzy')).toHaveLength(0);
    expect(out).toHaveLength(4); // all pokes
  });

  it('swipe over hair >40px within 600ms → headpat', () => {
    const out = detectGestures([{ x: 20, y: 20, t: 0, endX: 80, endY: 20, endT: 300 }]);
    expect(out).toEqual([{ type: 'headpat', x: 20, y: 20, t: 0 }]);
  });

  it('vertical-dominant swipe on hair is ignored (Review Focus #3)', () => {
    const out = detectGestures([{ x: 20, y: 20, t: 0, endX: 25, endY: 120, endT: 300 }]);
    expect(out).toEqual([]);
  });

  it('swipe slower than 600ms or shorter than 40px is a tap/poke, not a headpat', () => {
    const tooLong = detectGestures([{ x: 20, y: 20, t: 0, endX: 80, endY: 20, endT: 900 }]);
    const tooShort = detectGestures([{ x: 20, y: 20, t: 0, endX: 45, endY: 20, endT: 200 }]);
    expect(tooLong.every((e) => e.type === 'poke')).toBe(true);
    expect(tooShort.every((e) => e.type === 'poke')).toBe(true);
  });
});
