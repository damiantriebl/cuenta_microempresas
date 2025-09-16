import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthProvider';
import { useClientSelection } from '@/context/ClientSelectionProvider';
import { useClientEvents } from '@/context/RealtimeDataProvider';
import TransactionHistoryList from '@/components/TransactionHistoryList';
import TransactionModal from '@/components/TransactionModal';
import TransactionEditModal from '@/components/TransactionEditModal';
import NotesModal from '@/components/NotesModal';
import ProductService from '@/services/ProductService';
import { CreateSaleEventData, CreatePaymentEventData, CreateProductData, Product, TransactionEvent, UpdateTransactionEventData } from '@/schemas/types';
import { Timestamp } from 'firebase/firestore';
import { TransactionEventService } from '@/services/TransactionEventService';


export default function HistoryScreen() {
  const { empresaId } = useAuth();
  const { selectedClient, clearSelection } = useClientSelection();
  const {
    events: transactions,
    eventsLoading,
    selectedClientId,
    setSelectedClientId,
    refreshEvents
  } = useClientEvents();
  const router = useRouter();

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const productService = ProductService.getInstance();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TransactionEvent | null>(null);
  const [notesEvent, setNotesEvent] = useState<TransactionEvent | null>(null);

  // Sync selected client with real-time data provider
  useEffect(() => {
    if (selectedClient && selectedClient.id !== selectedClientId) {
      setSelectedClientId(selectedClient.id);
    } else if (!selectedClient && selectedClientId) {
      setSelectedClientId(null);
    }
  }, [selectedClient, selectedClientId, setSelectedClientId]);

  // Handle transaction creation
  const handleCreateTransaction = () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Selecciona un cliente primero');
      return;
    }

    setShowTransactionModal(true);
  };

  // Create Sale
  const handleCreateSale = async (saleData: CreateSaleEventData) => {
    if (!empresaId) return;
    if (!saleData.clienteId) {
      Alert.alert('Error', 'Falta el cliente en la venta');
      return;
    }
    setIsLoading(true);
    try {
      const result = await TransactionEventService.createSaleEvent(empresaId, saleData);
      if (result.success) {
        setShowTransactionModal(false);
        // Real-time listener will update transactions automatically
        refreshEvents();
      } else {
        Alert.alert('Error', result.errors?.join('\n') || 'Error al crear la venta');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      Alert.alert('Error', 'No se pudo crear la venta');
    } finally {
      setIsLoading(false);
    }
  };

  // Create Payment
  const handleCreatePayment = async (paymentData: CreatePaymentEventData) => {
    if (!empresaId) return;
    if (!paymentData.clienteId) {
      Alert.alert('Error', 'Falta el cliente en el pago');
      return;
    }
    setIsLoading(true);
    try {
      const result = await TransactionEventService.createPaymentEvent(empresaId, paymentData);
      if (result.success) {
        setShowTransactionModal(false);
        refreshEvents();
      } else {
        Alert.alert('Error', result.errors?.join('\n') || 'Error al crear el pago');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      Alert.alert('Error', 'No se pudo crear el pago');
    } finally {
      setIsLoading(false);
    }
  };

  // Create Product (from modal quick-create)
  const handleCreateProduct = async (productData: CreateProductData): Promise<Product | null> => {
    if (!empresaId) return null;
    try {
      const result = await productService.createProduct(empresaId, { ...productData, posicion: 0 });
      if (result.success && result.data) {
        return {
          id: result.data,
          nombre: productData.nombre,
          colorFondo: productData.colorFondo,
          posicion: productData.posicion,
          activo: productData.activo,
          creado: Timestamp.now(),
        } as unknown as Product;
      } else {
        Alert.alert('Error', result.errors?.join('\n') || 'Error al crear el producto');
        return null;
      }
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'No se pudo crear el producto');
      return null;
    }
  };

  // Edit handlers
  const handleEditEvent = (event: TransactionEvent) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleUpdateEvent = async (eventId: string, updateData: UpdateTransactionEventData) => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const result = await TransactionEventService.updateEvent(empresaId, eventId, updateData);
      if (!result.success) {
        Alert.alert('Error', result.errors?.join('\n') || 'Error al actualizar la transacción');
      }
      await refreshEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'No se pudo actualizar la transacción');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const result = await TransactionEventService.deleteEvent(empresaId, eventId);
      if (!result.success) {
        Alert.alert('Error', result.errors?.join('\n') || 'Error al eliminar la transacción');
      }
      await refreshEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'No se pudo eliminar la transacción');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewNotes = (event: TransactionEvent) => {
    setNotesEvent(event);
    setShowNotesModal(true);
  };

  // Navigate to client selection
  const handleSelectClient = () => {
    router.push('/(tabs)/clientes');
  };

  // Manual refresh no usado, se elimina para evitar warnings

  if (!empresaId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No hay empresa seleccionada</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Historial</Text>
          {selectedClient && (
            <Text style={styles.subtitle}>{selectedClient.nombre}</Text>
          )}
        </View>

        <View style={styles.headerActions}>
          {selectedClient && (
            <>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearSelection}
              >
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleCreateTransaction}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Nuevo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!selectedClient ? (
          // No client selected state
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Ningún cliente seleccionado</Text>
            <Text style={styles.emptySubtitle}>
              Selecciona un cliente para ver su historial de transacciones
            </Text>
            <TouchableOpacity
              style={styles.selectClientButton}
              onPress={handleSelectClient}
            >
              <Ionicons name="people" size={20} color="#fff" />
              <Text style={styles.selectClientButtonText}>Seleccionar Cliente</Text>
            </TouchableOpacity>
          </View>
        ) : eventsLoading ? (
          // Loading state
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#25B4BD" />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : (
          // Transaction history
          <TransactionHistoryList
            events={transactions}
            onEditEvent={(event) => handleEditEvent(event)}
            onDeleteEvent={(event) => handleDeleteEvent(event.id)}
            onViewNotes={(event) => handleViewNotes(event)}
          />
        )}
      </View>

      {/* Transaction Modal */}
      {selectedClient && (
        <TransactionModal
          visible={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          clienteId={selectedClient.id}
          clienteName={selectedClient.nombre}
          onCreateSale={handleCreateSale}
          onCreatePayment={handleCreatePayment}
          onCreateProduct={handleCreateProduct}
          isLoading={isLoading}
        />
      )}

      {/* Transaction Edit Modal */}
      {selectedClient && (
        <TransactionEditModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          clienteName={selectedClient.nombre}
          onUpdateTransaction={handleUpdateEvent}
          onDeleteTransaction={async (eventId) => handleDeleteEvent(eventId)}
          onCreateProduct={handleCreateProduct}
          isLoading={isLoading}
        />
      )}

      {/* Notes Modal */}
      {selectedClient && (
        <NotesModal
          visible={showNotesModal}
          onClose={() => {
            setShowNotesModal(false);
            setNotesEvent(null);
          }}
          event={notesEvent}
          clienteName={selectedClient.nombre}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebebeb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#25B4BD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  selectClientButton: {
    backgroundColor: '#25B4BD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  selectClientButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
  },
});