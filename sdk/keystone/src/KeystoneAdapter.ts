import {
  type HardwareWalletAdapter,
  type DiscoveredDevice,
  type DiscoveryConfig,
  type ConnectedWallet,
  type QrInteractionHandler,
  TransportType,
  WalletType,
  HardwareWalletError,
  HardwareWalletErrorCode,
} from '@heymike/hw-core';
import { KeystoneConnectedWallet } from './KeystoneConnectedWallet';
import { parseMultiAccountsFromQr } from './qr-protocol';

export interface KeystoneAdapterConfig {
  /** Handler for QR code display and scanning interactions */
  qrHandler: QrInteractionHandler;
}

export class KeystoneAdapter implements HardwareWalletAdapter {
  readonly walletType = WalletType.Keystone;
  readonly supportedTransports = [TransportType.QR] as const;

  private qrHandler: QrInteractionHandler;

  constructor(config: KeystoneAdapterConfig) {
    this.qrHandler = config.qrHandler;
  }

  async *discover(_config?: DiscoveryConfig): AsyncIterable<DiscoveredDevice> {
    // Keystone is air-gapped — no BLE/USB discovery.
    // Yield a single synthetic device representing the QR connection.
    yield {
      id: 'keystone-qr',
      name: 'Keystone',
      transportType: TransportType.QR,
      walletType: WalletType.Keystone,
    };
  }

  async connect(_device?: DiscoveredDevice): Promise<ConnectedWallet> {
    // "Connecting" to Keystone means scanning the device's account QR code.
    try {
      const urPayload = await this.qrHandler.scanQr();
      const multiAccounts = parseMultiAccountsFromQr(urPayload);
      await this.qrHandler.dismiss();

      return new KeystoneConnectedWallet(
        multiAccounts,
        this.qrHandler,
      );
    } catch (error) {
      if (error instanceof HardwareWalletError) throw error;
      throw new HardwareWalletError(
        `Failed to connect to Keystone: ${error}`,
        HardwareWalletErrorCode.QrScanFailed,
        WalletType.Keystone,
        error,
      );
    }
  }
}
