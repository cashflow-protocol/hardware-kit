# @heymike/hw-keystone

Keystone hardware wallet adapter for Solana on React Native (air-gapped QR).

## Install

```bash
pnpm add @heymike/hw-core @heymike/hw-keystone

# Peer dependencies
pnpm add @keystonehq/keystone-sdk
```

## Usage

```tsx
import { KeystoneAdapter } from '@heymike/hw-keystone';
import { useQrInteractionHandler } from '@heymike/hw-react-native-ui';

// The QR handler manages the display/scan UI
const { handler, QrModal } = useQrInteractionHandler();
const adapter = new KeystoneAdapter({ qrHandler: handler });

// Connect: scans Keystone's CryptoMultiAccounts QR
const wallet = await adapter.connect();
const accounts = await wallet.getAccounts();

// Sign: shows QR → user scans with Keystone → scans response
const signer = wallet.getSigner(accounts[0]);
const results = await signer.signTransactions([transaction]);

// Render the QR modal in your component tree
<QrModal />
```

## How It Works

Keystone is air-gapped — it never connects to the internet. Communication is via QR codes:

1. **Connect**: Scan Keystone's account QR to import public keys
2. **Sign**: Display transaction QR → user scans with Keystone → Keystone shows signature QR → app scans it

The `QrInteractionHandler` interface abstracts the UI, so you can provide your own camera/QR renderer.

## Limitations
- No off-chain message signing (Keystone Solana app limitation)
- Requires camera access for QR scanning
