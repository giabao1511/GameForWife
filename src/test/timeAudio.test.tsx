import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { playPeriodAmbience } from '@/lib/audio';
import { useUiStore } from '@/store/useUiStore';
import { useGameStore } from '@/store/useGameStore';
import HudControls from '@/components/hud/HudControls';
import type { RealTimePeriod } from '@/lib/timeContext';

beforeEach(() => {
  useUiStore.setState({ devPeriodOverride: null });
  useGameStore.setState({
    day: 1,
    activeTimeSlot: 'MORNING',
    isVictory: false,
    isGameOver: false,
    isDeathGalleryOpen: false,
    isScrapbookOpen: false,
    isVoucherWalletOpen: false,
    unlockedDeathIds: [],
    unlockedMemoryIds: [],
    voucherWallet: {},
    currentCard: null,
    recentCardIds: [],
    previewModifiers: null,
    previewUnknown: false,
    lastReaction: null,
    lastStatDelta: null,
  } as never);
});

afterEach(cleanup);

describe('playPeriodAmbience', () => {
  it.each(['morning', 'afternoon', 'evening', 'latenight'] as RealTimePeriod[])(
    '%s does not throw without an AudioContext',
    (p) => {
      expect(() => playPeriodAmbience(p)).not.toThrow();
    },
  );
});

describe('HudControls dev period toggle (non-production)', () => {
  it('exposes the 4 periods + Auto and drives devPeriodOverride + slot', () => {
    render(<HudControls />);
    for (const label of ['🌅', '☀️', '🌆', '🌙']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: /🌙/ }));
    expect(useUiStore.getState().devPeriodOverride).toBe('latenight');
    expect(useGameStore.getState().activeTimeSlot).toBe('NIGHT');

    fireEvent.click(screen.getByRole('button', { name: /Auto/ }));
    expect(useUiStore.getState().devPeriodOverride).toBeNull();
    // Auto returns to the real clock and does not force a slot.
    expect(useGameStore.getState().activeTimeSlot).toBe('NIGHT');
  });
});
