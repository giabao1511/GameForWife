import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, renderHook } from '@testing-library/react';
import GameViewport from '@/components/GameViewport';
import AvatarReaction from '@/components/card/AvatarReaction';
import { useActivePeriod } from '@/lib/timeContext';
import { useUiStore } from '@/store/useUiStore';
import { useGameStore } from '@/store/useGameStore';

beforeEach(() => {
  useUiStore.setState({ devPeriodOverride: null });
  useGameStore.setState({ stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 } });
});

// vitest has no globals here, so testing-library's auto-cleanup is off —
// tear down between tests or queries see the previous render too.
afterEach(cleanup);

describe('useActivePeriod', () => {
  it('is deterministic before mount when no override is set', () => {
    // First render (pre-effect) must not read the wall clock, or Next's
    // prerender blocks it — it falls back to a fixed default.
    const { result } = renderHook(() => useActivePeriod());
    expect(['morning', 'afternoon', 'evening', 'latenight']).toContain(result.current);
  });

  it('honors the dev override immediately, no wait for the clock', () => {
    useUiStore.setState({ devPeriodOverride: 'evening' });
    const { result } = renderHook(() => useActivePeriod());
    expect(result.current).toBe('evening');
  });
});

describe('GameViewport ambience', () => {
  it('marks the active period on the viewport root', () => {
    render(
      <GameViewport>
        <div>kid</div>
      </GameViewport>,
    );
    const root = screen.getByText('kid').parentElement!;
    expect(root).toHaveAttribute('data-period');
    expect(root.querySelector('[data-ambience]')).not.toBeNull();
  });

  it('renders the moon badge + stars only for latenight', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    render(
      <GameViewport>
        <div>kid</div>
      </GameViewport>,
    );
    const root = screen.getByText('kid').parentElement!;
    expect(root).toHaveAttribute('data-period', 'latenight');
    expect(root.querySelector('[data-moon]')).not.toBeNull();
    expect(root.querySelector('[data-stars]')).not.toBeNull();
  });

  it('omits moon/stars for morning', () => {
    useUiStore.setState({ devPeriodOverride: 'morning' });
    render(
      <GameViewport>
        <div>kid</div>
      </GameViewport>,
    );
    const root = screen.getByText('kid').parentElement!;
    expect(root.querySelector('[data-moon]')).toBeNull();
    expect(root.querySelector('[data-stars]')).toBeNull();
  });
});

describe('AvatarReaction latenight default', () => {
  it('forces the sleepy look at healthy stats during latenight', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    render(<AvatarReaction />);
    expect(screen.getByRole('img', { name: /sleepy/i })).toBeInTheDocument();
  });

  it('critical danger (stat < 15) overrides the latenight sleepy default', () => {
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    useGameStore.setState({ stats: { energy: 10, affection: 50, sanity: 50, wallet: 50 } });
    render(<AvatarReaction />);
    expect(screen.getByRole('img', { name: /puppy/i })).toBeInTheDocument();
  });
});
