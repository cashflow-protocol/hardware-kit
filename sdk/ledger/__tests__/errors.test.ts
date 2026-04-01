import { mapLedgerError } from '../src/errors';
import { HardwareWalletError, HardwareWalletErrorCode, WalletType } from '@heymike/hw-core';

describe('mapLedgerError', () => {
  it('maps 0x6985 to UserRejected', () => {
    const error = Object.assign(new Error(''), { statusCode: 0x6985 });
    const mapped = mapLedgerError(error);
    expect(mapped.code).toBe(HardwareWalletErrorCode.UserRejected);
    expect(mapped.walletType).toBe(WalletType.Ledger);
  });

  it('maps 0x6A82 to AppNotOpen', () => {
    const error = Object.assign(new Error(''), { statusCode: 0x6a82 });
    const mapped = mapLedgerError(error);
    expect(mapped.code).toBe(HardwareWalletErrorCode.AppNotOpen);
  });

  it('maps 0x5515 to BlindSigningDisabled', () => {
    const error = Object.assign(new Error(''), { statusCode: 0x5515 });
    const mapped = mapLedgerError(error);
    expect(mapped.code).toBe(HardwareWalletErrorCode.BlindSigningDisabled);
  });

  it('maps disconnection messages to ConnectionLost', () => {
    const error = new Error('device disconnected');
    const mapped = mapLedgerError(error);
    expect(mapped.code).toBe(HardwareWalletErrorCode.ConnectionLost);
  });

  it('passes through HardwareWalletError unchanged', () => {
    const original = new HardwareWalletError(
      'test',
      HardwareWalletErrorCode.DeviceBusy,
      WalletType.Ledger,
    );
    expect(mapLedgerError(original)).toBe(original);
  });

  it('maps unknown errors to Unknown code', () => {
    const error = new Error('something weird');
    const mapped = mapLedgerError(error);
    expect(mapped.code).toBe(HardwareWalletErrorCode.Unknown);
    expect(mapped.cause).toBe(error);
  });
});
