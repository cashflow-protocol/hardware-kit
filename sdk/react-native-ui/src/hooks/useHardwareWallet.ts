import { useState, useCallback, useRef } from 'react';
import type {
  HardwareWalletAdapter,
  ConnectedWallet,
  DiscoveredDevice,
  DiscoveryConfig,
  HardwareAccount,
  HardwareWalletSigner,
} from '@heymike/hw-core';
import { HardwareWalletError } from '@heymike/hw-core';

export interface UseHardwareWalletReturn {
  // Discovery
  devices: DiscoveredDevice[];
  isScanning: boolean;
  startDiscovery: (config?: DiscoveryConfig) => void;
  stopDiscovery: () => void;

  // Connection
  connectedWallet: ConnectedWallet | null;
  isConnecting: boolean;
  connect: (device?: DiscoveredDevice) => Promise<void>;
  disconnect: () => Promise<void>;

  // Accounts
  accounts: HardwareAccount[];
  isLoadingAccounts: boolean;
  loadAccounts: (limit?: number) => Promise<void>;
  /** Append the next page of accounts to the current list */
  loadMoreAccounts: (limit?: number) => Promise<void>;

  // Signer
  getSigner: (account: HardwareAccount) => HardwareWalletSigner | null;

  // Error
  error: HardwareWalletError | null;
  clearError: () => void;
}

export function useHardwareWallet(
  adapter: HardwareWalletAdapter,
): UseHardwareWalletReturn {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<HardwareAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [error, setError] = useState<HardwareWalletError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const startDiscovery = useCallback(
    (config?: DiscoveryConfig) => {
      setIsScanning(true);
      setDevices([]);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      (async () => {
        try {
          for await (const device of adapter.discover({
            ...config,
            abortSignal: controller.signal,
          })) {
            setDevices((prev) => {
              // Deduplicate by id
              if (prev.some((d) => d.id === device.id)) return prev;
              return [...prev, device];
            });
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            setError(
              err instanceof HardwareWalletError
                ? err
                : new HardwareWalletError(
                    `Discovery failed: ${err}`,
                    'UNKNOWN' as any,
                  ),
            );
          }
        } finally {
          setIsScanning(false);
        }
      })();
    },
    [adapter],
  );

  const stopDiscovery = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsScanning(false);
  }, []);

  const connect = useCallback(
    async (device?: DiscoveredDevice) => {
      setIsConnecting(true);
      setError(null);
      try {
        const wallet = await adapter.connect(device);
        setConnectedWallet(wallet);
      } catch (err) {
        const hwError =
          err instanceof HardwareWalletError
            ? err
            : new HardwareWalletError(
                `Connection failed: ${err}`,
                'CONNECTION_FAILED' as any,
              );
        setError(hwError);
        throw hwError;
      } finally {
        setIsConnecting(false);
      }
    },
    [adapter],
  );

  const disconnect = useCallback(async () => {
    if (connectedWallet) {
      await connectedWallet.disconnect();
      setConnectedWallet(null);
      setAccounts([]);
    }
  }, [connectedWallet]);

  const fetchAccounts = useCallback(
    async (limit: number | undefined, startIndex: number, append: boolean) => {
      if (!connectedWallet) {
        setError(
          new HardwareWalletError(
            'No wallet connected',
            'CONNECTION_FAILED' as any,
          ),
        );
        return;
      }
      setIsLoadingAccounts(true);
      setError(null);
      try {
        const accts = await connectedWallet.getAccounts(limit, startIndex);
        setAccounts(prev => (append ? [...prev, ...accts] : accts));
      } catch (err) {
        const hwError =
          err instanceof HardwareWalletError
            ? err
            : new HardwareWalletError(
                `Failed to load accounts: ${err}`,
                'UNKNOWN' as any,
              );
        setError(hwError);
      } finally {
        setIsLoadingAccounts(false);
      }
    },
    [connectedWallet],
  );

  const loadAccounts = useCallback(
    (limit?: number) => fetchAccounts(limit, 0, false),
    [fetchAccounts],
  );

  const loadMoreAccounts = useCallback(
    (limit?: number) => fetchAccounts(limit, accounts.length, true),
    [fetchAccounts, accounts.length],
  );

  const getSigner = useCallback(
    (account: HardwareAccount): HardwareWalletSigner | null => {
      if (!connectedWallet) return null;
      return connectedWallet.getSigner(account);
    },
    [connectedWallet],
  );

  return {
    devices,
    isScanning,
    startDiscovery,
    stopDiscovery,
    connectedWallet,
    isConnecting,
    connect,
    disconnect,
    accounts,
    isLoadingAccounts,
    loadAccounts,
    loadMoreAccounts,
    getSigner,
    error,
    clearError,
  };
}
