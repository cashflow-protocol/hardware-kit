import {
  type HardwareWalletAdapter,
  type DiscoveredDevice,
  type DiscoveryConfig,
  type ConnectedWallet,
  TransportType,
  WalletType,
  HardwareWalletError,
  HardwareWalletErrorCode,
} from '@heymike/hw-core';
import { TrezorConnectedWallet } from './TrezorConnectedWallet';

export interface TrezorAdapterConfig {
  /**
   * Function to open a deep link URL (e.g., React Native's Linking.openURL).
   */
  openUrl: (url: string) => Promise<void>;
  /**
   * The URL scheme that Trezor Suite will call back to after signing.
   * e.g., 'myapp://trezor-callback'
   */
  callbackUrl: string;
  /**
   * Manifest for Trezor Connect - identifies your app.
   */
  manifest: {
    appName: string;
    appIcon: string;
  };
  /**
   * Optional: TrezorConnect instance if consumer wants to provide their own.
   * Falls back to @trezor/connect-mobile if available.
   */
  trezorConnect?: TrezorConnectInterface;
}

/**
 * Minimal interface for TrezorConnect to avoid hard dependency on @trezor/connect-mobile.
 * Consumers inject the real implementation.
 */
export interface TrezorConnectInterface {
  init(settings: {
    manifest: { email: string; appUrl: string };
    deeplinkOpen: (url: string) => void;
    deeplinkCallbackUrl: string;
  }): Promise<void>;
  solanaGetAddress(params: {
    path: string;
    showOnTrezor?: boolean;
  }): Promise<TrezorResponse<{ address: string }>>;
  solanaSignTransaction(params: {
    path: string;
    serializedTx: string;
  }): Promise<TrezorResponse<{ signature: string }>>;
}

interface TrezorResponse<T> {
  success: boolean;
  payload: T | { error: string; code?: string };
}

export class TrezorAdapter implements HardwareWalletAdapter {
  readonly walletType = WalletType.Trezor;
  readonly supportedTransports = [TransportType.DeepLink] as const;

  private config: TrezorAdapterConfig;
  private initialized = false;

  constructor(config: TrezorAdapterConfig) {
    this.config = config;
  }

  async *discover(_config?: DiscoveryConfig): AsyncIterable<DiscoveredDevice> {
    // Trezor uses deep linking — no BLE/USB discovery.
    // Yield a single synthetic device.
    yield {
      id: 'trezor-deeplink',
      name: 'Trezor',
      transportType: TransportType.DeepLink,
      walletType: WalletType.Trezor,
    };
  }

  async connect(_device?: DiscoveredDevice): Promise<ConnectedWallet> {
    const trezorConnect = this.config.trezorConnect;
    if (!trezorConnect) {
      throw new HardwareWalletError(
        'TrezorConnect instance is required. Pass trezorConnect in TrezorAdapterConfig.',
        HardwareWalletErrorCode.ConnectionFailed,
        WalletType.Trezor,
      );
    }

    if (!this.initialized) {
      try {
        await trezorConnect.init({
          manifest: {
            email: 'support@example.com',
            appUrl: this.config.callbackUrl,
          },
          deeplinkOpen: (url: string) => this.config.openUrl(url),
          deeplinkCallbackUrl: this.config.callbackUrl,
        });
        this.initialized = true;
      } catch (error) {
        throw new HardwareWalletError(
          `Failed to initialize Trezor Connect: ${error}`,
          HardwareWalletErrorCode.ConnectionFailed,
          WalletType.Trezor,
          error,
        );
      }
    }

    return new TrezorConnectedWallet(trezorConnect);
  }
}
