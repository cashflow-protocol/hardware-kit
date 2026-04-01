# @heymike/hw-react-native-ui

React Native UI components and hooks for the Solana hardware wallet SDK.

## Install

```bash
pnpm add @heymike/hw-core @heymike/hw-react-native-ui
```

## Hooks

### `useHardwareWallet(adapter)`

Main hook — manages the full lifecycle: discovery, connection, accounts, signing.

```tsx
const {
  devices, isScanning, startDiscovery, stopDiscovery,
  connectedWallet, isConnecting, connect, disconnect,
  accounts, isLoadingAccounts, loadAccounts,
  getSigner, error, clearError,
} = useHardwareWallet(adapter);
```

### `useDiscovery(adapter)`

Lightweight hook for just the discovery phase.

### `useSigner(wallet, account)`

Returns a `HardwareWalletSigner` for the given account, memoized.

### `useQrInteractionHandler(options?)`

Creates a `QrInteractionHandler` with a modal UI for Keystone QR interactions.

```tsx
const { handler, QrModal } = useQrInteractionHandler({
  renderQr: (value, size) => <QRCode value={value} size={size} />,
  renderScanner: (onScan) => <CameraScanner onScan={onScan} />,
});
```

## Components

### `<BleDevicePicker />`
Displays discovered BLE devices with signal strength, scan button, and connect action.

### `<SigningModal />`
Modal showing signing progress with wallet-specific prompts and state transitions.

### `<QrCodeDisplay />`
Renders QR codes with support for animated multi-part URs (Keystone).

### `<QrCodeScanner />`
Camera-based QR scanner with scan frame overlay.

## Bring Your Own Renderer

All components use a render-prop pattern for native dependencies:
- `QrCodeDisplay` — pass `renderQr` for your QR library
- `QrCodeScanner` — pass `renderScanner` for your camera library

This keeps native deps optional.
