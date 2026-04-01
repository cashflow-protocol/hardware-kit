import { KeystoneConnectedWallet } from '../src/KeystoneConnectedWallet';
import { WalletType, TransportType } from '@heymike/hw-core';
import type { QrInteractionHandler } from '@heymike/hw-core';
import type { ParsedMultiAccounts } from '../src/qr-protocol';

const mockQrHandler: QrInteractionHandler = {
  displayQr: jest.fn().mockResolvedValue(undefined),
  scanQr: jest.fn().mockResolvedValue(''),
  dismiss: jest.fn().mockResolvedValue(undefined),
};

const mockMultiAccounts: ParsedMultiAccounts = {
  masterFingerprint: 'ABCD1234',
  keys: [
    {
      publicKey: '0000000000000000000000000000000000000000000000000000000000000001',
      path: "m/44'/501'/0'",
      name: 'Account 0',
    },
    {
      publicKey: '0000000000000000000000000000000000000000000000000000000000000002',
      path: "m/44'/501'/1'",
      name: 'Account 1',
    },
    {
      publicKey: '0000000000000000000000000000000000000000000000000000000000000003',
      path: "m/44'/501'/2'",
    },
  ],
  device: 'Keystone Pro',
};

describe('KeystoneConnectedWallet', () => {
  it('has correct wallet type and transport', () => {
    const wallet = new KeystoneConnectedWallet(mockMultiAccounts, mockQrHandler);
    expect(wallet.walletType).toBe(WalletType.Keystone);
    expect(wallet.transportType).toBe(TransportType.QR);
  });

  it('reports correct capabilities', () => {
    const wallet = new KeystoneConnectedWallet(mockMultiAccounts, mockQrHandler);
    expect(wallet.capabilities.signTransaction).toBe(true);
    expect(wallet.capabilities.signMessage).toBe(false);
    expect(wallet.capabilities.signMultipleTransactions).toBe(true);
    expect(wallet.capabilities.displayAddressOnDevice).toBe(false);
  });

  it('returns accounts from parsed multi-accounts', async () => {
    const wallet = new KeystoneConnectedWallet(mockMultiAccounts, mockQrHandler);
    const accounts = await wallet.getAccounts(3);

    expect(accounts).toHaveLength(3);
    expect(accounts[0].index).toBe(0);
    expect(accounts[0].derivationPath).toBe("m/44'/501'/0'");
    expect(accounts[1].index).toBe(1);
    expect(accounts[2].index).toBe(2);

    // Each should have a valid base58 address string
    for (const acct of accounts) {
      expect(typeof acct.address).toBe('string');
      expect(acct.address.length).toBeGreaterThan(0);
    }
  });

  it('respects the limit parameter', async () => {
    const wallet = new KeystoneConnectedWallet(mockMultiAccounts, mockQrHandler);
    const accounts = await wallet.getAccounts(1);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].derivationPath).toBe("m/44'/501'/0'");
  });

  it('returns a signer for an account', async () => {
    const wallet = new KeystoneConnectedWallet(mockMultiAccounts, mockQrHandler);
    const accounts = await wallet.getAccounts(1);
    const signer = wallet.getSigner(accounts[0]);

    expect(signer.address).toBe(accounts[0].address);
    expect(signer.derivationPath).toBe("m/44'/501'/0'");
    expect(typeof signer.signTransactions).toBe('function');
  });

  it('disconnect is a no-op for air-gapped wallets', async () => {
    const wallet = new KeystoneConnectedWallet(mockMultiAccounts, mockQrHandler);
    await expect(wallet.disconnect()).resolves.toBeUndefined();
  });
});
