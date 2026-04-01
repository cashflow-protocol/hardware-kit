import React, {useState, useCallback} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';

export interface QrScanResult {
  data: string;
}

export interface QrCodeScannerProps {
  /** Called when a QR code is successfully scanned */
  onScan: (result: QrScanResult) => void;
  /** Called when the user cancels scanning */
  onCancel?: () => void;
  /** Optional label shown above the camera */
  label?: string;
  /**
   * Custom camera/scanner component. Receives an onScan callback.
   * If not provided, shows a placeholder with manual input option.
   *
   * Example with react-native-vision-camera + vision-camera-code-scanner:
   *   renderScanner={(onScan) => (
   *     <Camera
   *       style={StyleSheet.absoluteFill}
   *       device={device}
   *       isActive={true}
   *       codeScanner={{
   *         codeTypes: ['qr'],
   *         onCodeScanned: (codes) => {
   *           if (codes[0]?.value) onScan({ data: codes[0].value });
   *         },
   *       }}
   *     />
   *   )}
   */
  renderScanner?: (onScan: (result: QrScanResult) => void) => React.ReactNode;
}

/**
 * QR code scanner component for air-gapped wallet interactions.
 *
 * Used to scan:
 * - Keystone's CryptoMultiAccounts QR (during connection)
 * - Keystone's SolSignature QR (after signing)
 *
 * Bring your own camera via `renderScanner` prop to avoid
 * requiring react-native-vision-camera as a hard dependency.
 */
export function QrCodeScanner({
  onScan,
  onCancel,
  label,
  renderScanner,
}: QrCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(true);

  const handleScan = useCallback(
    (result: QrScanResult) => {
      setIsScanning(false);
      onScan(result);
    },
    [onScan],
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.scannerContainer}>
        {renderScanner ? (
          renderScanner(handleScan)
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>Camera Scanner</Text>
            <Text style={styles.placeholderSubtext}>
              Provide a renderScanner prop to enable camera scanning.
              {'\n'}Use react-native-vision-camera for best results.
            </Text>
          </View>
        )}

        {/* Scan overlay / frame */}
        {isScanning && (
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        )}
      </View>

      {isScanning && (
        <View style={styles.statusRow}>
          <ActivityIndicator color="#6366f1" size="small" />
          <Text style={styles.statusText}>Scanning for QR code...</Text>
        </View>
      )}

      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const FRAME_SIZE = 240;
const CORNER_SIZE = 30;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  label: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scannerContainer: {
    width: 300,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderSubtext: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#6366f1',
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#6366f1',
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#6366f1',
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#6366f1',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusText: {
    color: '#aaa',
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
