import { useMemo } from 'react';
import type {
  ConnectedWallet,
  HardwareAccount,
  HardwareWalletSigner,
} from '@heymike/hw-core';

/**
 * Hook that returns a HardwareWalletSigner for the given account.
 * The signer implements @solana/signers interfaces and can be used directly
 * with @solana/kit transaction pipelines.
 *
 * @example
 * const signer = useSigner(connectedWallet, selectedAccount);
 * // signer can now be used with signTransactionMessageWithSigners()
 */
export function useSigner(
  wallet: ConnectedWallet | null,
  account: HardwareAccount | null,
): HardwareWalletSigner | null {
  return useMemo(() => {
    if (!wallet || !account) return null;
    return wallet.getSigner(account);
  }, [wallet, account]);
}
