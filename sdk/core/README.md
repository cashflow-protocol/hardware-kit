# @heymike/hw-core

Core interfaces, types, and utilities for the Solana hardware wallet SDK.

## Install

```bash
pnpm add @heymike/hw-core
```

## What's Included

### Interfaces
- `HardwareWalletAdapter` — Top-level per-wallet entry point (discover + connect)
- `ConnectedWallet` — Connected device (getAccounts + getSigner + disconnect)
- `HardwareWalletSigner` — Implements `TransactionPartialSigner` from `@solana/signers`
- `QrInteractionHandler` — UI callback for air-gapped QR wallets (Keystone)

### Types
- `DiscoveredDevice`, `HardwareAccount`, `WalletCapabilities`
- `TransportType` enum (ble, usb, nfc, qr, deeplink)
- `WalletType` enum (ledger, trezor, keystone)

### Error Handling
- `HardwareWalletError` — Single error class for all wallet errors
- `HardwareWalletErrorCode` — Typed error codes (UserRejected, AppNotOpen, etc.)

### Utilities
- `solanaBip44Path(account, change?)` — Generate Solana derivation paths
- `parseDerivationPath(path)` — Parse path into numeric components
- `derivationPathToBuffer(path)` — Convert to Ledger buffer format
- `encodeBase58(bytes)` — Encode public key bytes to base58

### Events
- `HardwareWalletEventEmitter` — Simple event system for device events
