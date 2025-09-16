import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ClientModule from '@/components/ClientModule';
import ClientForm from '@/components/ClientForm';
import ClientSearchFilter, { ClientFilterOptions } from '@/components/ClientSearchFilter';
import { useAuth } from '@/context/AuthProvider';
import { useClients } from '@/context/RealtimeDataProvider';
import { ClientService } from '@/services/ClientService';
import { Client, CreateClientData, UpdateClientData } from '@/schemas/types';

export default function ClientsScreen() {
  const { empresaId } = useAuth();
  const {
    clients,
    clientsLoading,
    includeHiddenClients,
    setIncludeHiddenClients,
    refreshClients
  } = useClients();
  const [clientService, setClientService] = useState<ClientService | null>(null);

  // State management
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Filter state
  const [filters, setFilters] = useState<ClientFilterOptions>({
    searchTerm: '',
    includeHidden: includeHiddenClients,
    sortBy: 'nombre',
    sortOrder: 'asc',
    debtFilter: 'all'
  });

  // Initialize client service
  useEffect(() => {
    if (empresaId) {
      setClientService(new ClientService(empresaId));

      // Auto-sync debts when screen loads
      const syncDebts = async () => {
        try {
          const { SimpleDebtService } = await import('@/services/SimpleDebtService');
          await SimpleDebtService.getInstance().syncAllClientDebts(empresaId);
        } catch (error) {
          console.warn('Failed to auto-sync debts:', error);
        }
      };

      syncDebts();
    }
  }, [empresaId]);

  // Sync local filter state with global state
  useEffect(() => {
    setFilters(prev => ({ ...prev, includeHidden: includeHiddenClients }));
  }, [includeHiddenClients]);

  // Sync debts every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const syncDebts = async () => {
        if (empresaId) {
          try {
            const { SimpleDebtService } = await import('@/services/SimpleDebtService');
            await SimpleDebtService.getInstance().syncAllClientDebts(empresaId);
          } catch (error) {
            console.warn('Failed to sync debts on focus:', error);
          }
        }
      };

      syncDebts();
    }, [empresaId])
  );

  // Apply search and debt filters to clients
  useEffect(() => {
    let filtered = [...clients];

    // Apply text search filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        client.nombre.toLowerCase().includes(searchLower) ||
        client.direccion.toLowerCase().includes(searchLower) ||
        (client.notas && client.notas.toLowerCase().includes(searchLower)) ||
        client.telefono.includes(filters.searchTerm)
      );
    }

    // Apply debt filter
    if (filters.debtFilter !== 'all') {
      filtered = filtered.filter(client => {
        switch (filters.debtFilter) {
          case 'withDebt':
            return client.deudaActual > 0;
          case 'noDebt':
            return client.deudaActual === 0;
          case 'inFavor':
            return client.deudaActual < 0;
          default:
            return true;
        }
      });
    }

    setFilteredClients(filtered);
  }, [clients, filters.searchTerm, filters.debtFilter]);

  // Debug: Log clients data
  useEffect(() => {
    console.log('ClientsScreen: Clients data updated', {
      clientsCount: clients.length,
      filteredCount: filteredClients.length,
      includeHidden: includeHiddenClients,
      filters: filters,
      clientNames: clients.map(c => c.nombre)
    });
  }, [clients, filteredClients, includeHiddenClients, filters]);

  // No need for useFocusEffect since we use real-time data

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    refreshClients();
    setRefreshing(false);
  };

  // Create client handler
  const handleCreateClient = async (clientData: CreateClientData | UpdateClientData) => {
    const context = 'ClientsScreen.handleCreateClient';
    console.log(`${context}: Starting client creation`, {
      empresaId,
      clientData,
      hasClientService: !!clientService
    });

    if (!clientService) {
      console.error(`${context}: No client service available`);
      Alert.alert('Error', 'Servicio de clientes no disponible');
      return;
    }

    try {
      setSaving(true);
      // Type guard to ensure we have CreateClientData for creation
      const createData = clientData as CreateClientData;

      console.log(`${context}: Calling clientService.createClient`, {
        empresaId,
        createData
      });

      const result = await clientService.createClient(createData);

      console.log(`${context}: Creation result`, {
        success: result.success,
        data: result.data,
        errors: result.errors
      });

      if (result.success) {
        console.log(`${context}: Client created successfully`, {
          clientId: result.data,
          empresaId
        });
        setShowCreateModal(false);
        Alert.alert('Éxito', 'Cliente creado exitosamente');
        // Force refresh to ensure the new client appears
        console.log(`${context}: Forcing refresh after client creation`, {
          includeHiddenClients,
          currentClientsCount: clients.length
        });
        refreshClients();
      } else {
        console.error(`${context}: Creation failed`, { errors: result.errors });
        Alert.alert('Error', result.errors?.join('\n') || 'Error al crear cliente');
      }
    } catch (error) {
      console.error(`${context}: Exception during client creation`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        empresaId
      });
      Alert.alert('Error', 'Error al crear cliente');
    } finally {
      setSaving(false);
    }
  };

  // Edit client handler
  const handleEditClient = async (clientData: CreateClientData | UpdateClientData) => {
    if (!clientService || !editingClient) return;

    try {
      setSaving(true);
      // Type guard to ensure we have UpdateClientData for updates
      const updateData = clientData as UpdateClientData;

      const result = await clientService.updateClient(editingClient.id, updateData);

      if (result.success) {
        setShowEditModal(false);
        setEditingClient(null);
        Alert.alert('Éxito', 'Cliente actualizado exitosamente');
        // Real-time listener will update clients automatically
      } else {
        Alert.alert('Error', result.error || 'Error al actualizar cliente');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', 'Error al actualizar cliente');
    } finally {
      setSaving(false);
    }
  };

  // Toggle client visibility
  const handleToggleVisibility = async (clientId: string) => {
    if (!clientService) return;

    try {
      // Get client details to check for active debt
      const clientResult = await clientService.getClient(clientId);
      if (!clientResult.success || !clientResult.client) {
        Alert.alert('Error', 'No se pudo obtener información del cliente');
        return;
      }

      const client = clientResult.client;
      const isHiding = !client.oculto;

      // Show warning if hiding a client with active debt
      if (isHiding && client.deudaActual !== 0) {
        Alert.alert(
          'Cliente con deuda activa',
          `${client.nombre} tiene una deuda de $${Math.abs(client.deudaActual).toFixed(2)}${client.deudaActual < 0 ? ' a favor' : ''}. ¿Está seguro que desea ocultarlo?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ocultar',
              style: 'destructive',
              onPress: () => performToggleVisibility(clientId)
            }
          ]
        );
        return;
      }

      await performToggleVisibility(clientId);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      Alert.alert('Error', 'Error al cambiar visibilidad');
    }
  };

  const performToggleVisibility = async (clientId: string) => {
    if (!clientService) return;

    try {
      const result = await clientService.toggleClientVisibility(clientId);

      if (result.success) {
        const action = result.isHidden ? 'ocultado' : 'mostrado';
        Alert.alert('Éxito', `Cliente ${action} exitosamente`);
        // Real-time listener will update clients automatically
      } else {
        Alert.alert('Error', result.error || 'Error al cambiar visibilidad');
      }
    } catch (error) {
      console.error('Error in performToggleVisibility:', error);
      Alert.alert('Error', 'Error al cambiar visibilidad');
    }
  };

  // Open edit modal
  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  // Filter handlers
  const handleFiltersChange = (newFilters: ClientFilterOptions) => {
    setFilters(newFilters);
    // Update global state for includeHidden
    if (newFilters.includeHidden !== includeHiddenClients) {
      setIncludeHiddenClients(newFilters.includeHidden);
    }
  };

  const handleClearSearch = () => {
    setFilters(prev => ({ ...prev, searchTerm: '' }));
  };

  // Render client item
  const renderClientItem = ({ item }: { item: Client }) => (
    <ClientModule
      client={item}
      onToggleVisibility={handleToggleVisibility}
      onEdit={handleOpenEditModal}
      showActions={true}
    />
  );

  // Empty state component
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {filters.searchTerm ? 'No se encontraron clientes' : 'No hay clientes aún'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filters.searchTerm
          ? 'Intenta con otros términos de búsqueda'
          : 'Agrega tu primer cliente para comenzar'
        }
      </Text>
      {!filters.searchTerm && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.emptyActionText}>Agregar Cliente</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!empresaId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No hay empresa seleccionada</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Filter Component */}
      <ClientSearchFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearSearch={handleClearSearch}
      />

      {/* Header with Add Button and Hidden Toggle */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Agregar Cliente</Text>
        </TouchableOpacity>

        {/* Refresh button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={18}
            color="#25B4BD"
          />
        </TouchableOpacity>


        {/* Quick toggle for hidden clients */}
        <TouchableOpacity
          style={[
            styles.toggleHiddenButton,
            includeHiddenClients && styles.toggleHiddenButtonActive
          ]}
          onPress={() => setIncludeHiddenClients(!includeHiddenClients)}
        >
          <Ionicons
            name={includeHiddenClients ? "eye" : "eye-off"}
            size={18}
            color={includeHiddenClients ? "#fff" : "#25B4BD"}
          />
          <Text style={[
            styles.toggleHiddenText,
            includeHiddenClients && styles.toggleHiddenTextActive
          ]}>
            {includeHiddenClients ? 'Ocultar' : 'Mostrar'} ocultos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Client List */}
      {clientsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25B4BD" />
          <Text style={styles.loadingText}>Cargando clientes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={renderClientItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#25B4BD']}
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            filteredClients.length === 0 && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Client Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <ClientForm
          onSave={handleCreateClient}
          onCancel={() => setShowCreateModal(false)}
          isLoading={saving}
        />
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingClient(null);
        }}
      >
        <ClientForm
          client={editingClient || undefined}
          onSave={handleEditClient}
          onCancel={() => {
            setShowEditModal(false);
            setEditingClient(null);
          }}
          isLoading={saving}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#25B4BD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  addButtonText: {
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
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
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
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#25B4BD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#25B4BD',
    marginRight: 8,
  },
  toggleHiddenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#25B4BD',
    gap: 4,
  },
  toggleHiddenButtonActive: {
    backgroundColor: '#25B4BD',
  },
  toggleHiddenText: {
    fontSize: 12,
    color: '#25B4BD',
    fontWeight: '600',
  },
  toggleHiddenTextActive: {
    color: '#fff',
  },
});
