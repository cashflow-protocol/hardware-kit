import { useState, useCallback, useRef } from 'react';
import type {
  HardwareWalletAdapter,
  DiscoveredDevice,
  DiscoveryConfig,
} from '@heymike/hw-core';
import { HardwareWalletError } from '@heymike/hw-core';

export interface UseDiscoveryReturn {
  devices: DiscoveredDevice[];
  isScanning: boolean;
  startDiscovery: (config?: DiscoveryConfig) => void;
  stopDiscovery: () => void;
  error: HardwareWalletError | null;
}

/**
 * Hook for discovering hardware wallet devices.
 * Simpler than useHardwareWallet — only handles the discovery phase.
 */
export function useDiscovery(
  adapter: HardwareWalletAdapter,
): UseDiscoveryReturn {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<HardwareWalletError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startDiscovery = useCallback(
    (config?: DiscoveryConfig) => {
      setIsScanning(true);
      setDevices([]);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      (async () => {
        try {
          for await (const device of adapter.discover({
            ...config,
            abortSignal: controller.signal,
          })) {
            setDevices((prev) => {
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
    abortRef.current?.abort();
    setIsScanning(false);
  }, []);

  return { devices, isScanning, startDiscovery, stopDiscovery, error };
}
