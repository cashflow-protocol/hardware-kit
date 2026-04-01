import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import {LedgerScreen} from './src/screens/LedgerScreen';
import {KeystoneScreen} from './src/screens/KeystoneScreen';
import {TrezorScreen} from './src/screens/TrezorScreen';

type WalletTab = 'ledger' | 'keystone' | 'trezor';

function App() {
  const [activeTab, setActiveTab] = useState<WalletTab>('ledger');

  const tabs: {key: WalletTab; label: string; connection: string}[] = [
    {key: 'ledger', label: 'Ledger', connection: 'BLE'},
    {key: 'keystone', label: 'Keystone', connection: 'QR'},
    {key: 'trezor', label: 'Trezor', connection: 'Deep Link'},
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.header}>HW Wallet SDK Demo</Text>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}>
              {tab.label}
            </Text>
            <Text style={styles.tabSubtext}>{tab.connection}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Screen content */}
      <ScrollView style={styles.content}>
        {activeTab === 'ledger' && <LedgerScreen />}
        {activeTab === 'keystone' && <KeystoneScreen />}
        {activeTab === 'trezor' && <TrezorScreen />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 48,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabSubtext: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
});

export default App;
