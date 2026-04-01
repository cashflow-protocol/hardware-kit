import type { DiscoveredDevice, WalletType } from './types';

export type HardwareWalletEvent =
  | { type: 'device-found'; device: DiscoveredDevice }
  | { type: 'device-lost'; deviceId: string }
  | { type: 'connection-lost'; walletType: WalletType; reason: string }
  | { type: 'user-confirmation-required'; walletType: WalletType }
  | { type: 'user-confirmed'; walletType: WalletType }
  | { type: 'user-rejected'; walletType: WalletType };

export type HardwareWalletEventListener = (event: HardwareWalletEvent) => void;

export class HardwareWalletEventEmitter {
  private listeners: Set<HardwareWalletEventListener> = new Set();

  on(listener: HardwareWalletEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  off(listener: HardwareWalletEventListener): void {
    this.listeners.delete(listener);
  }

  emit(event: HardwareWalletEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
