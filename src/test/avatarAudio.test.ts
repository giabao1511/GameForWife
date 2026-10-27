import { describe, expect, it, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { playPokeTing, playDizzyWobble, playHeadPatChime } from '@/lib/audio';
import { useUiStore } from '@/store/useUiStore';

afterEach(() => {
  cleanup();
  useUiStore.setState({ muted: false });
});

describe('avatar interaction SFX', () => {
  it('playPokeTing does not throw without an AudioContext', () => {
    expect(() => playPokeTing()).not.toThrow();
  });

  it('playDizzyWobble does not throw without an AudioContext', () => {
    expect(() => playDizzyWobble()).not.toThrow();
  });

  it('playHeadPatChime does not throw without an AudioContext', () => {
    expect(() => playHeadPatChime()).not.toThrow();
  });

  it('all three stay silent when muted (no throw, no throw-on-mute)', () => {
    useUiStore.setState({ muted: true });
    expect(() => {
      playPokeTing();
      playDizzyWobble();
      playHeadPatChime();
    }).not.toThrow();
  });
});
