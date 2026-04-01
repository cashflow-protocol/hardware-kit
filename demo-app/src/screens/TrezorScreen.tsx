import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import {TrezorAdapter} from '@heymike/hw-trezor';
import type {TrezorConnectInterface} from '@heymike/hw-trezor';
import {useHardwareWallet} from '@heymike/hw-react-native-ui';
import {SigningModal} from '@heymike/hw-react-native-ui/dist/components';
import type {HardwareAccount} from '@heymike/hw-core';
import type {SigningState} from '@heymike/hw-react-native-ui/dist/components';

// In a real app, use @trezor/connect-mobile:
// import TrezorConnect from '@trezor/connect-mobile';
const mockTrezorConnect: TrezorConnectInterface = {
  init: async () => {},
  solanaGetAddress: async ({path}) => ({
    success: true,
    payload: {address: '11111111111111111111111111111111'},
  }),
  solanaSignTransaction: async () => ({
    success: true,
    payload: {signature: 'ab'.repeat(64)},
  }),
};

const adapter = new TrezorAdapter({
  openUrl: (url: string) => Linking.openURL(url),
  callbackUrl: 'hwwalletdemo://trezor-callback',
  manifest: {
    appName: 'HW Wallet Demo',
    appIcon: 'https://example.com/icon.png',
  },
  trezorConnect: mockTrezorConnect,
});

export function TrezorScreen() {
  const {
    connectedWallet,
    isConnecting,
    connect,
    disconnect,
    accounts,
    isLoadingAccounts,
    loadAccounts,
    getSigner,
    error,
    clearError,
  } = useHardwareWallet(adapter);

  const [selectedAccount, setSelectedAccount] =
    useState<HardwareAccount | null>(null);
  const [signingState, setSigningState] = useState<SigningState | null>(null);

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // Error handled by hook
    }
  };

  const handleSign = async () => {
    if (!selectedAccount) return;
    const signer = getSigner(selectedAccount);
    if (!signer) return;

    setSigningState('waiting-for-device');

    // In a real app, Trezor Suite opens via deep link:
    // const results = await signer.signTransactions([transaction]);
    setTimeout(() => setSigningState('signing'), 1500);
    setTimeout(() => setSigningState('success'), 3000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trezor (Deep Link)</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.linkText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {!connectedWallet ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Connect</Text>
          <Text style={styles.description}>
            Connects via deep link to Trezor Suite. Make sure the Trezor Suite
            app is installed on your device.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleConnect}
            disabled={isConnecting}>
            <Text style={styles.buttonText}>
              {isConnecting ? 'Connecting...' : 'Connect to Trezor'}
            </Text>
          </TouchableOpacity>
          {isConnecting && <ActivityIndicator style={styles.loader} />}
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Select Account</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => loadAccounts(3)}>
              <Text style={styles.buttonText}>
                {isLoadingAccounts ? 'Loading...' : 'Load Accounts'}
              </Text>
            </TouchableOpacity>
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
          </View>

          {selectedAccount && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Sign Transaction</Text>
              <Text style={styles.description}>
                Signing will open Trezor Suite where you'll confirm on your
                Trezor device.
              </Text>
              <TouchableOpacity style={styles.button} onPress={handleSign}>
                <Text style={styles.buttonText}>Sign Demo Transaction</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={disconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Signing Modal */}
      {signingState && (
        <SigningModal
          visible={signingState !== null}
          state={signingState}
          walletType="trezor"
          onDismiss={() => setSigningState(null)}
          onRetry={handleSign}
        />
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
  description: {color: '#888', marginBottom: 8, lineHeight: 20},
  button: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerButton: {backgroundColor: '#ef4444'},
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
