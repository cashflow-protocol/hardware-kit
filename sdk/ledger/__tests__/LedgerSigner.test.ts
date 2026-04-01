import { LedgerSigner } from '../src/LedgerSigner';
import { HardwareWalletError, HardwareWalletErrorCode } from '@heymike/hw-core';
import type { Address } from '@solana/addresses';
import type { Transaction } from '@solana/transactions';
import type { SignableMessage } from '@solana/signers';

// Mock Solana app from Ledger
function createMockSolanaApp(overrides: Partial<{
  signTransaction: jest.Mock;
  signOffchainMessage: jest.Mock;
  getAddress: jest.Mock;
}> = {}) {
  return {
    signTransaction: overrides.signTransaction ?? jest.fn().mockResolvedValue({
      signature: Buffer.alloc(64, 0xab),
    }),
    signOffchainMessage: overrides.signOffchainMessage ?? jest.fn().mockResolvedValue({
      signature: Buffer.alloc(64, 0xcd),
    }),
    getAddress: overrides.getAddress ?? jest.fn().mockResolvedValue({
      address: Buffer.alloc(32, 0x01),
    }),
  } as any;
}

function createMockTransaction(): Transaction {
  return {
    messageBytes: new Uint8Array([1, 2, 3, 4, 5]),
    signatures: {} as any,
  } as Transaction;
}

function createMockMessage(): SignableMessage {
  return {
    content: new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
    signatures: {} as any,
  };
}

const TEST_ADDRESS = '11111111111111111111111111111111' as Address;
const TEST_PATH = "m/44'/501'/0'/0'";
/** Path as Ledger SDK expects it (without m/ prefix) */
const LEDGER_PATH = "44'/501'/0'/0'";

describe('LedgerSigner', () => {
  it('signs a single transaction', async () => {
    const mockApp = createMockSolanaApp();
    const signer = new LedgerSigner(mockApp, TEST_ADDRESS, TEST_PATH);

    const tx = createMockTransaction();
    const results = await signer.signTransactions([tx]);

    expect(results).toHaveLength(1);
    expect(results[0][TEST_ADDRESS]).toBeDefined();
    expect(results[0][TEST_ADDRESS]).toBeInstanceOf(Uint8Array);
    expect(mockApp.signTransaction).toHaveBeenCalledWith(
      LEDGER_PATH,
      expect.any(Buffer),
    );
  });

  it('signs multiple transactions sequentially', async () => {
    const mockApp = createMockSolanaApp();
    const signer = new LedgerSigner(mockApp, TEST_ADDRESS, TEST_PATH);

    const txs = [createMockTransaction(), createMockTransaction(), createMockTransaction()];
    const results = await signer.signTransactions(txs);

    expect(results).toHaveLength(3);
    expect(mockApp.signTransaction).toHaveBeenCalledTimes(3);
  });

  it('signs a message', async () => {
    const mockApp = createMockSolanaApp();
    const signer = new LedgerSigner(mockApp, TEST_ADDRESS, TEST_PATH);

    const msg = createMockMessage();
    const results = await signer.signMessages!([msg]);

    expect(results).toHaveLength(1);
    expect(results![0][TEST_ADDRESS]).toBeDefined();
    expect(mockApp.signOffchainMessage).toHaveBeenCalledWith(
      LEDGER_PATH,
      expect.any(Buffer),
    );
  });

  it('maps user rejection to HardwareWalletError', async () => {
    const mockApp = createMockSolanaApp({
      signTransaction: jest.fn().mockRejectedValue(
        Object.assign(new Error('rejected'), { statusCode: 0x6985 }),
      ),
    });
    const signer = new LedgerSigner(mockApp, TEST_ADDRESS, TEST_PATH);

    await expect(
      signer.signTransactions([createMockTransaction()]),
    ).rejects.toThrow(HardwareWalletError);

    try {
      await signer.signTransactions([createMockTransaction()]);
    } catch (e) {
      expect(e).toBeInstanceOf(HardwareWalletError);
      expect((e as HardwareWalletError).code).toBe(
        HardwareWalletErrorCode.UserRejected,
      );
    }
  });

  it('maps app-not-open to HardwareWalletError', async () => {
    const mockApp = createMockSolanaApp({
      signTransaction: jest.fn().mockRejectedValue(
        Object.assign(new Error('no app'), { statusCode: 0x6a82 }),
      ),
    });
    const signer = new LedgerSigner(mockApp, TEST_ADDRESS, TEST_PATH);

    try {
      await signer.signTransactions([createMockTransaction()]);
    } catch (e) {
      expect(e).toBeInstanceOf(HardwareWalletError);
      expect((e as HardwareWalletError).code).toBe(
        HardwareWalletErrorCode.AppNotOpen,
      );
    }
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    const mockApp = createMockSolanaApp();
    const signer = new LedgerSigner(mockApp, TEST_ADDRESS, TEST_PATH);

    await expect(
      signer.signTransactions([createMockTransaction()], {
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(mockApp.signTransaction).not.toHaveBeenCalled();
  });

  it('verifies address on device', async () => {
    const mockApp = createMockSolanaApp();
    const signer = new LedgerSigner(mockApp, TEST_ADDRESS, TEST_PATH);

    const result = await signer.verifyAddressOnDevice!();
    expect(result).toBe(true);
    expect(mockApp.getAddress).toHaveBeenCalledWith(LEDGER_PATH, true);
  });
});
