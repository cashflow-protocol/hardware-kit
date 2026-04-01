import { LedgerAdapter } from '../src/LedgerAdapter';
import { HardwareWalletError, HardwareWalletErrorCode, TransportType, WalletType } from '@heymike/hw-core';

describe('LedgerAdapter', () => {
  it('reports supported transports based on config', () => {
    const adapterBle = new LedgerAdapter({
      transportBle: () => ({} as any),
    });
    expect(adapterBle.supportedTransports).toEqual([TransportType.BLE]);

    const adapterBoth = new LedgerAdapter({
      transportBle: () => ({} as any),
      transportUsb: () => ({} as any),
    });
    expect(adapterBoth.supportedTransports).toEqual([
      TransportType.BLE,
      TransportType.USB,
    ]);

    const adapterNone = new LedgerAdapter();
    expect(adapterNone.supportedTransports).toEqual([]);
  });

  it('has walletType Ledger', () => {
    const adapter = new LedgerAdapter();
    expect(adapter.walletType).toBe(WalletType.Ledger);
  });

  it('throws if discover() called without BLE transport', async () => {
    const adapter = new LedgerAdapter();

    try {
      for await (const _device of adapter.discover()) {
        // should not reach here
      }
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HardwareWalletError);
      expect((e as HardwareWalletError).code).toBe(
        HardwareWalletErrorCode.BluetoothDisabled,
      );
    }
  });

  it('throws if connect() called without device', async () => {
    const adapter = new LedgerAdapter({
      transportBle: () => ({} as any),
    });

    await expect(adapter.connect()).rejects.toThrow(HardwareWalletError);
    await expect(adapter.connect()).rejects.toMatchObject({
      code: HardwareWalletErrorCode.DeviceNotFound,
    });
  });

  it('discovers BLE devices from TransportBLE.listen()', async () => {
    const mockDevice = {
      id: 'abc-123',
      name: 'Nano X',
      rssi: -55,
    };

    const mockTransportBLE = {
      listen: (observer: any) => {
        // Emit a device then complete
        setTimeout(() => {
          observer.next({ type: 'add', descriptor: mockDevice });
          observer.complete();
        }, 10);
        return { unsubscribe: jest.fn() };
      },
      open: jest.fn(),
    };

    const adapter = new LedgerAdapter({
      transportBle: () => mockTransportBLE as any,
    });

    const devices = [];
    for await (const device of adapter.discover({ timeout: 5000 })) {
      devices.push(device);
    }

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({
      id: 'abc-123',
      name: 'Nano X',
      transportType: TransportType.BLE,
      walletType: WalletType.Ledger,
      rssi: -55,
    });
  });

  it('stops discovery on abort signal', async () => {
    const unsubscribe = jest.fn();
    const mockTransportBLE = {
      listen: (_observer: any) => {
        // Never emit anything — just hang
        return { unsubscribe };
      },
      open: jest.fn(),
    };

    const adapter = new LedgerAdapter({
      transportBle: () => mockTransportBLE as any,
    });

    const controller = new AbortController();
    const devices: any[] = [];

    // Abort after 50ms
    setTimeout(() => controller.abort(), 50);

    for await (const device of adapter.discover({
      abortSignal: controller.signal,
    })) {
      devices.push(device);
    }

    expect(devices).toHaveLength(0);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('connects via BLE transport', async () => {
    const mockTransport = {
      close: jest.fn(),
      decorateAppAPIMethods: jest.fn(),
      send: jest.fn(),
      setScrambleKey: jest.fn(),
    };
    const mockTransportBLE = {
      listen: jest.fn(),
      open: jest.fn().mockResolvedValue(mockTransport),
    };

    const adapter = new LedgerAdapter({
      transportBle: () => mockTransportBLE as any,
    });

    const device = {
      id: 'abc-123',
      name: 'Nano X',
      transportType: TransportType.BLE,
      walletType: WalletType.Ledger,
    };

    const wallet = await adapter.connect(device);
    expect(wallet.walletType).toBe(WalletType.Ledger);
    expect(wallet.transportType).toBe(TransportType.BLE);
    expect(mockTransportBLE.open).toHaveBeenCalledWith('abc-123');
  });
});
