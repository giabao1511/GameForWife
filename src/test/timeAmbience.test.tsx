import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, renderHook } from '@testing-library/react';
import GameViewport from '@/components/GameViewport';
import AvatarReaction from '@/components/card/AvatarReaction';
import { useActivePeriod } from '@/lib/timeContext';
import { useUiStore } from '@/store/useUiStore';
import { useGameStore } from '@/store/useGameStore';

beforeEach(() => {
  useUiStore.setState({ devPeriodOverride: null });
  useGameStore.setState({
    stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 },
    // Reset the theme so the ambient-layer assertions below are deterministic
    // regardless of any earlier test in the file.
    appThemeId: 'pastel',
    themeSyncOn: false,
  });
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
  // The visual ambience is now owned by the *theme*, not the clock period. The
  // old per-period overlay + moon/star badges were merged into the theme's
  // particle system, so the viewport paints a single `[data-ambience]` layer
  // whose kind is the active theme's particleType. `data-period` survives on
  // the root for the dev override / gameplay logic. (The root is located via
  // [data-period]: the content is now nested one level deep in a z-10 wrapper.)
  const rootOf = () => document.querySelector('[data-period]')!;

  it('marks the active period on the viewport root and paints one theme layer', () => {
    render(
      <GameViewport>
        <div>kid</div>
      </GameViewport>,
    );
    const root = rootOf();
    expect(root).toHaveAttribute('data-period');
    // Default theme is pastel → its particle system is the single ambience layer.
    expect(root.querySelector('[data-ambience]')).toHaveAttribute('data-ambience', 'hearts');
    // The merged contract: no separate per-period moon/star overlay anymore.
    expect(root.querySelector('[data-moon]')).toBeNull();
    expect(root.querySelector('[data-stars]')).toBeNull();
  });

  it('keeps data-period (clock) independent of the visual layer (theme)', () => {
    // Force the *clock* to latenight, but the *theme* stays pastel: the layer
    // must remain hearts, proving visuals follow the theme, not the clock.
    useUiStore.setState({ devPeriodOverride: 'latenight' });
    render(
      <GameViewport>
        <div>kid</div>
      </GameViewport>,
    );
    const root = rootOf();
    expect(root).toHaveAttribute('data-period', 'latenight');
    expect(root.querySelector('[data-ambience]')).toHaveAttribute('data-ambience', 'hearts');
    expect(root.querySelector('[data-moon]')).toBeNull();
    expect(root.querySelector('[data-stars]')).toBeNull();
  });

  it('switches the visual layer when the active theme changes', () => {
    // Starry camp theme owns the star field — the layer follows the theme.
    useGameStore.setState({ appThemeId: 'starry_camp', themeSyncOn: false });
    render(
      <GameViewport>
        <div>kid</div>
      </GameViewport>,
    );
    const root = rootOf();
    expect(root.querySelector('[data-ambience]')).toHaveAttribute('data-ambience', 'stars');
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
