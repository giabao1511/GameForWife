import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('the star badge toggles the military skin (easter egg)', () => {
    useGameStore.setState({ avatarSkin: 'civilian' });
    render(<TitleScreen />);
    expect(useGameStore.getState().avatarSkin).toBe('civilian');
    fireEvent.click(screen.getByRole('button', { name: /Đội trang phục lính/ }));
    expect(useGameStore.getState().avatarSkin).toBe('military');
    fireEvent.click(screen.getByRole('button', { name: /Bỏ trang phục lính/ }));
    expect(useGameStore.getState().avatarSkin).toBe('civilian');
  });

  // --- PWA install guide (A2HS) ---
  // The banner + sheet are framer-motion AnimatePresence children: mount is
  // deferred a rAF tick and exit animations keep the node in the DOM briefly,
  // so these tests assert with waitFor rather than synchronous getByRole.
  describe('install guide banner + sheet', () => {
    const DISMISS_KEY = 'bf_sim_install_guide_dismissed';

    beforeEach(() => {
      window.localStorage.removeItem(DISMISS_KEY);
    });

    it('shows the dismissible install banner in a normal browser', () => {
      render(<TitleScreen />);
      expect(screen.getByRole('button', { name: /Cài đặt app lên điện thoại/ })).toBeTruthy();
    });

    it('the banner opens the install guide bottom sheet with iOS + Android steps', async () => {
      render(<TitleScreen />);
      screen.getByRole('button', { name: /Cài đặt app lên điện thoại/ }).click();
      const dialog = await screen.findByRole('dialog', { name: 'Hướng dẫn cài đặt ứng dụng' });
      expect(dialog).toBeTruthy();
      expect(await screen.findByText(/Dành cho iPhone/)).toBeTruthy();
      expect(await screen.findByText(/Dành cho Android/)).toBeTruthy();
      // "Thêm vào Màn hình chính" is the shared final step in BOTH guides.
      await waitFor(() =>
        expect(screen.getAllByText(/Thêm vào Màn hình chính/).length).toBeGreaterThanOrEqual(2),
      );
    });

    it('the banner X hides it for good (persists the dismissal)', async () => {
      render(<TitleScreen />);
      fireEvent.click(screen.getByRole('button', { name: /Ẩn hướng dẫn cài đặt/ }));
      expect(window.localStorage.getItem(DISMISS_KEY)).toBe('1');
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /Cài đặt app lên điện thoại/ })).toBeNull(),
      );
    });

    it('a fresh mount honors a stored dismissal and stays hidden', async () => {
      window.localStorage.setItem(DISMISS_KEY, '1');
      render(<TitleScreen />);
      // Banner may flash for the first frame before the effect hides it;
      // assert it ends up gone (exit animation finishes).
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /Cài đặt app lên điện thoại/ })).toBeNull(),
      );
    });

    it('"Đã cài xong" in the sheet dismisses the banner and closes the sheet', async () => {
      render(<TitleScreen />);
      screen.getByRole('button', { name: /Cài đặt app lên điện thoại/ }).click();
      fireEvent.click(await screen.findByRole('button', { name: /Đã cài xong/ }));
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Hướng dẫn cài đặt ứng dụng' }),
        ).toBeNull(),
      );
      expect(window.localStorage.getItem(DISMISS_KEY)).toBe('1');
    });

    it('the menu button also opens the sheet', async () => {
      render(<TitleScreen />);
      fireEvent.click(screen.getByRole('button', { name: /Cài đặt app 📲/ }));
      expect(await screen.findByRole('dialog', { name: 'Hướng dẫn cài đặt ứng dụng' })).toBeTruthy();
    });

    it('in standalone mode the banner, menu button and sheet are all hidden', async () => {
      const original = window.matchMedia;
      window.matchMedia = (q: string) => ({
        matches: q.includes('standalone'),
        media: q,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      });
      try {
        render(<TitleScreen />);
        // Both mount-then-hide on the first frame; assert the settled state.
        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /Cài đặt app lên điện thoại/ })).toBeNull();
          expect(screen.queryByRole('button', { name: /Cài đặt app 📲/ })).toBeNull();
        });
      } finally {
        window.matchMedia = original;
      }
    });
  });
});
