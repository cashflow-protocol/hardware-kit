# @heymike/hw-ledger

Ledger hardware wallet adapter for Solana on React Native (BLE + USB).

## Install

```bash
pnpm add @heymike/hw-core @heymike/hw-ledger

# Peer dependencies (native modules)
pnpm add @ledgerhq/react-native-hw-transport-ble @ledgerhq/hw-app-solana react-native-ble-plx
# Optional: USB HID (Android only)
pnpm add @ledgerhq/react-native-hid
```

## Usage

```tsx
import { LedgerAdapter } from '@heymike/hw-ledger';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';

const adapter = new LedgerAdapter({
  transportBle: () => TransportBLE,
});

// Discover
for await (const device of adapter.discover()) {
  console.log('Found:', device.name);
}

// Connect
const wallet = await adapter.connect(device);
const accounts = await wallet.getAccounts(5);
const signer = wallet.getSigner(accounts[0]);

// Sign — compatible with @solana/kit
const results = await signer.signTransactions([transaction]);
const msgResults = await signer.signMessages([message]);

// Verify address on device screen
await signer.verifyAddressOnDevice();
```

## Supported Devices
- Ledger Nano X (BLE on iOS + Android)
- Ledger Nano S Plus (USB on Android)

## Error Codes
Ledger status codes are mapped to `HardwareWalletErrorCode`:
- `0x6985` → `UserRejected`
- `0x6A82` → `AppNotOpen`
- `0x5515` → `BlindSigningDisabled`
- `0x6B0C` → `DeviceBusy`
