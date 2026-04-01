import type Solana from '@ledgerhq/hw-app-solana';
import type {
  Address,
  HardwareWalletSigner,
  SignatureDictionary,
  Transaction,
} from '@heymike/hw-core';
import type { SignatureBytes } from '@solana/keys';
import type {
  TransactionPartialSignerConfig,
  MessagePartialSignerConfig,
  SignableMessage,
} from '@solana/signers';
import { mapLedgerError } from './errors';

/**
 * Ledger hardware wallet signer that implements @solana/signers interfaces.
 *
 * Usage with @solana/kit:
 *   const signer = wallet.getSigner(account);
 *   const signedTx = await signTransactionMessageWithSigners(txMessage);
 */
export class LedgerSigner implements HardwareWalletSigner {
  readonly address: Address;
  readonly derivationPath: string;
  private solanaApp: Solana;

  constructor(solanaApp: Solana, address: Address, derivationPath: string) {
    this.solanaApp = solanaApp;
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
        const txBuffer = Buffer.from(tx.messageBytes);
        const { signature } = await this.solanaApp.signTransaction(
          this.derivationPath,
          txBuffer,
        );

        const sigDict: SignatureDictionary = {
          [this.address]: new Uint8Array(signature) as SignatureBytes,
        } as SignatureDictionary;

        results.push(Object.freeze(sigDict));
      } catch (error) {
        throw mapLedgerError(error);
      }
    }

    return Object.freeze(results);
  }

  async signMessages(
    messages: readonly SignableMessage[],
    config?: MessagePartialSignerConfig,
  ): Promise<readonly SignatureDictionary[]> {
    const results: SignatureDictionary[] = [];

    for (const msg of messages) {
      config?.abortSignal?.throwIfAborted();

      try {
        const msgBuffer = Buffer.from(msg.content);
        const { signature } = await this.solanaApp.signOffchainMessage(
          this.derivationPath,
          msgBuffer,
        );

        const sigDict: SignatureDictionary = {
          [this.address]: new Uint8Array(signature) as SignatureBytes,
        } as SignatureDictionary;

        results.push(Object.freeze(sigDict));
      } catch (error) {
        throw mapLedgerError(error);
      }
    }

    return Object.freeze(results);
  }

  async verifyAddressOnDevice(): Promise<boolean> {
    try {
      await this.solanaApp.getAddress(this.derivationPath, true);
      return true;
    } catch {
      return false;
    }
  }
}
