import React, {useState, useCallback, useRef} from 'react';
import {View, Modal, Text, TouchableOpacity, StyleSheet} from 'react-native';
import URDecoder from '@ngraveio/bc-ur/dist/urDecoder';
import UREncoder from '@ngraveio/bc-ur/dist/urEncoder';
import type {QrInteractionHandler} from '@heymike/hw-core';
import {QrCodeDisplay} from './QrCodeDisplay';
import {QrCodeScanner, type QrScanResult} from './QrCodeScanner';

type QrState =
  | {mode: 'idle'}
  | {mode: 'display'; data: string; type: string}
  | {mode: 'scan'};

interface QrInteractionHandlerOptions {
  /** Custom QR renderer for QrCodeDisplay */
  renderQr?: (value: string, size: number) => React.ReactNode;
  /** Custom scanner renderer for QrCodeScanner */
  renderScanner?: (onScan: (result: QrScanResult) => void) => React.ReactNode;
}

/**
 * Creates a QrInteractionHandler backed by React state and modals.
 *
 * Usage:
 * ```tsx
 * function App() {
 *   const { handler, QrModal } = useQrInteractionHandler();
 *   const adapter = useMemo(() => new KeystoneAdapter({ qrHandler: handler }), [handler]);
 *
 *   return (
 *     <>
 *       <YourApp adapter={adapter} />
 *       <QrModal />
 *     </>
 *   );
 * }
 * ```
 */
export function useQrInteractionHandler(
  options?: QrInteractionHandlerOptions,
): {
  handler: QrInteractionHandler;
  QrModal: React.FC;
} {
  const [state, setState] = useState<QrState>({mode: 'idle'});
  const [scanProgress, setScanProgress] = useState<number>(0);
  const scanResolveRef = useRef<((data: string) => void) | null>(null);
  const scanRejectRef = useRef<((error: Error) => void) | null>(null);
  const displayResolveRef = useRef<(() => void) | null>(null);
  // Accumulates multi-part UR fragments during a scan.
  // For single-part URs, the first receivePart completes the decoder.
  const urDecoderRef = useRef<URDecoder | null>(null);

  const handler: QrInteractionHandler = {
    displayQr: async (urPayload: string, type: string) => {
      return new Promise<void>((resolve) => {
        displayResolveRef.current = resolve;
        setState({mode: 'display', data: urPayload, type});
      });
    },

    scanQr: async () => {
      return new Promise<string>((resolve, reject) => {
        urDecoderRef.current = new URDecoder();
        setScanProgress(0);
        scanResolveRef.current = resolve;
        scanRejectRef.current = reject;
        setState({mode: 'scan'});
      });
    },

    dismiss: async () => {
      // Resolve any pending display promise
      if (displayResolveRef.current) {
        displayResolveRef.current();
        displayResolveRef.current = null;
      }
      setState({mode: 'idle'});
    },
  };

  const handleScanResult = useCallback((result: QrScanResult) => {
    const decoder = urDecoderRef.current;
    if (!decoder || !scanResolveRef.current) return;

    // Feed each scanned QR frame into the UR decoder.
    // - Single-part URs: completes on first frame.
    // - Multi-part (animated) URs: keeps receiving until fountain decoder is satisfied.
    try {
      decoder.receivePart(result.data);
    } catch {
      // Invalid or duplicate frame — ignore and keep scanning
      return;
    }

    if (decoder.isError()) {
      const err = new Error(`UR decode error: ${decoder.resultError()}`);
      scanRejectRef.current?.(err);
      scanResolveRef.current = null;
      scanRejectRef.current = null;
      urDecoderRef.current = null;
      setState({mode: 'idle'});
      return;
    }

    // Update progress for the UI
    setScanProgress(Math.round(decoder.getProgress() * 100));

    if (decoder.isComplete() && decoder.isSuccess()) {
      const ur = decoder.resultUR();
      // Serialize as a single-part UR string so downstream `URDecoder.decode(s)` works
      const singlePart = UREncoder.encodeSinglePart(ur);
      scanResolveRef.current(singlePart);
      scanResolveRef.current = null;
      scanRejectRef.current = null;
      urDecoderRef.current = null;
      setState({mode: 'idle'});
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (scanRejectRef.current) {
      scanRejectRef.current(new Error('QR scan cancelled by user'));
      scanResolveRef.current = null;
      scanRejectRef.current = null;
    }
    if (displayResolveRef.current) {
      displayResolveRef.current();
      displayResolveRef.current = null;
    }
    urDecoderRef.current = null;
    setScanProgress(0);
    setState({mode: 'idle'});
  }, []);

  const handleDisplayContinue = useCallback(() => {
    // When displaying a QR for the user to scan with Keystone,
    // user taps "Continue" when they've scanned it, which resolves displayQr
    // and the adapter will then call scanQr for the response.
    if (displayResolveRef.current) {
      displayResolveRef.current();
      displayResolveRef.current = null;
    }
  }, []);

  const QrModal: React.FC = useCallback(
    () => (
      <Modal
        visible={state.mode !== 'idle'}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            {state.mode === 'display' && (
              <>
                <Text style={styles.title}>Scan with Keystone</Text>
                <Text style={styles.subtitle}>
                  Point your Keystone device's camera at this QR code
                </Text>
                <QrCodeDisplay
                  data={state.data}
                  size={260}
                  renderQr={options?.renderQr}
                  label={state.type}
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleDisplayContinue}>
                  <Text style={styles.primaryButtonText}>
                    I've Scanned It — Continue
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {state.mode === 'scan' && (
              <>
                <Text style={styles.title}>Scan Keystone Response</Text>
                <Text style={styles.subtitle}>
                  Scan the QR code displayed on your Keystone device
                  {scanProgress > 0 && scanProgress < 100
                    ? ` — ${scanProgress}%`
                    : ''}
                </Text>
                <QrCodeScanner
                  onScan={handleScanResult}
                  renderScanner={options?.renderScanner}
                />
              </>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    ),
    [state, scanProgress, handleCancel, handleDisplayContinue, handleScanResult, options],
  );

  return {handler, QrModal};
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
});
