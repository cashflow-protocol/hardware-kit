import { KeystoneSigner } from '../src/KeystoneSigner';
import { HardwareWalletError, HardwareWalletErrorCode } from '@heymike/hw-core';
import type { Address, QrInteractionHandler } from '@heymike/hw-core';
import type { Transaction } from '@solana/transactions';

const TEST_ADDRESS = '11111111111111111111111111111111' as Address;
const TEST_PATH = "m/44'/501'/0'";
const TEST_XFP = 'ABCD1234';

// Mock QR interaction handler
function createMockQrHandler(overrides: Partial<QrInteractionHandler> = {}): QrInteractionHandler {
  return {
    displayQr: overrides.displayQr ?? jest.fn().mockResolvedValue(undefined),
    scanQr: overrides.scanQr ?? jest.fn().mockResolvedValue('ur:sol-signature/mock-payload'),
    dismiss: overrides.dismiss ?? jest.fn().mockResolvedValue(undefined),
  };
}

function createMockTransaction(): Transaction {
  return {
    messageBytes: new Uint8Array([1, 2, 3, 4, 5]),
    signatures: {} as any,
  } as Transaction;
}

describe('KeystoneSigner', () => {
  it('has correct address and derivation path', () => {
    const handler = createMockQrHandler();
    const signer = new KeystoneSigner(TEST_ADDRESS, TEST_PATH, TEST_XFP, handler);

    expect(signer.address).toBe(TEST_ADDRESS);
    expect(signer.derivationPath).toBe(TEST_PATH);
  });

  it('does not implement signMessages (Keystone Solana limitation)', () => {
    const handler = createMockQrHandler();
    const signer = new KeystoneSigner(TEST_ADDRESS, TEST_PATH, TEST_XFP, handler);

    // signMessages should not be defined
    expect(signer.signMessages).toBeUndefined();
  });

  it('calls displayQr and scanQr during signing', async () => {
    const displayQr = jest.fn().mockResolvedValue(undefined);
    const scanQr = jest.fn().mockRejectedValue(
      new HardwareWalletError(
        'scan failed',
        HardwareWalletErrorCode.QrScanFailed,
      ),
    );
    const dismiss = jest.fn().mockResolvedValue(undefined);
    const handler = createMockQrHandler({ displayQr, scanQr, dismiss });
    const signer = new KeystoneSigner(TEST_ADDRESS, TEST_PATH, TEST_XFP, handler);

    // Signing will fail at scanQr, but we can verify displayQr was called
    await expect(
      signer.signTransactions([createMockTransaction()]),
    ).rejects.toThrow(HardwareWalletError);

    expect(displayQr).toHaveBeenCalled();
    expect(scanQr).toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalled();
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    const handler = createMockQrHandler();
    const signer = new KeystoneSigner(TEST_ADDRESS, TEST_PATH, TEST_XFP, handler);

    await expect(
      signer.signTransactions([createMockTransaction()], {
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow();

    // Should not have attempted QR interaction
    expect(handler.displayQr).not.toHaveBeenCalled();
  });
});
