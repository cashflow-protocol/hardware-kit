# @heymike/hw-trezor

Trezor hardware wallet adapter for Solana on React Native (deep link to Trezor Suite).

## Install

```bash
pnpm add @heymike/hw-core @heymike/hw-trezor

# Peer dependency — real TrezorConnect SDK
pnpm add @trezor/connect-mobile
```

## Usage

```tsx
import {useEffect} from 'react';
import {Linking} from 'react-native';
import TrezorConnect from '@trezor/connect-mobile';
import {TrezorAdapter} from '@heymike/hw-trezor';

const adapter = new TrezorAdapter({
  openUrl: (url) => Linking.openURL(url),
  callbackUrl: 'myapp://trezor-callback',
  manifest: {
    email: 'dev@myapp.com',
    appName: 'My App',
    appUrl: 'https://myapp.com',
  },
  trezorConnect: TrezorConnect,
});

function App() {
  // CRITICAL: forward callback URLs into TrezorConnect.
  // Without this, sign/getAddress promises from Trezor Suite will hang forever.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({url}) => {
      TrezorConnect.handleDeeplink(url);
    });
    return () => sub.remove();
  }, []);

  // ... use adapter
}

const wallet = await adapter.connect();
const accounts = await wallet.getAccounts(3);
const signer = wallet.getSigner(accounts[0]);

// Opens Trezor Suite → user confirms on device → returns via deep link
const results = await signer.signTransactions([transaction]);
```

## How It Works

1. Your app calls `signer.signTransactions(...)`.
2. Trezor Connect builds a callback URL and calls `openUrl(url)`.
3. Trezor Suite opens, user confirms on their Trezor device.
4. Trezor Suite returns by deep-linking back to `callbackUrl`.
5. Your `Linking` listener forwards the URL to `TrezorConnect.handleDeeplink(url)`.
6. Trezor Connect resolves the original promise with the signature.

## URL Scheme Setup

**iOS** — `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>myapp</string></array>
  </dict>
</array>
```

**Android** — `AndroidManifest.xml` (inside your main activity):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" android:host="trezor-callback" />
</intent-filter>
```

## Error Handling

All `@trezor/connect` error codes and `@trezor/protobuf` `FailureType` codes are mapped to typed `HardwareWalletErrorCode` values by `mapTrezorError`:

| Trezor code | Maps to |
|------------|---------|
| `Failure_ActionCancelled`, `Failure_PinCancelled`, `Method_Cancel`, `Method_Interrupted` | `UserRejected` |
| `Device_Disconnected`, `Device_NotFound`, `Transport_Missing` | `ConnectionLost` |
| `Device_UsedElsewhere`, `Device_CallInProgress`, `Failure_Busy` | `DeviceBusy` |
| `Deeplink_VersionMismatch`, `Device_MissingCapability` | `UnsupportedOperation` |
| `Init_NotInitialized`, `Failure_NotInitialized` | `ConnectionFailed` |
| `Method_InvalidParameter`, `Failure_DataError` | `SigningFailed` |

## Supported Devices

- Trezor Safe 3, Safe 5, Safe 7, Model T — any device with Solana app support.

## Limitations

- **Message signing** is not exposed. The Trezor Solana app's message-signing support is firmware-dependent and not widely used, so `capabilities.signMessage = false`.
- **Multiple transactions** are signed sequentially — each triggers a separate Trezor Suite interaction.
