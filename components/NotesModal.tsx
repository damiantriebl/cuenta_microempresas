import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionEvent } from '@/schemas/types';
import { formatDate } from '@/schemas/business-logic';
import { isSaleEvent } from '@/schemas/types';

interface NotesModalProps {
  visible: boolean;
  onClose: () => void;
  event: TransactionEvent | null;
  clienteName: string;
}

export default function NotesModal({
  visible,
  onClose,
  event,
  clienteName
}: NotesModalProps) {
  if (!event || !event.notas || event.notas.trim().length === 0) {
    return null;
  }

  const isSale = isSaleEvent(event);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>Notas de Transacción</Text>
              <Text style={styles.subtitle}>
                {isSale ? 'Venta' : 'Pago'} - {clienteName}
              </Text>
              <Text style={styles.dateText}>
                {formatDate(event.fecha)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Transaction Summary */}
          <View style={styles.transactionSummary}>
            {isSale && (
              <>
                <Text style={styles.summaryLabel}>Producto:</Text>
                <Text style={styles.summaryValue}>{event.producto}</Text>
                <Text style={styles.summaryLabel}>Total:</Text>
                <Text style={styles.summaryValue}>
                  ${event.totalVenta?.toFixed(2) || '0.00'}
                </Text>
              </>
            )}
            {!isSale && (
              <>
                <Text style={styles.summaryLabel}>Pago recibido:</Text>
                <Text style={styles.summaryValue}>
                  ${event.montoPago?.toFixed(2) || '0.00'}
                </Text>
              </>
            )}
          </View>

          {/* Notes Content */}
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notas:</Text>
            <ScrollView style={styles.notesScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.notesText}>{event.notas}</Text>
            </ScrollView>
          </View>

          {/* Close Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.closeActionButton}
              onPress={onClose}
            >
              <Text style={styles.closeActionText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  transactionSummary: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  notesContainer: {
    padding: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  notesScrollView: {
    maxHeight: 200,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionContainer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeActionButton: {
    backgroundColor: '#25B4BD',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});