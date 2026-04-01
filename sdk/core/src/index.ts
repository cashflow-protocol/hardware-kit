export {
  TransportType,
  WalletType,
  type DiscoveredDevice,
  type DiscoveryConfig,
  type WalletDiscovery,
  type HardwareAccount,
  type WalletCapabilities,
  type ConnectedWallet,
  type HardwareWalletSigner,
  type HardwareWalletAdapter,
  type QrInteractionHandler,
  type Address,
  type SignatureBytes,
  type TransactionPartialSigner,
  type MessagePartialSigner,
  type SignatureDictionary,
  type Transaction,
} from './types';

export {
  HardwareWalletError,
  HardwareWalletErrorCode,
} from './errors';

export {
  solanaBip44Path,
  parseDerivationPath,
  derivationPathToBuffer,
} from './derivation';

export {
  type HardwareWalletEvent,
  type HardwareWalletEventListener,
  HardwareWalletEventEmitter,
} from './events';

export { encodeBase58 } from './base58';
