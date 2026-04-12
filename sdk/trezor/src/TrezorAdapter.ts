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
   * Function to open a deep link URL (e.g. `Linking.openURL` from React Native).
   * Trezor Connect invokes this when it needs to launch the Trezor Suite app
   * with a sign / getAddress / etc. request.
   */
  openUrl: (url: string) => void | Promise<void>;
  /**
   * URL scheme that Trezor Suite will call back to after completing an action.
   * Must be a URL your app has registered as a deep link target.
   * e.g. `'myapp://trezor-callback'`
   */
  callbackUrl: string;
  /**
   * Manifest for Trezor Connect — identifies your app to Trezor Suite.
   * All three fields are required.
   */
  manifest: {
    email: string;
    appName: string;
    appUrl: string;
  };
  /**
   * The real TrezorConnect instance from `@trezor/connect-mobile`.
   *
   * ```ts
   * import TrezorConnect from '@trezor/connect-mobile';
   * const adapter = new TrezorAdapter({ trezorConnect: TrezorConnect, ... });
   * ```
   */
  trezorConnect: TrezorConnectInterface;
}

/**
 * Minimal structural interface matching `@trezor/connect-mobile`'s exported
 * TrezorConnect object. Keeps this package free of a hard dependency on the
 * Trezor SDK — consumers inject their own.
 *
 * IMPORTANT: Your app must also register a `Linking` listener that forwards
 * incoming callback URLs to `trezorConnect.handleDeeplink(url)`. Without this,
 * sign / getAddress promises will hang forever.
 *
 * ```ts
 * useEffect(() => {
 *   const sub = Linking.addEventListener('url', ({url}) =>
 *     TrezorConnect.handleDeeplink(url)
 *   );
 *   return () => sub.remove();
 * }, []);
 * ```
 */
export interface TrezorConnectInterface {
  init(settings: TrezorInitSettings): Promise<void>;
  /** Forward a callback deep-link URL received by your app into Trezor Connect. */
  handleDeeplink(url: string): void;
  solanaGetAddress(
    params: TrezorGetAddressParams,
  ): Promise<TrezorResponse<TrezorAddressResult>>;
  solanaSignTransaction(
    params: TrezorSignTransactionParams,
  ): Promise<TrezorResponse<TrezorSignedTransactionResult>>;
}

export interface TrezorInitSettings {
  manifest: { email: string; appName: string; appUrl: string };
  deeplinkOpen: (url: string) => void | Promise<void>;
  deeplinkCallbackUrl: string;
}

export interface TrezorGetAddressParams {
  path: string | number[];
  showOnTrezor?: boolean;
  address?: string;
}

export interface TrezorAddressResult {
  address: string;
  path: number[];
  serializedPath: string;
}

export interface TrezorSignTransactionParams {
  path: string | number[];
  /** Hex-encoded serialized Solana message bytes (or full Transaction when `serialize: true`). */
  serializedTx: string;
  /** If true, `serializedTx` must be a full serialized Transaction. Default false → message bytes only. */
  serialize?: boolean;
}

export interface TrezorSignedTransactionResult {
  signature: string;
  serializedTx?: string;
}

export interface TrezorResponse<T> {
  success: boolean;
  payload: T | TrezorErrorPayload;
}

export interface TrezorErrorPayload {
  error: string;
  /** See `@trezor/connect` ERROR_CODES or `@trezor/protobuf` FailureType. */
  code?: string;
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
          manifest: this.config.manifest,
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
