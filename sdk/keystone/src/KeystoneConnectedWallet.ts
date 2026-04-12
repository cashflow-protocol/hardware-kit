import { address } from '@solana/addresses';
import {
  type ConnectedWallet,
  type HardwareAccount,
  type HardwareWalletSigner,
  type WalletCapabilities,
  type QrInteractionHandler,
  TransportType,
  WalletType,
  encodeBase58,
} from '@heymike/hw-core';
import type { ParsedMultiAccounts } from './qr-protocol';
import { KeystoneSigner } from './KeystoneSigner';

export class KeystoneConnectedWallet implements ConnectedWallet {
  readonly walletType = WalletType.Keystone;
  readonly transportType = TransportType.QR;
  readonly capabilities: WalletCapabilities = {
    signTransaction: true,
    signMessage: false, // Keystone Solana app doesn't support off-chain message signing
    signMultipleTransactions: true,
    displayAddressOnDevice: false,
    blindSigning: true, // QR-based, device shows what it can
  };

  private multiAccounts: ParsedMultiAccounts;
  private qrHandler: QrInteractionHandler;

  constructor(
    multiAccounts: ParsedMultiAccounts,
    qrHandler: QrInteractionHandler,
  ) {
    this.multiAccounts = multiAccounts;
    this.qrHandler = qrHandler;
  }

  async getAccounts(
    limit: number = 5,
    startIndex: number = 0,
  ): Promise<HardwareAccount[]> {
    // Keystone exposes a fixed set of pre-exported accounts via the initial
    // QR scan. We can only return what the user exported from their device.
    const keys = this.multiAccounts.keys.slice(startIndex, startIndex + limit);

    return keys.map((key, offset) => {
      // Keystone provides hex-encoded public keys.
      // Convert 32-byte Ed25519 public key to base58 for Solana address.
      const pubKeyBytes = Buffer.from(key.publicKey, 'hex');
      const bs58Address = address(encodeBase58(pubKeyBytes));

      return {
        address: bs58Address,
        derivationPath: key.path,
        index: startIndex + offset,
      };
    });
  }

  getSigner(account: HardwareAccount): HardwareWalletSigner {
    // Find the matching key to get the hex public key for the sign request
    const matchingKey = this.multiAccounts.keys.find(
      (key) => key.path === account.derivationPath,
    );

    return new KeystoneSigner(
      account.address,
      account.derivationPath,
      this.multiAccounts.masterFingerprint,
      this.qrHandler,
      matchingKey?.publicKey,
    );
  }

  async disconnect(): Promise<void> {
    // No persistent connection to close for air-gapped wallets
  }
}
