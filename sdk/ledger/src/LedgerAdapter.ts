import type Transport from '@ledgerhq/hw-transport';
import {
  type HardwareWalletAdapter,
  type DiscoveredDevice,
  type DiscoveryConfig,
  type ConnectedWallet,
  TransportType,
  WalletType,
  HardwareWalletError,
  HardwareWalletErrorCode,
} from '@heymike/hw-core';
import { LedgerConnectedWallet } from './LedgerConnectedWallet';

export interface LedgerAdapterConfig {
  /**
   * Factory that returns a BLE transport class.
   * Consumers pass: () => require('@ledgerhq/react-native-hw-transport-ble').default
   * This avoids a hard dependency on native modules.
   */
  transportBle?: () => typeof Transport & {
    listen(observer: {
      next: (event: { type: string; descriptor: any }) => void;
      error: (error: any) => void;
      complete: () => void;
    }): { unsubscribe: () => void };
    open(descriptor: any): Promise<Transport>;
  };
  /**
   * Factory that returns a USB HID transport class (Android only).
   */
  transportUsb?: () => typeof Transport & {
    open(): Promise<Transport>;
  };
}

export class LedgerAdapter implements HardwareWalletAdapter {
  readonly walletType = WalletType.Ledger;
  readonly supportedTransports: readonly TransportType[];

  private transportBleFactory: LedgerAdapterConfig['transportBle'];
  private transportUsbFactory: LedgerAdapterConfig['transportUsb'];

  constructor(config: LedgerAdapterConfig = {}) {
    this.transportBleFactory = config.transportBle;
    this.transportUsbFactory = config.transportUsb;

    const transports: TransportType[] = [];
    if (config.transportBle) transports.push(TransportType.BLE);
    if (config.transportUsb) transports.push(TransportType.USB);
    this.supportedTransports = transports;
  }

  async *discover(config?: DiscoveryConfig): AsyncIterable<DiscoveredDevice> {
    if (!this.transportBleFactory) {
      throw new HardwareWalletError(
        'No BLE transport configured. Pass transportBle in LedgerAdapterConfig.',
        HardwareWalletErrorCode.BluetoothDisabled,
        WalletType.Ledger,
      );
    }

    const TransportBLE = this.transportBleFactory();
    const timeout = config?.timeout ?? 30_000;
    const abortSignal = config?.abortSignal;

    const devices: DiscoveredDevice[] = [];
    let resolveNext: ((value: IteratorResult<DiscoveredDevice>) => void) | null = null;
    let done = false;

    const subscription = TransportBLE.listen({
      next: (event: { type: string; descriptor: any }) => {
        if (event.type === 'add') {
          const device: DiscoveredDevice = {
            id: event.descriptor.id ?? event.descriptor,
            name: event.descriptor.name ?? event.descriptor.localName ?? 'Ledger',
            transportType: TransportType.BLE,
            walletType: WalletType.Ledger,
            rssi: event.descriptor.rssi,
          };
          if (resolveNext) {
            const resolve = resolveNext;
            resolveNext = null;
            resolve({ value: device, done: false });
          } else {
            devices.push(device);
          }
        }
      },
      error: (error: any) => {
        done = true;
        if (resolveNext) {
          resolveNext({ value: undefined as any, done: true });
          resolveNext = null;
        }
      },
      complete: () => {
        done = true;
        if (resolveNext) {
          resolveNext({ value: undefined as any, done: true });
          resolveNext = null;
        }
      },
    });

    const timer = setTimeout(() => {
      done = true;
      subscription.unsubscribe();
      if (resolveNext) {
        resolveNext({ value: undefined as any, done: true });
        resolveNext = null;
      }
    }, timeout);

    const abortHandler = () => {
      done = true;
      subscription.unsubscribe();
      clearTimeout(timer);
      if (resolveNext) {
        resolveNext({ value: undefined as any, done: true });
        resolveNext = null;
      }
    };
    abortSignal?.addEventListener('abort', abortHandler);

    try {
      while (!done) {
        if (devices.length > 0) {
          yield devices.shift()!;
        } else {
          const result = await new Promise<IteratorResult<DiscoveredDevice>>(
            (resolve) => {
              resolveNext = resolve;
            },
          );
          if (result.done) break;
          yield result.value;
        }
      }
    } finally {
      subscription.unsubscribe();
      clearTimeout(timer);
      abortSignal?.removeEventListener('abort', abortHandler);
    }
  }

  async connect(device?: DiscoveredDevice): Promise<ConnectedWallet> {
    if (!device) {
      throw new HardwareWalletError(
        'A discovered device is required to connect to a Ledger',
        HardwareWalletErrorCode.DeviceNotFound,
        WalletType.Ledger,
      );
    }

    let transport: Transport;
    try {
      if (
        device.transportType === TransportType.BLE &&
        this.transportBleFactory
      ) {
        const TransportBLE = this.transportBleFactory();
        transport = await TransportBLE.open(device.id);
      } else if (
        device.transportType === TransportType.USB &&
        this.transportUsbFactory
      ) {
        const TransportUSB = this.transportUsbFactory();
        transport = await TransportUSB.open();
      } else {
        throw new HardwareWalletError(
          `No transport configured for ${device.transportType}`,
          HardwareWalletErrorCode.ConnectionFailed,
          WalletType.Ledger,
        );
      }
    } catch (error) {
      if (error instanceof HardwareWalletError) throw error;
      throw new HardwareWalletError(
        `Failed to connect to Ledger: ${error}`,
        HardwareWalletErrorCode.ConnectionFailed,
        WalletType.Ledger,
        error,
      );
    }

    return new LedgerConnectedWallet(transport, device.transportType);
  }
}
