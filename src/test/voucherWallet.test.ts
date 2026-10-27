import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { VOUCHERS_DATA } from '@/data/vouchers';

const LS_WALLET = 'bf_sim_vouchers_state';

beforeEach(() => {
  localStorage.removeItem(LS_WALLET);
  useGameStore.setState({
    voucherWallet: {},
    isVoucherWalletOpen: false,
  });
});

describe('voucher wallet', () => {
  it('redeemVoucher stamps the voucher with an ISO timestamp', () => {
    const { redeemVoucher } = useGameStore.getState();
    redeemVoucher('voucher_boba');
    const entry = useGameStore.getState().voucherWallet['voucher_boba'];
    expect(entry?.isRedeemed).toBe(true);
    expect(new Date(entry!.redeemedAt!).getTime()).not.toBeNaN();
  });

  it('deduplicates re-redemption', () => {
    const { redeemVoucher } = useGameStore.getState();
    redeemVoucher('voucher_massage');
    const first = useGameStore.getState().voucherWallet['voucher_massage']!;
    redeemVoucher('voucher_massage');
    expect(useGameStore.getState().voucherWallet['voucher_massage']).toEqual(first);
  });

  it('persists the wallet to localStorage under bf_sim_vouchers_state', () => {
    useGameStore.getState().redeemVoucher('voucher_forgive');
    const persisted = JSON.parse(localStorage.getItem(LS_WALLET)!) as Record<string, { isRedeemed: boolean }>;
    expect(persisted['voucher_forgive']?.isRedeemed).toBe(true);
  });

  it('openVoucherWallet / closeVoucherWallet toggle modal visibility', () => {
    const s = () => useGameStore.getState();
    s().openVoucherWallet();
    expect(useGameStore.getState().isVoucherWalletOpen).toBe(true);
    s().closeVoucherWallet();
    expect(useGameStore.getState().isVoucherWalletOpen).toBe(false);
  });

  it('hydrateFromStorage restores a persisted wallet', () => {
    localStorage.setItem(LS_WALLET, JSON.stringify({ voucher_feast: { isRedeemed: true, redeemedAt: '2026-10-28T09:00:00.000Z' } }));
    useGameStore.getState().hydrateFromStorage();
    expect(useGameStore.getState().voucherWallet['voucher_feast']?.isRedeemed).toBe(true);
  });

  it('tolerates corrupt wallet storage', () => {
    localStorage.setItem(LS_WALLET, '{not json');
    useGameStore.getState().hydrateFromStorage();
    expect(useGameStore.getState().voucherWallet).toEqual({});
  });

  it('all catalogue ids are unique and day-ordered', () => {
    const ids = VOUCHERS_DATA.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    const days = VOUCHERS_DATA.map((v) => v.requiredDay);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
  });
});
