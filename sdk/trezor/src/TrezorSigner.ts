import type {
  Address,
  HardwareWalletSigner,
  SignatureDictionary,
  Transaction,
} from '@heymike/hw-core';
import {
  HardwareWalletError,
  HardwareWalletErrorCode,
  WalletType,
} from '@heymike/hw-core';
import type { SignatureBytes } from '@solana/keys';
import type { TransactionPartialSignerConfig } from '@solana/signers';
import type {
  TrezorConnectInterface,
  TrezorErrorPayload,
  TrezorSignedTransactionResult,
} from './TrezorAdapter';
import { mapTrezorError } from './errors';

/**
 * Trezor signer that uses deep linking to Trezor Suite for transaction signing.
 *
 * Each signTransactions call will open Trezor Suite on the device,
 * where the user confirms the transaction on their Trezor hardware wallet.
 */
export class TrezorSigner implements HardwareWalletSigner {
  readonly address: Address;
  readonly derivationPath: string;
  private trezorConnect: TrezorConnectInterface;

  constructor(
    trezorConnect: TrezorConnectInterface,
    address: Address,
    derivationPath: string,
  ) {
    this.trezorConnect = trezorConnect;
    this.address = address;
    this.derivationPath = derivationPath;
  }

  async signTransactions(
    transactions: readonly Transaction[],
    config?: TransactionPartialSignerConfig,
  ): Promise<readonly SignatureDictionary[]> {
    const results: SignatureDictionary[] = [];

    for (const tx of transactions) {
      config?.abortSignal?.throwIfAborted();

      try {
        // Trezor's solanaSignTransaction expects a hex-encoded serialized
        // Solana message. Default is `serialize: false` which means
        // `serializedTx` is just message bytes (not a full Transaction).
        // See @trezor/connect solanaSignTransaction.js::payloadToPrecomposed.
        const serializedTx = Buffer.from(tx.messageBytes).toString('hex');

        const result = await this.trezorConnect.solanaSignTransaction({
          path: this.derivationPath,
          serializedTx,
        });

        if (!result.success) {
          throw mapTrezorError(result.payload as TrezorErrorPayload);
        }

        const { signature } = result.payload as TrezorSignedTransactionResult;
        const sigBytes = new Uint8Array(
          Buffer.from(signature, 'hex'),
        ) as SignatureBytes;

        if (sigBytes.length !== 64) {
          throw new HardwareWalletError(
            `Expected 64-byte signature from Trezor, got ${sigBytes.length} bytes`,
            HardwareWalletErrorCode.SigningFailed,
            WalletType.Trezor,
          );
        }

        const sigDict: SignatureDictionary = {
          [this.address]: sigBytes,
        } as SignatureDictionary;

        results.push(Object.freeze(sigDict));
      } catch (error) {
        if (error instanceof HardwareWalletError) throw error;
        throw new HardwareWalletError(
          `Trezor signing error: ${error}`,
          HardwareWalletErrorCode.SigningFailed,
          WalletType.Trezor,
          error,
        );
      }
    }

    return Object.freeze(results);
  }

  async verifyAddressOnDevice(): Promise<boolean> {
    try {
      const result = await this.trezorConnect.solanaGetAddress({
        path: this.derivationPath,
        showOnTrezor: true,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  // Trezor Solana message signing is firmware-dependent.
  // Not implementing signMessages to be safe — consumers can check capabilities.
}
