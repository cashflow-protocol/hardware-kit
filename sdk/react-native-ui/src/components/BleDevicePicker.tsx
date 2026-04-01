import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type {DiscoveredDevice} from '@heymike/hw-core';

export interface BleDevicePickerProps {
  /** List of discovered BLE devices */
  devices: DiscoveredDevice[];
  /** Whether scanning is in progress */
  isScanning: boolean;
  /** Called when user selects a device */
  onSelect: (device: DiscoveredDevice) => void;
  /** Called to start BLE scanning */
  onStartScan: () => void;
  /** Called to stop BLE scanning */
  onStopScan: () => void;
  /** Optional: currently connecting device ID */
  connectingDeviceId?: string | null;
  /** Optional: empty state text */
  emptyText?: string;
}

/**
 * A picker component that displays discovered BLE hardware wallet devices.
 * Used primarily for Ledger Nano X connections.
 */
export function BleDevicePicker({
  devices,
  isScanning,
  onSelect,
  onStartScan,
  onStopScan,
  connectingDeviceId,
  emptyText = 'No devices found. Make sure your hardware wallet is on and Bluetooth is enabled.',
}: BleDevicePickerProps) {
  const renderDevice = ({item}: {item: DiscoveredDevice}) => {
    const isConnecting = connectingDeviceId === item.id;

    return (
      <TouchableOpacity
        style={styles.deviceItem}
        onPress={() => onSelect(item)}
        disabled={isConnecting}>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceHeader}>
            <View
              style={[
                styles.signalDot,
                {backgroundColor: getSignalColor(item.rssi)},
              ]}
            />
            <Text style={styles.deviceName}>
              {item.name ?? 'Unknown Device'}
            </Text>
          </View>
          <Text style={styles.deviceMeta}>
            {item.walletType.toUpperCase()} · {item.transportType.toUpperCase()}
            {item.rssi != null ? ` · ${item.rssi} dBm` : ''}
          </Text>
          <Text style={styles.deviceId}>{item.id}</Text>
        </View>

        {isConnecting ? (
          <ActivityIndicator color="#6366f1" size="small" />
        ) : (
          <Text style={styles.connectText}>Connect</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Scan button */}
      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanButtonActive]}
        onPress={isScanning ? onStopScan : onStartScan}>
        {isScanning && <ActivityIndicator color="#fff" size="small" />}
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Stop Scanning' : 'Scan for Devices'}
        </Text>
      </TouchableOpacity>

      {/* Device list */}
      {devices.length > 0 ? (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDevice}
          style={styles.list}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          {isScanning ? (
            <>
              <ActivityIndicator color="#6366f1" size="large" />
              <Text style={styles.emptyText}>Searching for devices...</Text>
            </>
          ) : (
            <Text style={styles.emptyText}>{emptyText}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function getSignalColor(rssi: number | undefined): string {
  if (rssi == null) return '#888';
  if (rssi >= -50) return '#22c55e'; // Strong
  if (rssi >= -70) return '#eab308'; // Medium
  return '#ef4444'; // Weak
}

const styles = StyleSheet.create({
  container: {},
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  scanButtonActive: {
    backgroundColor: '#4f46e5',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {},
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  deviceMeta: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  deviceId: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  connectText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
