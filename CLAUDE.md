# Hardware Wallets SDK

## Project Overview
React Native TypeScript SDK for Solana hardware wallets. Monorepo using pnpm workspaces + turborepo.

## Package Structure
- `sdk/core` — `@heymike/hw-core` — Shared interfaces, types, errors
- `sdk/ledger` — `@heymike/hw-ledger` — Ledger BLE/USB adapter
- `sdk/keystone` — `@heymike/hw-keystone` — Keystone QR air-gap adapter
- `sdk/trezor` — `@heymike/hw-trezor` — Trezor deep link adapter
- `sdk/react-native-ui` — `@heymike/hw-react-native-ui` — React Native components + hooks
- `demo-app` — Bare React Native demo app

## Key Architecture Decisions
- Signers implement `TransactionPartialSigner` / `MessagePartialSigner` from `@solana/signers`
- Each wallet adapter is a separate npm package (Metro doesn't tree-shake)
- Native dependencies are peer deps — consumers install only what they need
- Keystone QR interaction is decoupled from UI via `QrInteractionHandler` interface
- All vendor-specific errors map to `HardwareWalletError` with typed `HardwareWalletErrorCode`

## Commands
- `pnpm --filter "@heymike/*" build` — Build all SDK packages
- `pnpm --filter "@heymike/*" test` — Run all SDK tests
- `pnpm --filter @heymike/hw-core test` — Run tests for a specific package
- `pnpm --filter @heymike/hw-ledger build` — Build a specific package

## Solana Library Rules
- Use `@solana/kit` (not `@solana/web3.js`)
- Use `Address` type from `@solana/addresses`, not `PublicKey`
- Use `address()` function to create addresses
- Signers must conform to `@solana/signers` interfaces
