import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {KeystoneAdapter} from '@heymike/hw-keystone';
import {useHardwareWallet} from '@heymike/hw-react-native-ui';
import {useQrInteractionHandler, SigningModal} from '@heymike/hw-react-native-ui/dist/components';
import type {HardwareAccount} from '@heymike/hw-core';
import type {SigningState} from '@heymike/hw-react-native-ui/dist/components';

export function KeystoneScreen() {
  // The QR handler provides both the handler interface and a modal component
  const {handler: qrHandler, QrModal} = useQrInteractionHandler({
    // In a real app, you'd provide custom renderers:
    // renderQr: (value, size) => <QRCode value={value} size={size} />,
    // renderScanner: (onScan) => <CameraScanner onScan={onScan} />,
  });

  const adapter = useMemo(
    () => new KeystoneAdapter({qrHandler}),
    [qrHandler],
  );

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

    // In a real app:
    // const signedTx = await signer.signTransactions([transaction]);
    // The QR modal will appear automatically via the qrHandler
    setTimeout(() => setSigningState('signing'), 2000);
    setTimeout(() => setSigningState('success'), 4000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Keystone (QR Air-Gap)</Text>

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
          <Text style={styles.sectionTitle}>1. Connect via QR</Text>
          <Text style={styles.description}>
            Scan the account QR code displayed on your Keystone device.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleConnect}
            disabled={isConnecting}>
            <Text style={styles.buttonText}>
              {isConnecting ? 'Scanning...' : 'Scan Keystone QR'}
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
              onPress={() => loadAccounts(5)}>
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
              <Text style={styles.sectionTitle}>3. Sign (QR Flow)</Text>
              <Text style={styles.description}>
                Signing will show a QR for your Keystone to scan, then ask you
                to scan the response QR.
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
          walletType="keystone"
          onDismiss={() => setSigningState(null)}
          onRetry={handleSign}
        />
      )}

      {/* QR Interaction Modal (for Keystone QR display/scan) */}
      <QrModal />
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
