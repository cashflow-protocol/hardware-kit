/**
 * Helper to create a USB HID transport factory for LedgerAdapter (Android only).
 *
 * Usage:
 * ```ts
 * import TransportHID from '@ledgerhq/react-native-hid';
 * import { LedgerAdapter } from '@heymike/hw-ledger';
 * import { createUsbTransportFactory } from '@heymike/hw-ledger/transports/usb';
 *
 * const adapter = new LedgerAdapter({
 *   transportUsb: createUsbTransportFactory(TransportHID),
 * });
 * ```
 */
export function createUsbTransportFactory(
  TransportHID: any,
): () => any {
  return () => TransportHID;
}
