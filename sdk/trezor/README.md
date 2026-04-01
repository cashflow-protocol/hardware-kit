# @heymike/hw-trezor

Trezor hardware wallet adapter for Solana on React Native (deep link).

## Install

```bash
pnpm add @heymike/hw-core @heymike/hw-trezor

# Peer dependencies
pnpm add @trezor/connect-mobile
```

## Usage

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

const wallet = await adapter.connect();
const accounts = await wallet.getAccounts(3);
const signer = wallet.getSigner(accounts[0]);

// Opens Trezor Suite → user confirms → returns via deep link
const results = await signer.signTransactions([transaction]);
```

## How It Works

Trezor uses deep linking — signing opens the Trezor Suite app, where the user confirms on their hardware device. Results return via your app's callback URL scheme.

## Setup

Register your callback URL scheme in your app:

**iOS** — `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

**Android** — `AndroidManifest.xml`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <data android:scheme="myapp" android:host="trezor-callback" />
</intent-filter>
```

## Supported Devices
- Trezor Safe 3, Safe 5, Safe 7, Model T
