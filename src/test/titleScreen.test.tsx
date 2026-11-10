import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import TitleScreen from '@/components/screens/TitleScreen';
import { useGameStore } from '@/store/useGameStore';

function reset() {
  useGameStore.setState({
    currentScreen: 'title',
    day: 1,
    turns: 0,
    isGameOver: false,
    isVictory: false,
  });
}

beforeEach(reset);

afterEach(() => {
  cleanup();
  useGameStore.setState({ currentScreen: 'title' });
});

describe('TitleScreen', () => {
  it('shows the fresh-start CTA when no run is in progress', () => {
    render(<TitleScreen />);
    expect(screen.getByRole('button', { name: /Bắt đầu chơi/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Chơi tiếp/ })).toBeNull();
  });

  it('shows "Chơi tiếp Ngày X" when a run is in progress', () => {
    useGameStore.setState({ turns: 3, day: 2, currentScreen: 'title' });
    render(<TitleScreen />);
    expect(screen.getByRole('button', { name: /Chơi tiếp Ngày 2/ })).toBeTruthy();
  });

  it('the primary CTA enters gameplay via startGame', () => {
    render(<TitleScreen />);
    screen.getByRole('button', { name: /Bắt đầu chơi/ }).click();
    expect(useGameStore.getState().currentScreen).toBe('playing');
  });

  it('the How-to-Play button navigates to the how_to_play view', () => {
    render(<TitleScreen />);
    screen.getByRole('button', { name: /Hướng dẫn cách chơi/ }).click();
    expect(useGameStore.getState().currentScreen).toBe('how_to_play');
  });

  it('the About button navigates to the about view', () => {
    render(<TitleScreen />);
    screen.getByRole('button', { name: /Gửi bé yêu \(About\)/ }).click();
    expect(useGameStore.getState().currentScreen).toBe('about');
  });

  it('the Time Capsule button opens the mailbox modal', () => {
    render(<TitleScreen />);
    screen.getByRole('button', { name: /Hộp thư thời gian/ }).click();
    expect(useGameStore.getState().isTimeCapsuleOpen).toBe(true);
  });
});
