import { WalletType } from './types';

export enum HardwareWalletErrorCode {
  // Discovery
  BluetoothDisabled = 'BLUETOOTH_DISABLED',
  BluetoothPermissionDenied = 'BLUETOOTH_PERMISSION_DENIED',
  DeviceNotFound = 'DEVICE_NOT_FOUND',
  DiscoveryTimeout = 'DISCOVERY_TIMEOUT',

  // Connection
  ConnectionFailed = 'CONNECTION_FAILED',
  ConnectionLost = 'CONNECTION_LOST',
  DeviceBusy = 'DEVICE_BUSY',
  AppNotOpen = 'APP_NOT_OPEN',

  // Signing
  UserRejected = 'USER_REJECTED',
  SigningFailed = 'SIGNING_FAILED',
  BlindSigningDisabled = 'BLIND_SIGNING_DISABLED',
  TransactionTooLarge = 'TRANSACTION_TOO_LARGE',
  MessageSigningUnsupported = 'MESSAGE_SIGNING_UNSUPPORTED',

  // QR / Air-gap
  QrScanFailed = 'QR_SCAN_FAILED',
  QrEncodingFailed = 'QR_ENCODING_FAILED',
  InvalidQrResponse = 'INVALID_QR_RESPONSE',

  // Deep link
  DeepLinkFailed = 'DEEP_LINK_FAILED',
  DeepLinkTimeout = 'DEEP_LINK_TIMEOUT',
  CompanionAppNotInstalled = 'COMPANION_APP_NOT_INSTALLED',

  // General
  UnsupportedOperation = 'UNSUPPORTED_OPERATION',
  Unknown = 'UNKNOWN',
}

export class HardwareWalletError extends Error {
  public readonly name = 'HardwareWalletError';

  constructor(
    message: string,
    public readonly code: HardwareWalletErrorCode,
    public readonly walletType?: WalletType,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
