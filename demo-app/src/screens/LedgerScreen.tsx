import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {LedgerAdapter} from '@heymike/hw-ledger';
import {useHardwareWallet} from '@heymike/hw-react-native-ui';
import {BleDevicePicker, SigningModal} from '@heymike/hw-react-native-ui/dist/components';
import type {HardwareAccount} from '@heymike/hw-core';
import type {SigningState} from '@heymike/hw-react-native-ui/dist/components';
import {
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from '@solana/kit';
import {getTransferSolInstruction} from '@solana-program/system';

import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';

const adapter = new LedgerAdapter({
  transportBle: () => TransportBLE as any,
});

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') return true;

  // react-native-ble-plx requires location + bluetooth permissions on Android
  const permissions: Array<typeof PermissionsAndroid.PERMISSIONS[keyof typeof PermissionsAndroid.PERMISSIONS]> = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];

  if (Number(Platform.Version) >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(result).every(v => v === 'granted');
}

export function LedgerScreen() {
  const {
    devices,
    isScanning,
    startDiscovery,
    stopDiscovery,
    connectedWallet,
    isConnecting,
    connect,
    disconnect,
    accounts,
    isLoadingAccounts,
    loadAccounts,
    loadMoreAccounts,
    getSigner,
    error,
    clearError,
  } = useHardwareWallet(adapter);

  const [selectedAccount, setSelectedAccount] =
    useState<HardwareAccount | null>(null);
  const [signingState, setSigningState] = useState<SigningState | null>(null);
  const [signingError, setSigningError] = useState<string | undefined>(undefined);
  const [blePermGranted, setBlePermGranted] = useState(false);

  useEffect(() => {
    requestBlePermissions().then(setBlePermGranted);
  }, []);

  const handleStartScan = async () => {
    if (!blePermGranted) {
      const granted = await requestBlePermissions();
      setBlePermGranted(granted);
      if (!granted) {
        Alert.alert('Permission Required', 'Bluetooth permissions are needed to scan for Ledger devices.');
        return;
      }
    }

    // Check BLE state before scanning
    const {BleManager} = require('react-native-ble-plx');
    const manager = new BleManager();

    const checkBle = new Promise<void>((resolve, reject) => {
      const sub = manager.onStateChange((state: string) => {
        sub.remove();
        if (state === 'PoweredOn') {
          resolve();
        } else {
          reject(state);
        }
      }, true);
    });

    try {
      await checkBle;
    } catch (bleState) {
      Alert.alert(
        'Bluetooth is Off',
        'Please enable Bluetooth in your device settings to scan for Ledger devices.\n\nCurrent state: ' + bleState,
        [{text: 'OK'}],
      );
      return;
    }

    startDiscovery();
  };

  const handleSign = async () => {
    if (!selectedAccount) return;
    const signer = getSigner(selectedAccount);
    if (!signer) return;

    setSigningError(undefined);
    setSigningState('preparing');

    try {
      const rpc = createSolanaRpc('https://api.devnet.solana.com');
      const {value: latestBlockhash} = await rpc.getLatestBlockhash().send();

      const txMessage = pipe(
        createTransactionMessage({version: 0}),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) =>
          appendTransactionMessageInstruction(
            getTransferSolInstruction({
              source: signer,
              destination: signer.address,
              amount: 0n,
            }),
            m,
          ),
      );

      setSigningState('waiting-for-device');
      const signedTx = await signTransactionMessageWithSigners(txMessage);
      const sig = getSignatureFromTransaction(signedTx);

      setSigningState('success');
      Alert.alert('Transaction signed', `Signature:\n${sig}`);
    } catch (e: any) {
      setSigningError(e?.message ?? String(e));
      setSigningState('error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ledger (BLE)</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.linkText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Discovery */}
      {!connectedWallet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Discover & Connect</Text>
          <BleDevicePicker
            devices={devices}
            isScanning={isScanning}
            onSelect={(device) => connect(device)}
            onStartScan={handleStartScan}
            onStopScan={stopDiscovery}
            connectingDeviceId={isConnecting ? devices[0]?.id : null}
          />
        </View>
      )}

      {/* Accounts */}
      {connectedWallet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Select Account</Text>
          {accounts.length === 0 && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => loadAccounts(10)}
              disabled={isLoadingAccounts}>
              <Text style={styles.buttonText}>
                {isLoadingAccounts ? 'Loading...' : 'Load Accounts'}
              </Text>
            </TouchableOpacity>
          )}
          {isLoadingAccounts && <ActivityIndicator style={styles.loader} />}

          <FlatList
            data={accounts}
            keyExtractor={(item) => item.derivationPath}
            scrollEnabled={false}
            renderItem={({item}: {item: HardwareAccount}) => (
              <TouchableOpacity
                style={[
                  styles.accountItem,
                  selectedAccount?.derivationPath === item.derivationPath &&
                    styles.selectedItem,
                ]}
                onPress={() => setSelectedAccount(item)}>
                <Text style={styles.accountName}>Account #{item.index}</Text>
                <Text style={styles.accountAddress}>{item.address}</Text>
                <Text style={styles.pathText}>{item.derivationPath}</Text>
              </TouchableOpacity>
            )}
          />

          {accounts.length > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => loadMoreAccounts(10)}
              disabled={isLoadingAccounts}>
              <Text style={styles.buttonText}>
                {isLoadingAccounts ? 'Loading...' : 'Load More Accounts'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sign */}
      {selectedAccount && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Sign Transaction</Text>
          <TouchableOpacity style={styles.button} onPress={handleSign}>
            <Text style={styles.buttonText}>Sign Demo Transaction</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Signing Modal */}
      {signingState && (
        <SigningModal
          visible={signingState !== null}
          state={signingState}
          walletType="ledger"
          errorMessage={signingError}
          onDismiss={() => {
            setSigningState(null);
            setSigningError(undefined);
          }}
          onRetry={handleSign}
        />
      )}

      {/* Disconnect */}
      {connectedWallet && (
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={disconnect}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#0f0f0f'},
  title: {fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16},
  section: {marginBottom: 20},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButton: {backgroundColor: '#ef4444'},
  secondaryButton: {backgroundColor: '#374151', marginTop: 8},
  buttonText: {color: '#fff', fontWeight: '600'},
  loader: {marginVertical: 8},
  accountItem: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  selectedItem: {borderColor: '#6366f1', borderWidth: 2},
  accountName: {color: '#fff', fontWeight: '500'},
  accountAddress: {color: '#888', fontSize: 12, marginTop: 2},
  pathText: {color: '#666', fontSize: 11, marginTop: 2},
  errorBox: {
    backgroundColor: '#450a0a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {color: '#fca5a5'},
  linkText: {color: '#6366f1', marginTop: 4},
});
