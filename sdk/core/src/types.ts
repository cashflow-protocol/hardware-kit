import type { Address } from '@solana/addresses';
import type { SignatureBytes } from '@solana/keys';
import type {
  TransactionPartialSigner,
  MessagePartialSigner,
  SignatureDictionary,
} from '@solana/signers';
import type { Transaction } from '@solana/transactions';

// ─── Enums ──────────────────────────────────────────────────────────

/** How the host device connects to the hardware wallet */
export enum TransportType {
  BLE = 'ble',
  USB = 'usb',
  NFC = 'nfc',
  QR = 'qr',
  DeepLink = 'deeplink',
}

export enum WalletType {
  Ledger = 'ledger',
  Trezor = 'trezor',
  Keystone = 'keystone',
}

// ─── Discovery ──────────────────────────────────────────────────────

/** Metadata about a discovered but not-yet-connected device */
export interface DiscoveredDevice {
  /** Opaque identifier (BLE peripheral id, USB device path, etc.) */
  id: string;
  /** User-visible name */
  name: string | null;
  transportType: TransportType;
  walletType: WalletType;
  /** BLE signal strength (dBm), only for BLE devices */
  rssi?: number;
}

export interface DiscoveryConfig {
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  abortSignal?: AbortSignal;
}

export interface WalletDiscovery {
  /**
   * Returns an async iterable that yields devices as they are found.
   * For QR-based wallets this yields a single synthetic device.
   */
  discover(config?: DiscoveryConfig): AsyncIterable<DiscoveredDevice>;
}

// ─── Accounts ───────────────────────────────────────────────────────

/** A single account inside a hardware wallet */
export interface HardwareAccount {
  address: Address;
  /** e.g. "m/44'/501'/0'/0'" */
  derivationPath: string;
  /** Account index within the wallet */
  index: number;
}

// ─── Capabilities ───────────────────────────────────────────────────

export interface WalletCapabilities {
  signTransaction: boolean;
  signMessage: boolean;
  signMultipleTransactions: boolean;
  displayAddressOnDevice: boolean;
  blindSigning: boolean;
}

// ─── Connection ─────────────────────────────────────────────────────

export interface ConnectedWallet {
  readonly walletType: WalletType;
  readonly transportType: TransportType;
  readonly capabilities: WalletCapabilities;

  /**
   * Enumerate accounts at derivation indices startIndex..startIndex+limit-1.
   * Default: startIndex=0, limit=5.
   *
   * Hardware wallets can derive infinite accounts from their seed;
   * consumers paginate by calling this repeatedly with increasing startIndex.
   */
  getAccounts(limit?: number, startIndex?: number): Promise<HardwareAccount[]>;

  /**
   * Return a @solana/signers-compatible signer for the given account.
   * This is the primary integration point with @solana/kit.
   */
  getSigner(account: HardwareAccount): HardwareWalletSigner;

  /** Cleanly close the transport */
  disconnect(): Promise<void>;
}

// ─── Signer ─────────────────────────────────────────────────────────

/**
 * A hardware wallet signer that implements TransactionPartialSigner
 * and optionally MessagePartialSigner from @solana/signers.
 *
 * This plugs directly into @solana/kit transaction pipelines:
 *   signTransactionMessageWithSigners(txMessage)
 */
export type HardwareWalletSigner<TAddress extends string = string> =
  TransactionPartialSigner<TAddress> &
  Partial<MessagePartialSigner<TAddress>> & {
    /** The derivation path this signer uses */
    readonly derivationPath: string;
    /** Display the address on the hardware device for user verification */
    verifyAddressOnDevice?(): Promise<boolean>;
  };

// ─── Adapter (top-level per-wallet entry point) ─────────────────────

export interface HardwareWalletAdapter extends WalletDiscovery {
  readonly walletType: WalletType;
  readonly supportedTransports: readonly TransportType[];

  /** Connect to a specific discovered device (or the implicit air-gapped device) */
  connect(device?: DiscoveredDevice): Promise<ConnectedWallet>;
}

// ─── QR Interaction (for air-gapped wallets like Keystone) ──────────

/**
 * Handles the UI interaction for QR-based air-gapped signing.
 * Injected into Keystone adapter so signing logic stays decoupled from UI.
 */
export interface QrInteractionHandler {
  /** Display a UR-encoded QR for the user to scan with their Keystone */
  displayQr(urPayload: string, type: string): Promise<void>;
  /** Open camera and scan a UR-encoded QR from the Keystone. Returns the UR payload string. */
  scanQr(): Promise<string>;
  /** Called when the QR interaction is complete */
  dismiss(): Promise<void>;
}

// ─── Re-exports for convenience ─────────────────────────────────────

export type { Address } from '@solana/addresses';
export type { SignatureBytes } from '@solana/keys';
export type {
  TransactionPartialSigner,
  MessagePartialSigner,
  SignatureDictionary,
} from '@solana/signers';
export type { Transaction } from '@solana/transactions';
