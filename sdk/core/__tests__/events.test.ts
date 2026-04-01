import { HardwareWalletEventEmitter, HardwareWalletEvent } from '../src/events';
import { TransportType, WalletType } from '../src/types';

describe('HardwareWalletEventEmitter', () => {
  it('emits events to listeners', () => {
    const emitter = new HardwareWalletEventEmitter();
    const events: HardwareWalletEvent[] = [];
    emitter.on((e) => events.push(e));

    emitter.emit({
      type: 'device-found',
      device: {
        id: 'test-id',
        name: 'Nano X',
        transportType: TransportType.BLE,
        walletType: WalletType.Ledger,
        rssi: -45,
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('device-found');
  });

  it('returns unsubscribe function from on()', () => {
    const emitter = new HardwareWalletEventEmitter();
    const events: HardwareWalletEvent[] = [];
    const unsub = emitter.on((e) => events.push(e));

    emitter.emit({ type: 'user-rejected', walletType: WalletType.Ledger });
    expect(events).toHaveLength(1);

    unsub();
    emitter.emit({ type: 'user-rejected', walletType: WalletType.Ledger });
    expect(events).toHaveLength(1); // no new event
  });

  it('removes all listeners', () => {
    const emitter = new HardwareWalletEventEmitter();
    const events: HardwareWalletEvent[] = [];
    emitter.on((e) => events.push(e));
    emitter.on((e) => events.push(e));

    emitter.removeAllListeners();
    emitter.emit({ type: 'user-rejected', walletType: WalletType.Ledger });
    expect(events).toHaveLength(0);
  });
});
