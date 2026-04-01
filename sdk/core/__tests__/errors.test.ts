import { HardwareWalletError, HardwareWalletErrorCode } from '../src/errors';
import { WalletType } from '../src/types';

describe('HardwareWalletError', () => {
  it('creates error with code and wallet type', () => {
    const err = new HardwareWalletError(
      'User rejected the transaction',
      HardwareWalletErrorCode.UserRejected,
      WalletType.Ledger,
    );
    expect(err.message).toBe('User rejected the transaction');
    expect(err.code).toBe('USER_REJECTED');
    expect(err.walletType).toBe('ledger');
    expect(err.name).toBe('HardwareWalletError');
    expect(err).toBeInstanceOf(Error);
  });

  it('creates error with cause', () => {
    const cause = new Error('BLE disconnect');
    const err = new HardwareWalletError(
      'Connection lost',
      HardwareWalletErrorCode.ConnectionLost,
      WalletType.Ledger,
      cause,
    );
    expect(err.cause).toBe(cause);
  });

  it('creates error without wallet type', () => {
    const err = new HardwareWalletError(
      'Unknown error',
      HardwareWalletErrorCode.Unknown,
    );
    expect(err.walletType).toBeUndefined();
  });
});
