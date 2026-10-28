import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import SwipeableCard from '@/components/card/SwipeableCard';
import { useGameStore, defaultInventory } from '@/store/useGameStore';
import * as audio from '@/lib/audio';
import type { GameCard } from '@/data/types';

// The avatar SFX must not fire when interacting with the card body — the
// isolation only goes one way (avatar → card), not the reverse.
vi.mock('@/lib/audio');

const card: GameCard = {
  id: 'c1',
  chapterId: 'CH1_DATING',
  timeSlot: 'MORNING',
  situation: 's',
  avatarMood: 'happy',
  leftChoice: { text: 'L', modifiers: {}, narrativeReaction: 'rL' },
  rightChoice: { text: 'R', modifiers: {}, narrativeReaction: 'rR' },
};

beforeEach(() => {
  useGameStore.setState({
    currentCard: card,
    stats: { energy: 50, affection: 50, sanity: 50, wallet: 50 },
    isGameOver: false,
    lastReaction: null,
    lastStatDelta: null,
    inventory: defaultInventory(),
  } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('avatar/card gesture isolation', () => {
  it('a pointerdown on the avatar never reaches the card drag element', () => {
    render(<SwipeableCard card={card} />);
    const avatar = screen.getByRole('img')!.closest('[data-interactive-avatar]')!;
    const dragEl = screen.getByRole('img')!.closest('[aria-label]')!; // the draggable card div
    const spy = vi.fn();
    // Bubble-phase listener on the card div: the avatar handler stops the
    // event in capture, so neither capture nor bubble ever reaches here.
    dragEl.addEventListener('pointerdown', spy);
    fireEvent.pointerDown(avatar, { clientY: 30 });
    expect(spy).not.toHaveBeenCalled();
    dragEl.removeEventListener('pointerdown', spy);
  });

  it('a pointerdown on the card body reaches the drag element normally', () => {
    render(<SwipeableCard card={card} />);
    const cardText = screen.getByText(card.situation);
    const dragEl = cardText.closest('[aria-label]')!;
    const spy = vi.fn();
    dragEl.addEventListener('pointerdown', spy);
    fireEvent.pointerDown(cardText);
    expect(spy).toHaveBeenCalledTimes(1);
    dragEl.removeEventListener('pointerdown', spy);
  });

  it('card-body interactions do NOT trigger avatar SFX (isolation is one-way)', () => {
    vi.mocked(audio.playPokeTing).mockReset();
    vi.mocked(audio.playHeadPatChime).mockReset();
    render(<SwipeableCard card={card} />);
    const cardText = screen.getByText(card.situation);
    fireEvent.pointerDown(cardText);
    fireEvent.pointerUp(cardText);
    expect(audio.playPokeTing).not.toHaveBeenCalled();
    expect(audio.playHeadPatChime).not.toHaveBeenCalled();
  });
});
