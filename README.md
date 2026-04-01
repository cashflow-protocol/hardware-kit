# @heymike/hw-* — Solana Hardware Wallet SDK for React Native

A unified SDK for interacting with hardware wallets on Solana in React Native apps. Supports Ledger, Keystone, and Trezor with a common interface that integrates directly with `@solana/kit`.

## Packages

| Package | Description | Connection |
|---------|------------|------------|
| [`@heymike/hw-core`](sdk/core/) | Shared interfaces, types, errors, utilities | — |
| [`@heymike/hw-ledger`](sdk/ledger/) | Ledger Nano X/S+ adapter | BLE / USB |
| [`@heymike/hw-keystone`](sdk/keystone/) | Keystone Pro/Essential adapter | Air-gapped QR |
| [`@heymike/hw-trezor`](sdk/trezor/) | Trezor Safe adapter | Deep link |
| [`@heymike/hw-react-native-ui`](sdk/react-native-ui/) | React Native components & hooks | — |

## Quick Start

```bash
# Install core + the wallet adapter you need
pnpm add @heymike/hw-core @heymike/hw-ledger @heymike/hw-react-native-ui

# Install Ledger's native dependencies
pnpm add @ledgerhq/react-native-hw-transport-ble @ledgerhq/hw-app-solana react-native-ble-plx
```

```tsx
import { LedgerAdapter } from '@heymike/hw-ledger';
import { useHardwareWallet } from '@heymike/hw-react-native-ui';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';

const adapter = new LedgerAdapter({
  transportBle: () => TransportBLE,
});

function WalletScreen() {
  const {
    devices,
    isScanning,
    startDiscovery,
    connect,
    accounts,
    loadAccounts,
    getSigner,
  } = useHardwareWallet(adapter);

  // 1. Scan for devices
  // 2. Connect to a device
  // 3. Load accounts
  // 4. Get a signer — it implements @solana/signers interfaces
  const signer = getSigner(accounts[0]);
  // Use directly with @solana/kit:
  // await signTransactionMessageWithSigners(txMessage);
}
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Your App                                │
│   useHardwareWallet() hook from hw-react-native-ui  │
├─────────────────────────────────────────────────┤
│         HardwareWalletAdapter interface         │
│   ┌──────────┬────────────┬──────────┐          │
│   │  Ledger  │  Keystone  │  Trezor  │          │
│   │  (BLE)   │  (QR)      │  (Link)  │          │
│   └──────────┴────────────┴──────────┘          │
├─────────────────────────────────────────────────┤
│   HardwareWalletSigner                          │
│   implements TransactionPartialSigner           │
│   from @solana/signers                          │
└─────────────────────────────────────────────────┘
```

Every signer implements `TransactionPartialSigner` (and optionally `MessagePartialSigner`) from `@solana/signers`. This means hardware wallet signers plug directly into `@solana/kit` transaction pipelines with zero glue code.

## Keystone (Air-Gapped QR)

```tsx
import { KeystoneAdapter } from '@heymike/hw-keystone';
import { useHardwareWallet, useQrInteractionHandler } from '@heymike/hw-react-native-ui';

function KeystoneScreen() {
  const { handler, QrModal } = useQrInteractionHandler();
  const adapter = useMemo(() => new KeystoneAdapter({ qrHandler: handler }), [handler]);
  const { connect, accounts, loadAccounts, getSigner } = useHardwareWallet(adapter);

  return (
    <>
      {/* Your UI here */}
      <QrModal /> {/* Handles QR display/scan automatically */}
    </>
  );
}
```

## Trezor (Deep Link)

```tsx
import { TrezorAdapter } from '@heymike/hw-trezor';
import TrezorConnect from '@trezor/connect-mobile';
import { Linking } from 'react-native';

const adapter = new TrezorAdapter({
  openUrl: (url) => Linking.openURL(url),
  callbackUrl: 'myapp://trezor-callback',
  manifest: { appName: 'My App', appIcon: 'https://...' },
  trezorConnect: TrezorConnect,
});
```

## Error Handling

All wallet-specific errors are mapped to `HardwareWalletError` with typed codes:

```ts
import { HardwareWalletError, HardwareWalletErrorCode } from '@heymike/hw-core';

try {
  await signer.signTransactions([tx]);
} catch (e) {
  if (e instanceof HardwareWalletError) {
    switch (e.code) {
      case HardwareWalletErrorCode.UserRejected:
        // User declined on device
        break;
      case HardwareWalletErrorCode.AppNotOpen:
        // Ledger: Solana app not open
        break;
      case HardwareWalletErrorCode.BlindSigningDisabled:
        // Ledger: enable blind signing in app settings
        break;
    }
  }
}
```

## Development

```bash
pnpm install
pnpm --filter "@heymike/*" build
pnpm --filter "@heymike/*" test
```

## Expo Support

The SDK works with Expo **dev builds** (not Expo Go, since hardware wallet interaction requires native modules). All native dependencies have Expo Config Plugins.

## License

MIT
