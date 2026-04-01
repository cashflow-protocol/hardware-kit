import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type {WalletType} from '@heymike/hw-core';

export type SigningState =
  | 'preparing'
  | 'waiting-for-device'
  | 'signing'
  | 'success'
  | 'error';

export interface SigningModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Current signing state */
  state: SigningState;
  /** Wallet type being used */
  walletType: WalletType;
  /** Error message (when state is 'error') */
  errorMessage?: string;
  /** Called when user dismisses the modal */
  onDismiss: () => void;
  /** Called when user wants to retry after error */
  onRetry?: () => void;
  /** Optional: number of transactions being signed */
  transactionCount?: number;
  /** Optional: current transaction index (0-based) */
  currentIndex?: number;
  /** Optional: custom content to render (e.g., QR code for Keystone) */
  children?: React.ReactNode;
}

/**
 * Modal that displays signing progress and device interaction prompts.
 *
 * Shows different content based on wallet type:
 * - Ledger: "Confirm on your Ledger device"
 * - Keystone: QR display/scan (via children prop)
 * - Trezor: "Confirm in Trezor Suite"
 */
export function SigningModal({
  visible,
  state,
  walletType,
  errorMessage,
  onDismiss,
  onRetry,
  transactionCount,
  currentIndex,
  children,
}: SigningModalProps) {
  const config = WALLET_CONFIG[walletType] ?? WALLET_CONFIG.ledger;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.walletIcon}>{config.icon}</Text>
            <Text style={styles.walletName}>{config.name}</Text>
          </View>

          {/* Content based on state */}
          <View style={styles.content}>
            {state === 'preparing' && (
              <>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text style={styles.statusText}>Preparing transaction...</Text>
              </>
            )}

            {state === 'waiting-for-device' && (
              <>
                <Text style={styles.devicePrompt}>{config.prompt}</Text>
                <Text style={styles.statusText}>{config.instructions}</Text>
                {children}
              </>
            )}

            {state === 'signing' && (
              <>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text style={styles.statusText}>
                  Signing
                  {transactionCount != null && transactionCount > 1
                    ? ` (${(currentIndex ?? 0) + 1}/${transactionCount})`
                    : ''}
                  ...
                </Text>
              </>
            )}

            {state === 'success' && (
              <>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successText}>Transaction signed!</Text>
              </>
            )}

            {state === 'error' && (
              <>
                <Text style={styles.errorIcon}>✕</Text>
                <Text style={styles.errorText}>
                  {errorMessage ?? 'Signing failed'}
                </Text>
                {onRetry && (
                  <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Progress indicator for multiple transactions */}
          {transactionCount != null && transactionCount > 1 && state !== 'error' && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(((currentIndex ?? 0) + (state === 'success' ? 1 : 0)) / transactionCount) * 100}%`,
                  },
                ]}
              />
            </View>
          )}

          {/* Dismiss button */}
          {(state === 'success' || state === 'error') && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissText}>
                {state === 'success' ? 'Done' : 'Close'}
              </Text>
            </TouchableOpacity>
          )}

          {state === 'waiting-for-device' && (
            <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const WALLET_CONFIG: Record<string, {
  name: string;
  icon: string;
  prompt: string;
  instructions: string;
}> = {
  ledger: {
    name: 'Ledger',
    icon: '🔒',
    prompt: 'Confirm on your Ledger',
    instructions: 'Review and approve the transaction on your Ledger device screen.',
  },
  keystone: {
    name: 'Keystone',
    icon: '📱',
    prompt: 'Scan QR with Keystone',
    instructions: 'Scan the QR code below with your Keystone device, then scan the response.',
  },
  trezor: {
    name: 'Trezor',
    icon: '🛡️',
    prompt: 'Confirm in Trezor Suite',
    instructions: 'Review and approve the transaction in the Trezor Suite app.',
  },
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  walletIcon: {
    fontSize: 24,
  },
  walletName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  devicePrompt: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  successIcon: {
    fontSize: 48,
    color: '#22c55e',
  },
  successText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  errorIcon: {
    fontSize: 48,
    color: '#ef4444',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  dismissButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
  },
  dismissText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
