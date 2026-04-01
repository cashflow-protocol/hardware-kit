import { KeystoneSDK } from '@keystonehq/keystone-sdk';
import { KeystoneSolanaSDK } from '@keystonehq/keystone-sdk/dist/chains/solana';
import URDecoder from '@ngraveio/bc-ur/dist/urDecoder';
import UREncoder from '@ngraveio/bc-ur/dist/urEncoder';
import type { UR } from '@ngraveio/bc-ur';
import {
  HardwareWalletError,
  HardwareWalletErrorCode,
  WalletType,
} from '@heymike/hw-core';

export interface ParsedMultiAccounts {
  masterFingerprint: string;
  keys: Array<{
    publicKey: string;
    path: string;
    name?: string;
  }>;
  device?: string;
}

/**
 * Parse a UR-encoded multi-accounts QR payload from Keystone.
 * The user scans this QR from their Keystone device to expose their accounts.
 */
export function parseMultiAccountsFromQr(urPayload: string): ParsedMultiAccounts {
  try {
    const ur = URDecoder.decode(urPayload);
    const sdk = new KeystoneSDK();
    const multiAccounts = sdk.parseMultiAccounts(ur);

    return {
      masterFingerprint: multiAccounts.masterFingerprint,
      keys: multiAccounts.keys.map((key) => ({
        publicKey: key.publicKey,
        path: key.path,
        name: key.name,
      })),
      device: multiAccounts.device,
    };
  } catch (error) {
    throw new HardwareWalletError(
      `Failed to parse Keystone accounts QR: ${error}`,
      HardwareWalletErrorCode.InvalidQrResponse,
      WalletType.Keystone,
      error,
    );
  }
}

export interface SolSignRequestParams {
  requestId: string;
  signData: Buffer;
  path: string;
  xfp: string;
  address?: string;
}

/**
 * Generate a Solana sign-request UR for display as QR.
 * Returns the UR-encoded parts that should be displayed as an animated QR.
 */
export function generateSolSignRequest(params: SolSignRequestParams): {
  ur: UR;
  encoder: UREncoder;
} {
  try {
    const sdk = new KeystoneSDK();
    const ur = sdk.sol.generateSignRequest({
      requestId: params.requestId,
      signData: params.signData.toString('hex'),
      dataType: KeystoneSolanaSDK.DataType.Transaction,
      path: params.path,
      xfp: params.xfp,
      address: params.address,
    });

    const encoder = new UREncoder(ur, 200); // 200 byte fragments for QR
    return { ur, encoder };
  } catch (error) {
    throw new HardwareWalletError(
      `Failed to encode Solana sign request for Keystone: ${error}`,
      HardwareWalletErrorCode.QrEncodingFailed,
      WalletType.Keystone,
      error,
    );
  }
}

/**
 * Parse a Solana signature UR response from Keystone.
 * Returns the raw signature bytes.
 */
export function parseSolSignature(urPayload: string): {
  signature: Buffer;
  requestId?: string;
} {
  try {
    const ur = URDecoder.decode(urPayload);
    const sdk = new KeystoneSDK();
    const result = sdk.sol.parseSignature(ur);

    return {
      signature: Buffer.from(result.signature, 'hex'),
      requestId: result.requestId,
    };
  } catch (error) {
    throw new HardwareWalletError(
      `Failed to parse Keystone signature QR: ${error}`,
      HardwareWalletErrorCode.InvalidQrResponse,
      WalletType.Keystone,
      error,
    );
  }
}
