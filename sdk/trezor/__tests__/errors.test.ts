import { mapTrezorError } from '../src/errors';
import { HardwareWalletErrorCode, WalletType } from '@heymike/hw-core';

describe('mapTrezorError', () => {
  const err = (code: string) => ({
    error: 'test',
    code,
  });

  describe('maps user rejection codes to UserRejected', () => {
    const codes = [
      'Failure_ActionCancelled',
      'Failure_PinCancelled',
      'Method_Cancel',
      'Method_Interrupted',
      'Method_PermissionsNotGranted',
    ];

    it.each(codes)('%s → UserRejected', (code) => {
      const mapped = mapTrezorError(err(code));
      expect(mapped.code).toBe(HardwareWalletErrorCode.UserRejected);
      expect(mapped.walletType).toBe(WalletType.Trezor);
    });
  });

  describe('maps connection codes to ConnectionLost', () => {
    const codes = [
      'Device_Disconnected',
      'Device_NotFound',
      'Transport_Missing',
      'Backend_Disconnected',
    ];

    it.each(codes)('%s → ConnectionLost', (code) => {
      const mapped = mapTrezorError(err(code));
      expect(mapped.code).toBe(HardwareWalletErrorCode.ConnectionLost);
    });
  });

  describe('maps busy codes to DeviceBusy', () => {
    const codes = ['Device_UsedElsewhere', 'Device_CallInProgress', 'Failure_Busy'];
    it.each(codes)('%s → DeviceBusy', (code) => {
      const mapped = mapTrezorError(err(code));
      expect(mapped.code).toBe(HardwareWalletErrorCode.DeviceBusy);
    });
  });

  describe('maps version mismatch / capability codes to UnsupportedOperation', () => {
    const codes = [
      'Deeplink_VersionMismatch',
      'Device_MissingCapability',
      'Device_FwException',
      'Failure_FirmwareError',
    ];
    it.each(codes)('%s → UnsupportedOperation', (code) => {
      const mapped = mapTrezorError(err(code));
      expect(mapped.code).toBe(HardwareWalletErrorCode.UnsupportedOperation);
    });
  });

  describe('maps init codes to ConnectionFailed', () => {
    const codes = [
      'Init_NotInitialized',
      'Init_AlreadyInitialized',
      'Failure_NotInitialized',
    ];
    it.each(codes)('%s → ConnectionFailed', (code) => {
      const mapped = mapTrezorError(err(code));
      expect(mapped.code).toBe(HardwareWalletErrorCode.ConnectionFailed);
    });
  });

  describe('maps data/param errors to SigningFailed', () => {
    const codes = [
      'Method_InvalidParameter',
      'Method_InvalidPackage',
      'Failure_DataError',
      'Failure_UnexpectedMessage',
    ];
    it.each(codes)('%s → SigningFailed', (code) => {
      const mapped = mapTrezorError(err(code));
      expect(mapped.code).toBe(HardwareWalletErrorCode.SigningFailed);
    });
  });

  it('falls back to SigningFailed for unknown codes', () => {
    const mapped = mapTrezorError({ error: 'something', code: 'Random_Unknown' });
    expect(mapped.code).toBe(HardwareWalletErrorCode.SigningFailed);
  });

  it('works with no code', () => {
    const mapped = mapTrezorError({ error: 'no code' });
    expect(mapped.code).toBe(HardwareWalletErrorCode.SigningFailed);
    expect(mapped.message).toBe('no code');
  });
});
