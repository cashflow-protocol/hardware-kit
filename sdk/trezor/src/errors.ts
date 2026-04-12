import {
  HardwareWalletError,
  HardwareWalletErrorCode,
  WalletType,
} from '@heymike/hw-core';
import type { TrezorErrorPayload } from './TrezorAdapter';

/**
 * Map a TrezorConnect error payload to a HardwareWalletError.
 * Covers both @trezor/connect ERROR_CODES and @trezor/protobuf FailureType codes.
 */
export function mapTrezorError(payload: TrezorErrorPayload): HardwareWalletError {
  const code = payload.code;
  const message = payload.error || 'Unknown Trezor error';

  // User rejection / cancellation codes
  if (
    code === 'Failure_ActionCancelled' ||
    code === 'Failure_PinCancelled' ||
    code === 'Method_Cancel' ||
    code === 'Method_Interrupted' ||
    code === 'Method_PermissionsNotGranted'
  ) {
    return new HardwareWalletError(
      message,
      HardwareWalletErrorCode.UserRejected,
      WalletType.Trezor,
    );
  }

  // Connection/transport issues
  if (
    code === 'Device_Disconnected' ||
    code === 'Device_NotFound' ||
    code === 'Transport_Missing' ||
    code === 'Backend_Disconnected'
  ) {
    return new HardwareWalletError(
      message,
      HardwareWalletErrorCode.ConnectionLost,
      WalletType.Trezor,
    );
  }

  // Device busy / used elsewhere
  if (
    code === 'Device_UsedElsewhere' ||
    code === 'Device_CallInProgress' ||
    code === 'Failure_Busy'
  ) {
    return new HardwareWalletError(
      message,
      HardwareWalletErrorCode.DeviceBusy,
      WalletType.Trezor,
    );
  }

  // Firmware / version compatibility
  if (
    code === 'Deeplink_VersionMismatch' ||
    code === 'Device_MissingCapability' ||
    code === 'Device_FwException' ||
    code === 'Failure_FirmwareError'
  ) {
    return new HardwareWalletError(
      message,
      HardwareWalletErrorCode.UnsupportedOperation,
      WalletType.Trezor,
    );
  }

  // Not initialized / init errors
  if (
    code === 'Init_NotInitialized' ||
    code === 'Init_AlreadyInitialized' ||
    code === 'Failure_NotInitialized'
  ) {
    return new HardwareWalletError(
      message,
      HardwareWalletErrorCode.ConnectionFailed,
      WalletType.Trezor,
    );
  }

  // Invalid params / data errors — often caused by wrong tx format
  if (
    code === 'Method_InvalidParameter' ||
    code === 'Method_InvalidPackage' ||
    code === 'Failure_DataError' ||
    code === 'Failure_UnexpectedMessage'
  ) {
    return new HardwareWalletError(
      message,
      HardwareWalletErrorCode.SigningFailed,
      WalletType.Trezor,
    );
  }

  return new HardwareWalletError(
    message,
    HardwareWalletErrorCode.SigningFailed,
    WalletType.Trezor,
  );
}
