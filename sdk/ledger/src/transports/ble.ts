/**
 * Helper to create a BLE transport factory for LedgerAdapter.
 *
 * Usage:
 * ```ts
 * import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
 * import { LedgerAdapter } from '@heymike/hw-ledger';
 * import { createBleTransportFactory } from '@heymike/hw-ledger/transports/ble';
 *
 * const adapter = new LedgerAdapter({
 *   transportBle: createBleTransportFactory(TransportBLE),
 * });
 * ```
 *
 * This wrapper exists so consumers don't need to create the factory arrow function
 * themselves and can just pass the transport class directly.
 */
export function createBleTransportFactory(
  TransportBLE: any,
): () => any {
  return () => TransportBLE;
}
