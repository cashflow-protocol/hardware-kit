import React, {useState, useEffect, useRef, useCallback} from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';

export interface QrCodeDisplayProps {
  /**
   * The UR-encoded data to display. For multi-part URs,
   * pass all parts separated by newlines — the component
   * will cycle through them automatically.
   */
  data: string;
  /** QR code size in pixels (default: 280) */
  size?: number;
  /** Cycle interval for animated multi-part QR in ms (default: 300) */
  interval?: number;
  /** Optional label shown below the QR code */
  label?: string;
  /**
   * Custom QR renderer. Receives the current data string and size.
   * If not provided, falls back to a text placeholder.
   *
   * Example with react-native-qrcode-svg:
   *   renderQr={(value, size) => <QRCode value={value} size={size} />}
   */
  renderQr?: (value: string, size: number) => React.ReactNode;
}

/**
 * Displays a QR code (or animated multi-part QR) for air-gapped wallets.
 *
 * For Keystone signing, the SDK generates UR-encoded data that needs to be
 * displayed as a QR for the user to scan with their hardware device.
 *
 * Bring your own QR renderer via `renderQr` prop — this keeps the component
 * free of native QR dependencies.
 */
export function QrCodeDisplay({
  data,
  size = 280,
  interval = 300,
  label,
  renderQr,
}: QrCodeDisplayProps) {
  const parts = data.split('\n').filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMultiPart = parts.length > 1;

  useEffect(() => {
    if (!isMultiPart) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % parts.length);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [parts.length, interval, isMultiPart]);

  // Reset index when data changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [data]);

  const currentData = parts[currentIndex] ?? data;

  return (
    <View style={styles.container}>
      <View style={[styles.qrContainer, {width: size, height: size}]}>
        {renderQr ? (
          renderQr(currentData, size)
        ) : (
          <View style={[styles.placeholder, {width: size, height: size}]}>
            <Text style={styles.placeholderText}>QR Code</Text>
            <Text style={styles.placeholderSubtext} numberOfLines={3}>
              {currentData.slice(0, 80)}...
            </Text>
          </View>
        )}
      </View>

      {isMultiPart && (
        <Text style={styles.partIndicator}>
          Part {currentIndex + 1} of {parts.length}
        </Text>
      )}

      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  partIndicator: {
    marginTop: 8,
    color: '#aaa',
    fontSize: 12,
  },
  label: {
    marginTop: 8,
    color: '#ccc',
    fontSize: 14,
  },
});
