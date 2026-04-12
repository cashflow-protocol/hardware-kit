import { KeystoneSigner } from '../src/KeystoneSigner';
import { generateSolSignRequest, parseSolSignature } from '../src/qr-protocol';
import { HardwareWalletError, HardwareWalletErrorCode } from '@heymike/hw-core';
import type { Address, QrInteractionHandler } from '@heymike/hw-core';
import type { Transaction } from '@solana/transactions';

const TEST_ADDRESS = '11111111111111111111111111111111' as Address;
const TEST_PATH = "m/44'/501'/0'";
const TEST_XFP = 'abcd1234';
const TEST_PUBKEY_HEX =
  '0000000000000000000000000000000000000000000000000000000000000001';

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

  it('generates a valid UR sign request with hex pubkey address', () => {
    const { ur, encoder } = generateSolSignRequest({
      requestId: '12345678-1234-4234-8234-123456789012',
      signData: Buffer.from([1, 2, 3, 4, 5]),
      path: "m/44'/501'/0'",
      xfp: TEST_XFP,
      addressPubKeyHex: TEST_PUBKEY_HEX,
    });
    expect(ur.type).toBe('sol-sign-request');
    expect(encoder.fragments.length).toBeGreaterThan(0);
  });

  it('generates a valid UR sign request without address (optional)', () => {
    // Regression: previously we passed a base58 address which Keystone's SDK
    // interpreted as hex, producing garbage. The addressPubKeyHex field must
    // be omittable.
    const { ur } = generateSolSignRequest({
      requestId: '12345678-1234-4234-8234-123456789012',
      signData: Buffer.from([1, 2, 3]),
      path: "m/44'/501'/0'",
      xfp: TEST_XFP,
    });
    expect(ur.type).toBe('sol-sign-request');
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
