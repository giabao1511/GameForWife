import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import EmergencyRevivalModal from '@/components/modals/EmergencyRevivalModal';
import { useGameStore } from '@/store/useGameStore';

// No globals in this project's vitest config → auto-cleanup is not registered.
afterEach(() => {
  cleanup();
  useGameStore.setState({ isRevivalActive: false, pendingDeathStat: null });
});

/** jsdom has no rAF-driven game loop, so this test pins *render* behavior:
 *  the modal mounts only while a revival is intercepted, and shows the SOK
 *  button + sweet-spot oscilloscope wiring. The timing sim itself is pure
 *  math, covered by the store tests + manual play. */
describe('EmergencyRevivalModal', () => {
  it('renders nothing when no revival is active', () => {
    useGameStore.setState({ isRevivalActive: false, pendingDeathStat: null });
    render(<EmergencyRevivalModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the rescue screen with the SOK DIENT button when intercepted', () => {
    useGameStore.setState({ isRevivalActive: true, pendingDeathStat: 'energy' });
    render(<EmergencyRevivalModal />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /SỐC ĐIỆN/ })).toBeTruthy();
    expect(screen.getByText(/Huyết áp tim/)).toBeTruthy();
    expect(screen.getByText(/CẤP CỨU GẤP/)).toBeTruthy();
  });
});
