import type Transport from '@ledgerhq/hw-transport';
import Solana from '@ledgerhq/hw-app-solana';
import { address } from '@solana/addresses';
import {
  type ConnectedWallet,
  type HardwareAccount,
  type HardwareWalletSigner,
  type WalletCapabilities,
  TransportType,
  WalletType,
  HardwareWalletError,
  HardwareWalletErrorCode,
  solanaBip44Path,
  encodeBase58,
} from '@heymike/hw-core';
import { LedgerSigner } from './LedgerSigner';
import { mapLedgerError } from './errors';

export class LedgerConnectedWallet implements ConnectedWallet {
  readonly walletType = WalletType.Ledger;
  readonly transportType: TransportType;
  readonly capabilities: WalletCapabilities = {
    signTransaction: true,
    signMessage: true,
    signMultipleTransactions: true,
    displayAddressOnDevice: true,
    blindSigning: false, // updated after getAppConfiguration
  };

  private solanaApp: Solana;
  private transport: Transport;

  constructor(transport: Transport, transportType: TransportType) {
    this.transport = transport;
    this.transportType = transportType;
    this.solanaApp = new Solana(transport);
  }

  async getAccounts(
    limit: number = 5,
    startIndex: number = 0,
  ): Promise<HardwareAccount[]> {
    const accounts: HardwareAccount[] = [];

    // Check if blind signing is enabled (only on first page)
    if (startIndex === 0) {
      try {
        const config = await this.solanaApp.getAppConfiguration();
        (this.capabilities as any).blindSigning = config.blindSigningEnabled;
      } catch {
        // Ignore - app config may fail on older firmware
      }
    }

    for (let i = startIndex; i < startIndex + limit; i++) {
      const derivationPath = solanaBip44Path(i, 0);
      try {
        // Ledger SDK expects path without "m/" prefix
        const ledgerPath = derivationPath.replace(/^m\//, '');
        const result = await this.solanaApp.getAddress(ledgerPath);
        const addressBytes = result.address;
        // Ledger returns raw 32-byte public key, encode as base58
        const bs58Address = address(
          encodeBase58(addressBytes),
        );
        accounts.push({
          address: bs58Address,
          derivationPath,
          index: i,
        });
      } catch (error) {
        throw mapLedgerError(error);
      }
    }

    return accounts;
  }

  getSigner(account: HardwareAccount): HardwareWalletSigner {
    return new LedgerSigner(
      this.solanaApp,
      account.address,
      account.derivationPath,
    );
  }

  async disconnect(): Promise<void> {
    await this.transport.close();
  }
}
