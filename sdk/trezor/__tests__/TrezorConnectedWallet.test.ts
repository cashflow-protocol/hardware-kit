import { TrezorConnectedWallet } from '../src/TrezorConnectedWallet';
import { HardwareWalletError, WalletType, TransportType } from '@heymike/hw-core';
import type { TrezorConnectInterface } from '../src/TrezorAdapter';

function createMockConnect(overrides: Partial<TrezorConnectInterface> = {}): TrezorConnectInterface {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    solanaGetAddress: overrides.solanaGetAddress ?? jest.fn()
      .mockResolvedValueOnce({ success: true, payload: { address: '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM' } })
      .mockResolvedValueOnce({ success: true, payload: { address: 'E9VrvAdGRvCguN2XgGMaheR7C2FeTE8cHQhFBLkTbTBx' } })
      .mockResolvedValueOnce({ success: true, payload: { address: 'CiDwVBFgWV9E5MvXWoLgnEgn2hK7rJikbvfWavzAQz3' } }),
    solanaSignTransaction: overrides.solanaSignTransaction ?? jest.fn().mockResolvedValue({
      success: true,
      payload: { signature: 'ab'.repeat(64) },
    }),
  };
}

describe('TrezorConnectedWallet', () => {
  it('has correct wallet type and transport', () => {
    const wallet = new TrezorConnectedWallet(createMockConnect());
    expect(wallet.walletType).toBe(WalletType.Trezor);
    expect(wallet.transportType).toBe(TransportType.DeepLink);
  });

  it('reports correct capabilities', () => {
    const wallet = new TrezorConnectedWallet(createMockConnect());
    expect(wallet.capabilities.signTransaction).toBe(true);
    expect(wallet.capabilities.signMessage).toBe(false);
    expect(wallet.capabilities.displayAddressOnDevice).toBe(true);
  });

  it('fetches accounts via TrezorConnect', async () => {
    const connect = createMockConnect();
    const wallet = new TrezorConnectedWallet(connect);
    const accounts = await wallet.getAccounts(3);

    expect(accounts).toHaveLength(3);
    expect(connect.solanaGetAddress).toHaveBeenCalledTimes(3);
    expect(accounts[0].index).toBe(0);
    expect(accounts[0].derivationPath).toBe("m/44'/501'/0'/0'");
    expect(accounts[1].index).toBe(1);
    expect(accounts[2].index).toBe(2);
  });

  it('throws HardwareWalletError on getAccounts failure', async () => {
    const connect = createMockConnect({
      solanaGetAddress: jest.fn().mockResolvedValue({
        success: false,
        payload: { error: 'Device not found' },
      }),
    });
    const wallet = new TrezorConnectedWallet(connect);

    await expect(wallet.getAccounts(1)).rejects.toThrow(HardwareWalletError);
  });

  it('returns a signer for an account', async () => {
    const connect = createMockConnect();
    const wallet = new TrezorConnectedWallet(connect);
    const accounts = await wallet.getAccounts(1);
    const signer = wallet.getSigner(accounts[0]);

    expect(signer.address).toBe(accounts[0].address);
    expect(typeof signer.signTransactions).toBe('function');
  });

  it('disconnect is a no-op for deep link wallets', async () => {
    const wallet = new TrezorConnectedWallet(createMockConnect());
    await expect(wallet.disconnect()).resolves.toBeUndefined();
  });
});
