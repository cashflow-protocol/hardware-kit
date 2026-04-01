import { KeystoneAdapter } from '../src/KeystoneAdapter';
import { HardwareWalletError, HardwareWalletErrorCode, TransportType, WalletType } from '@heymike/hw-core';
import type { QrInteractionHandler } from '@heymike/hw-core';

describe('KeystoneAdapter', () => {
  it('has walletType Keystone and QR transport', () => {
    const handler: QrInteractionHandler = {
      displayQr: jest.fn(),
      scanQr: jest.fn(),
      dismiss: jest.fn(),
    };
    const adapter = new KeystoneAdapter({ qrHandler: handler });
    expect(adapter.walletType).toBe(WalletType.Keystone);
    expect(adapter.supportedTransports).toEqual([TransportType.QR]);
  });

  it('discover yields a single synthetic QR device', async () => {
    const handler: QrInteractionHandler = {
      displayQr: jest.fn(),
      scanQr: jest.fn(),
      dismiss: jest.fn(),
    };
    const adapter = new KeystoneAdapter({ qrHandler: handler });

    const devices = [];
    for await (const device of adapter.discover()) {
      devices.push(device);
    }

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({
      id: 'keystone-qr',
      name: 'Keystone',
      transportType: TransportType.QR,
      walletType: WalletType.Keystone,
    });
  });

  it('connect calls scanQr to read account QR', async () => {
    const scanQr = jest.fn().mockRejectedValue(new Error('no QR'));
    const handler: QrInteractionHandler = {
      displayQr: jest.fn(),
      scanQr,
      dismiss: jest.fn(),
    };
    const adapter = new KeystoneAdapter({ qrHandler: handler });

    await expect(adapter.connect()).rejects.toThrow(HardwareWalletError);
    expect(scanQr).toHaveBeenCalled();
  });

  it('wraps scan errors as QrScanFailed', async () => {
    const handler: QrInteractionHandler = {
      displayQr: jest.fn(),
      scanQr: jest.fn().mockRejectedValue(new Error('camera denied')),
      dismiss: jest.fn(),
    };
    const adapter = new KeystoneAdapter({ qrHandler: handler });

    try {
      await adapter.connect();
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HardwareWalletError);
      expect((e as HardwareWalletError).code).toBe(HardwareWalletErrorCode.QrScanFailed);
    }
  });
});
