export {
  TrezorAdapter,
  type TrezorAdapterConfig,
  type TrezorConnectInterface,
  type TrezorInitSettings,
  type TrezorGetAddressParams,
  type TrezorAddressResult,
  type TrezorSignTransactionParams,
  type TrezorSignedTransactionResult,
  type TrezorResponse,
  type TrezorErrorPayload,
} from './TrezorAdapter';
export { TrezorConnectedWallet } from './TrezorConnectedWallet';
export { TrezorSigner } from './TrezorSigner';
export { mapTrezorError } from './errors';
