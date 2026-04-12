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
} from '@heymike/hw-core';
import type { TrezorConnectInterface } from './TrezorAdapter';
import { TrezorSigner } from './TrezorSigner';

export class TrezorConnectedWallet implements ConnectedWallet {
  readonly walletType = WalletType.Trezor;
  readonly transportType = TransportType.DeepLink;
  readonly capabilities: WalletCapabilities = {
    signTransaction: true,
    signMessage: false, // Firmware-dependent, conservative default
    signMultipleTransactions: true,
    displayAddressOnDevice: true,
    blindSigning: false,
  };

  private trezorConnect: TrezorConnectInterface;

  constructor(trezorConnect: TrezorConnectInterface) {
    this.trezorConnect = trezorConnect;
  }

  async getAccounts(
    limit: number = 5,
    startIndex: number = 0,
  ): Promise<HardwareAccount[]> {
    const accounts: HardwareAccount[] = [];

    for (let i = startIndex; i < startIndex + limit; i++) {
      const derivationPath = solanaBip44Path(i, 0);
      try {
        const result = await this.trezorConnect.solanaGetAddress({
          path: derivationPath,
          showOnTrezor: false,
        });

        if (!result.success) {
          const errorPayload = result.payload as { error: string; code?: string };
          throw new HardwareWalletError(
            `Trezor getAddress failed: ${errorPayload.error}`,
            HardwareWalletErrorCode.ConnectionFailed,
            WalletType.Trezor,
          );
        }

        const { address: addr } = result.payload as { address: string };
        accounts.push({
          address: address(addr),
          derivationPath,
          index: i,
        });
      } catch (error) {
        if (error instanceof HardwareWalletError) throw error;
        throw new HardwareWalletError(
          `Failed to get Trezor account: ${error}`,
          HardwareWalletErrorCode.ConnectionFailed,
          WalletType.Trezor,
          error,
        );
      }
    }

    return accounts;
  }

  getSigner(account: HardwareAccount): HardwareWalletSigner {
    return new TrezorSigner(
      this.trezorConnect,
      account.address,
      account.derivationPath,
    );
  }

  async disconnect(): Promise<void> {
    // Deep link connection doesn't need explicit cleanup
  }
}
