import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import AvatarReaction from '@/components/card/AvatarReaction';
import { useGameStore } from '@/store/useGameStore';
import { haptic } from '@/lib/haptics';
import * as audio from '@/lib/audio';

vi.mock('@/lib/audio');
vi.mock('@/lib/haptics');

beforeEach(() => {
  vi.mocked(audio.playPokeTing).mockReset();
  vi.mocked(audio.playDizzyWobble).mockReset();
  vi.mocked(audio.playHeadPatChime).mockReset();
  vi.mocked(haptic.thresholdTick).mockReset();
  vi.mocked(haptic.pop).mockReset();
  useGameStore.setState({
    lastPettedDay: -1,
    isGameOver: false,
    isVictory: false,
    day: 1,
    currentCard: null,
    lastReaction: null,
  } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function tap(svg: Element, y: number) {
  fireEvent.pointerDown(svg, { clientY: y, clientX: 0 });
  fireEvent.pointerUp(svg, { clientY: y, clientX: 0 });
}

describe('AvatarReaction interactivity', () => {
  it('single tap → poke: ting + single threshold tick', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    tap(svg, 30);
    expect(audio.playPokeTing).toHaveBeenCalledTimes(1);
    expect(haptic.thresholdTick).toHaveBeenCalledTimes(1);
    expect(audio.playDizzyWobble).not.toHaveBeenCalled();
  });

  it('pointerdown on the avatar stops propagation (card drag isolation)', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    const spy = vi.fn();
    svg.parentElement!.addEventListener('pointerdown', spy);
    fireEvent.pointerDown(svg, { clientY: 30 });
    expect(spy).not.toHaveBeenCalled(); // capture-stop kills the bubble before it reaches the card
    svg.parentElement!.removeEventListener('pointerdown', spy);
  });

  it('4 rapid taps → 3 pokes then one dizzy (wobble + double tick)', async () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    for (let i = 0; i < 4; i++) {
      tap(svg, 30);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 25));
      });
    }
    expect(audio.playPokeTing).toHaveBeenCalledTimes(3);
    expect(audio.playDizzyWobble).toHaveBeenCalledTimes(1);
    expect(haptic.thresholdTick).toHaveBeenCalledTimes(4); // 3 pokes + the dizzy double-tick's first half
    // The dizzy double-tick's second pulse arrives 40ms later.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(haptic.thresholdTick).toHaveBeenCalledTimes(5); // 3 pokes + full double dizzy tick
    expect(haptic.pop).not.toHaveBeenCalled();
  });

  it('a slow 4th tap does not dizzy', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<AvatarReaction />);
      const svg = container.querySelector('svg')!;
      tap(svg, 30);
      act(() => {
        vi.advanceTimersByTime(1300);
      });
      tap(svg, 30);
      act(() => {
        vi.advanceTimersByTime(50);
      });
      tap(svg, 30);
      act(() => {
        vi.advanceTimersByTime(50);
      });
      tap(svg, 30);
      expect(audio.playDizzyWobble).not.toHaveBeenCalled();
      expect(audio.playPokeTing).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hair swipe >40px → pet reaction + chime + pop haptic + store toast', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { clientY: 20, clientX: 0 });
    fireEvent.pointerUp(svg, { clientY: 20, clientX: 60 });
    expect(audio.playHeadPatChime).toHaveBeenCalledTimes(1);
    expect(haptic.pop).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().lastReaction).toContain('Được xoa đầu');
  });

  it('a leftward head-pat near the left screen edge still registers (the swipe DELTA, not the absolute end X, must gate the swipe)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    // 50px leftward swipe ending below the 40px mark: the swipe length is
    // what the spec gates on, not where the pointer happens to sit on screen.
    fireEvent.pointerDown(svg, { clientY: 20, clientX: 30 });
    fireEvent.pointerUp(svg, { clientY: 20, clientX: -20 });
    expect(audio.playHeadPatChime).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().lastReaction).toContain('Được xoa đầu');
  });

  it('second head-pat same day → visuals + chime still play, but no new toast', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    useGameStore.setState({ lastPettedDay: 1 } as never); // store day defaults to 1 → on cooldown
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { clientY: 20, clientX: 0 });
    fireEvent.pointerUp(svg, { clientY: 20, clientX: 60 });
    expect(audio.playHeadPatChime).toHaveBeenCalledTimes(1);
    expect(haptic.pop).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().lastReaction).toBeNull(); // cooldown: no toast
  });

  it('a head-pat during dizzy overrides dizzy without a snap-back when the dizzy timer expires (Review Focus #2)', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<AvatarReaction />);
      const svg = container.querySelector('svg')!;
      for (let i = 0; i < 4; i++) {
        tap(svg, 30);
        act(() => {
          vi.advanceTimersByTime(100);
        });
      }
      expect(container.querySelector('[data-dizzy-halo]')).not.toBeNull();
      fireEvent.pointerDown(svg, { clientY: 20, clientX: 0 });
      fireEvent.pointerUp(svg, { clientY: 20, clientX: 60 });
      expect(container.querySelector('[data-dizzy-halo]')).toBeNull();
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(container.querySelector('[data-dizzy-halo]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('dizzy state renders the star halo and the svg keeps overflow visible (Review Focus #5)', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    for (let i = 0; i < 4; i++) tap(svg, 30);
    expect(container.querySelector('[data-dizzy-halo]')).not.toBeNull();
    expect((container.querySelector('svg') as SVGSVGElement).style.overflow).toBe('visible');
  });

  it('a fast horizontal swipe across the FACE still pokes, never head-pats', () => {
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { clientY: 60, clientX: 0 });
    fireEvent.pointerUp(svg, { clientY: 60, clientX: 80 });
    expect(audio.playPokeTing).toHaveBeenCalledTimes(1);
    expect(audio.playHeadPatChime).not.toHaveBeenCalled();
  });

  it('pet reaction renders 3 floating hearts', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const { container } = render(<AvatarReaction />);
    const svg = container.querySelector('svg')!;
    fireEvent.pointerDown(svg, { clientY: 20, clientX: 0 });
    fireEvent.pointerUp(svg, { clientY: 20, clientX: 60 });
    expect(container.querySelectorAll('[data-pet-heart]')).toHaveLength(3);
  });
});
