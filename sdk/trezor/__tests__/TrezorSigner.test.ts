import { TrezorSigner } from '../src/TrezorSigner';
import { HardwareWalletError, HardwareWalletErrorCode } from '@heymike/hw-core';
import type { Address } from '@solana/addresses';
import type { Transaction } from '@solana/transactions';
import type { TrezorConnectInterface } from '../src/TrezorAdapter';

const TEST_ADDRESS = '11111111111111111111111111111111' as Address;
const TEST_PATH = "m/44'/501'/0'/0'";
const MOCK_SIGNATURE = 'ab'.repeat(64); // 64 bytes hex

function createMockTrezorConnect(overrides: Partial<TrezorConnectInterface> = {}): TrezorConnectInterface {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    handleDeeplink: jest.fn(),
    solanaGetAddress: overrides.solanaGetAddress ?? jest.fn().mockResolvedValue({
      success: true,
      payload: { address: TEST_ADDRESS, path: [], serializedPath: TEST_PATH },
    }),
    solanaSignTransaction: overrides.solanaSignTransaction ?? jest.fn().mockResolvedValue({
      success: true,
      payload: { signature: MOCK_SIGNATURE },
    }),
  };
}

function createMockTransaction(): Transaction {
  return {
    messageBytes: new Uint8Array([1, 2, 3, 4, 5]),
    signatures: {} as any,
  } as Transaction;
}

describe('TrezorSigner', () => {
  it('signs a transaction via deep link', async () => {
    const connect = createMockTrezorConnect();
    const signer = new TrezorSigner(connect, TEST_ADDRESS, TEST_PATH);

    const results = await signer.signTransactions([createMockTransaction()]);

    expect(results).toHaveLength(1);
    expect(results[0][TEST_ADDRESS]).toBeDefined();
    expect(results[0][TEST_ADDRESS]).toBeInstanceOf(Uint8Array);
    expect(connect.solanaSignTransaction).toHaveBeenCalledWith({
      path: TEST_PATH,
      serializedTx: expect.any(String),
    });
  });

  it('maps user rejection to HardwareWalletError', async () => {
    const connect = createMockTrezorConnect({
      solanaSignTransaction: jest.fn().mockResolvedValue({
        success: false,
        payload: { error: 'Cancelled', code: 'Failure_ActionCancelled' },
      }),
    });
    const signer = new TrezorSigner(connect, TEST_ADDRESS, TEST_PATH);

    try {
      await signer.signTransactions([createMockTransaction()]);
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HardwareWalletError);
      expect((e as HardwareWalletError).code).toBe(HardwareWalletErrorCode.UserRejected);
    }
  });

  it('maps generic failure to SigningFailed', async () => {
    const connect = createMockTrezorConnect({
      solanaSignTransaction: jest.fn().mockResolvedValue({
        success: false,
        payload: { error: 'Unknown error' },
      }),
    });
    const signer = new TrezorSigner(connect, TEST_ADDRESS, TEST_PATH);

    try {
      await signer.signTransactions([createMockTransaction()]);
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HardwareWalletError);
      expect((e as HardwareWalletError).code).toBe(HardwareWalletErrorCode.SigningFailed);
    }
  });

  it('signs multiple transactions', async () => {
    const connect = createMockTrezorConnect();
    const signer = new TrezorSigner(connect, TEST_ADDRESS, TEST_PATH);

    const txs = [createMockTransaction(), createMockTransaction()];
    const results = await signer.signTransactions(txs);

    expect(results).toHaveLength(2);
    expect(connect.solanaSignTransaction).toHaveBeenCalledTimes(2);
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    const connect = createMockTrezorConnect();
    const signer = new TrezorSigner(connect, TEST_ADDRESS, TEST_PATH);

    await expect(
      signer.signTransactions([createMockTransaction()], {
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(connect.solanaSignTransaction).not.toHaveBeenCalled();
  });

  it('verifies address on device', async () => {
    const connect = createMockTrezorConnect();
    const signer = new TrezorSigner(connect, TEST_ADDRESS, TEST_PATH);

    const result = await signer.verifyAddressOnDevice!();
    expect(result).toBe(true);
    expect(connect.solanaGetAddress).toHaveBeenCalledWith({
      path: TEST_PATH,
      showOnTrezor: true,
    });
  });
});
