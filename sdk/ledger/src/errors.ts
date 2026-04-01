import {
  HardwareWalletError,
  HardwareWalletErrorCode,
  WalletType,
} from '@heymike/hw-core';

/** Ledger status code → HardwareWalletErrorCode mapping */
const STATUS_CODE_MAP: Record<number, HardwareWalletErrorCode> = {
  0x6985: HardwareWalletErrorCode.UserRejected,
  0x6a82: HardwareWalletErrorCode.AppNotOpen,
  0x6b0c: HardwareWalletErrorCode.DeviceBusy,
  0x6e01: HardwareWalletErrorCode.AppNotOpen,
  0x5515: HardwareWalletErrorCode.BlindSigningDisabled,
};

const STATUS_CODE_MESSAGES: Record<number, string> = {
  0x6985: 'Transaction rejected by user on Ledger device',
  0x6a82: 'Solana app is not open on the Ledger device',
  0x6b0c: 'Ledger device is busy with another operation',
  0x6e01: 'Solana app is not open on the Ledger device',
  0x5515: 'Blind signing is disabled on the Ledger device. Enable it in the Solana app settings.',
};

/**
 * Map a Ledger error to a HardwareWalletError.
 * Ledger errors typically have a `statusCode` property.
 */
export function mapLedgerError(error: unknown): HardwareWalletError {
  if (error instanceof HardwareWalletError) return error;

  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error
      ? (error as { statusCode: number }).statusCode
      : undefined;

  if (statusCode && STATUS_CODE_MAP[statusCode]) {
    return new HardwareWalletError(
      STATUS_CODE_MESSAGES[statusCode] ?? `Ledger error: 0x${statusCode.toString(16)}`,
      STATUS_CODE_MAP[statusCode],
      WalletType.Ledger,
      error,
    );
  }

  const message =
    error instanceof Error ? error.message : String(error);

  // Detect common BLE errors
  if (message.includes('disconnected') || message.includes('connection lost')) {
    return new HardwareWalletError(
      'Connection to Ledger device lost',
      HardwareWalletErrorCode.ConnectionLost,
      WalletType.Ledger,
      error,
    );
  }

  return new HardwareWalletError(
    `Ledger error: ${message}`,
    HardwareWalletErrorCode.Unknown,
    WalletType.Ledger,
    error,
  );
}
