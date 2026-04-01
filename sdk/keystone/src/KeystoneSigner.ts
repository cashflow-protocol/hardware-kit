import { randomUUID } from 'crypto';
import type {
  Address,
  HardwareWalletSigner,
  SignatureDictionary,
  Transaction,
  QrInteractionHandler,
} from '@heymike/hw-core';
import {
  HardwareWalletError,
  HardwareWalletErrorCode,
  WalletType,
} from '@heymike/hw-core';
import type { SignatureBytes } from '@solana/keys';
import type { TransactionPartialSignerConfig } from '@solana/signers';
import { generateSolSignRequest, parseSolSignature } from './qr-protocol';

/**
 * Keystone signer that uses QR codes for air-gapped transaction signing.
 *
 * The signing flow:
 * 1. Encode transaction as UR QR code
 * 2. Display QR for user to scan with Keystone device
 * 3. User approves on Keystone, which displays response QR
 * 4. App scans response QR to extract signature
 */
export class KeystoneSigner implements HardwareWalletSigner {
  readonly address: Address;
  readonly derivationPath: string;
  private xfp: string;
  private qrHandler: QrInteractionHandler;

  constructor(
    address: Address,
    derivationPath: string,
    xfp: string,
    qrHandler: QrInteractionHandler,
  ) {
    this.address = address;
    this.derivationPath = derivationPath;
    this.xfp = xfp;
    this.qrHandler = qrHandler;
  }

  async signTransactions(
    transactions: readonly Transaction[],
    config?: TransactionPartialSignerConfig,
  ): Promise<readonly SignatureDictionary[]> {
    const results: SignatureDictionary[] = [];

    for (const tx of transactions) {
      config?.abortSignal?.throwIfAborted();

      const requestId = randomUUID();

      // 1. Generate the sign request UR
      const { encoder } = generateSolSignRequest({
        requestId,
        signData: Buffer.from(tx.messageBytes),
        path: this.derivationPath,
        xfp: this.xfp,
        address: this.address,
      });

      // 2. Display animated QR for user to scan with Keystone
      const qrParts = encoder.encodeWhole();
      // For multi-part URs, we display them sequentially
      // For single-part, just show the one QR
      const qrContent = qrParts.length === 1
        ? qrParts[0]
        : qrParts.join('\n');

      await this.qrHandler.displayQr(qrContent, 'sol-sign-request');

      // 3. Scan the signature QR from Keystone
      let signaturePayload: string;
      try {
        signaturePayload = await this.qrHandler.scanQr();
      } catch (error) {
        await this.qrHandler.dismiss();
        throw new HardwareWalletError(
          'Failed to scan signature QR from Keystone',
          HardwareWalletErrorCode.QrScanFailed,
          WalletType.Keystone,
          error,
        );
      }

      await this.qrHandler.dismiss();

      // 4. Parse the signature
      const { signature } = parseSolSignature(signaturePayload);

      const sigDict: SignatureDictionary = {
        [this.address]: new Uint8Array(signature) as SignatureBytes,
      } as SignatureDictionary;

      results.push(Object.freeze(sigDict));
    }

    return Object.freeze(results);
  }

  // Keystone does NOT support off-chain message signing for Solana
  // signMessages is intentionally not implemented
}
