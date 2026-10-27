import { describe, expect, it } from 'vitest';
import { TIME_CARDS, TIME_LATENIGHT_SPECIAL_ID } from '@/data/timeCards';
import { CHAPTER1_ALL, EXTRA_CARDS } from '@/data/cards/chapter1Extra';
import { CHAPTER1_CARDS } from '@/data/cards/chapter1';

describe('TIME_CARDS', () => {
  it('has 7 cards: 2 per day period + 1 latenight exclusive', () => {
    expect(TIME_CARDS).toHaveLength(7);
    const byPref = (p: string) => TIME_CARDS.filter((c) => c.preferredPeriod === p);
    expect(byPref('morning')).toHaveLength(2);
    expect(byPref('afternoon')).toHaveLength(2);
    expect(byPref('evening')).toHaveLength(2);
  });

  it('the latenight special is exclusive to the latenight period', () => {
    const special = TIME_CARDS.find((c) => c.id === TIME_LATENIGHT_SPECIAL_ID)!;
    expect(special.exclusivePeriod).toBe('latenight');
    expect(special.timeSlot).toBe('NIGHT');
  });

  it('every time card carries a preferredPeriod matching its TimeSlot era', () => {
    for (const c of TIME_CARDS) {
      expect(c.preferredPeriod).toBeDefined();
      expect(c.chapterId).toBe('CH1_DATING');
      expect(c.situation.length).toBeGreaterThan(0);
      expect(c.leftChoice.text.length).toBeGreaterThan(0);
      expect(c.rightChoice.text.length).toBeGreaterThan(0);
    }
  });
});

describe('CHAPTER1_ALL integration', () => {
  it('includes all TIME_CARDS exactly once each', () => {
    for (const c of TIME_CARDS) {
      expect(CHAPTER1_ALL.filter((x) => x.id === c.id)).toHaveLength(1);
    }
    expect(CHAPTER1_ALL).toHaveLength(CHAPTER1_CARDS.length + EXTRA_CARDS.length + TIME_CARDS.length);
  });

  it('all ids in CHAPTER1_ALL are unique', () => {
    const ids = CHAPTER1_ALL.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
