import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  cancelable?: boolean;
  onCancel?: () => void;
}

export default function LoadingOverlay({
  visible,
  message = 'Cargando...',
  cancelable = false,
  onCancel,
}: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={cancelable ? onCancel : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#25B4BD" />
          <Text style={styles.message}>{message}</Text>
          {cancelable && onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});