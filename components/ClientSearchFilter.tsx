import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ClientFilterOptions {
  searchTerm: string;
  includeHidden: boolean;
  sortBy: 'nombre' | 'deuda' | 'ultimaTransaccion';
  sortOrder: 'asc' | 'desc';
  debtFilter: 'all' | 'withDebt' | 'noDebt' | 'inFavor';
}

interface ClientSearchFilterProps {
  filters: ClientFilterOptions;
  onFiltersChange: (filters: ClientFilterOptions) => void;
  onClearSearch: () => void;
}

export default function ClientSearchFilter({ 
  filters, 
  onFiltersChange, 
  onClearSearch 
}: ClientSearchFilterProps) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const updateFilter = (key: keyof ClientFilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getSortDisplayText = () => {
    const sortLabels = {
      nombre: 'Nombre',
      deuda: 'Deuda',
      ultimaTransaccion: 'Última Transacción'
    };
    
    const orderLabels = {
      asc: 'Ascendente',
      desc: 'Descendente'
    };

    return `${sortLabels[filters.sortBy]} (${orderLabels[filters.sortOrder]})`;
  };

  const hasActiveFilters = () => {
    return filters.searchTerm.length > 0 || 
           filters.includeHidden || 
           filters.sortBy !== 'nombre' || 
           filters.sortOrder !== 'asc' ||
           filters.debtFilter !== 'all';
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar clientes..."
            value={filters.searchTerm}
            onChangeText={(text) => updateFilter('searchTerm', text)}
          />
          {filters.searchTerm.length > 0 && (
            <TouchableOpacity onPress={onClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons 
            name="filter" 
            size={20} 
            color={hasActiveFilters() ? '#fff' : '#25B4BD'} 
          />
          {hasActiveFilters() && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersLabel}>Filtros activos:</Text>
          <View style={styles.activeFiltersRow}>
            {filters.includeHidden && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Incluye ocultos</Text>
              </View>
            )}
            {(filters.sortBy !== 'nombre' || filters.sortOrder !== 'asc') && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{getSortDisplayText()}</Text>
              </View>
            )}
            {filters.debtFilter !== 'all' && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  {filters.debtFilter === 'withDebt' && 'Con deuda'}
                  {filters.debtFilter === 'noDebt' && 'Sin deuda'}
                  {filters.debtFilter === 'inFavor' && 'A favor'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros y Ordenamiento</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Show Hidden Clients Toggle */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Visibilidad</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Mostrar clientes ocultos</Text>
                  <Switch
                    value={filters.includeHidden}
                    onValueChange={(value) => updateFilter('includeHidden', value)}
                    trackColor={{ false: '#767577', true: '#25B4BD' }}
                    thumbColor={filters.includeHidden ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Debt Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Estado de Deuda</Text>
                <View style={styles.debtFilterContainer}>
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'withDebt', label: 'Con deuda' },
                    { key: 'noDebt', label: 'Sin deuda' },
                    { key: 'inFavor', label: 'A favor' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.debtFilterOption,
                        filters.debtFilter === option.key && styles.debtFilterOptionSelected
                      ]}
                      onPress={() => updateFilter('debtFilter', option.key)}
                    >
                      <Text style={[
                        styles.debtFilterText,
                        filters.debtFilter === option.key && styles.debtFilterTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Ordenar por</Text>
                
                {/* Sort Field Selection */}
                <View style={styles.sortOptionsContainer}>
                  {[
                    { key: 'nombre', label: 'Nombre' },
                    { key: 'deuda', label: 'Deuda' },
                    { key: 'ultimaTransaccion', label: 'Última Transacción' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.sortOption,
                        filters.sortBy === option.key && styles.sortOptionSelected
                      ]}
                      onPress={() => updateFilter('sortBy', option.key)}
                    >
                      <Text style={[
                        styles.sortOptionText,
                        filters.sortBy === option.key && styles.sortOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Sort Order Selection */}
                <View style={styles.sortOrderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderButton,
                      filters.sortOrder === 'asc' && styles.sortOrderButtonSelected
                    ]}
                    onPress={() => updateFilter('sortOrder', 'asc')}
                  >
                    <Ionicons 
                      name="arrow-up" 
                      size={16} 
                      color={filters.sortOrder === 'asc' ? '#fff' : '#25B4BD'} 
                    />
                    <Text style={[
                      styles.sortOrderText,
                      filters.sortOrder === 'asc' && styles.sortOrderTextSelected
                    ]}>
                      Ascendente
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sortOrderButton,
                      filters.sortOrder === 'desc' && styles.sortOrderButtonSelected
                    ]}
                    onPress={() => updateFilter('sortOrder', 'desc')}
                  >
                    <Ionicons 
                      name="arrow-down" 
                      size={16} 
                      color={filters.sortOrder === 'desc' ? '#fff' : '#25B4BD'} 
                    />
                    <Text style={[
                      styles.sortOrderText,
                      filters.sortOrder === 'desc' && styles.sortOrderTextSelected
                    ]}>
                      Descendente
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reset Filters Button */}
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  onFiltersChange({
                    searchTerm: '',
                    includeHidden: false,
                    sortBy: 'nombre',
                    sortOrder: 'asc',
                    debtFilter: 'all'
                  });
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.resetButtonText}>Restablecer Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#25B4BD',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#25B4BD',
  },
  filterIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  activeFiltersContainer: {
    marginTop: 12,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterChipText: {
    fontSize: 12,
    color: '#1976d2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#25B4BD',
    alignItems: 'center',
  },
  sortOptionSelected: {
    backgroundColor: '#25B4BD',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#25B4BD',
  },
  sortOptionTextSelected: {
    color: '#fff',
  },
  sortOrderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#25B4BD',
    gap: 4,
  },
  sortOrderButtonSelected: {
    backgroundColor: '#25B4BD',
  },
  sortOrderText: {
    fontSize: 14,
    color: '#25B4BD',
  },
  sortOrderTextSelected: {
    color: '#fff',
  },
  resetButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debtFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  debtFilterOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#25B4BD',
    alignItems: 'center',
  },
  debtFilterOptionSelected: {
    backgroundColor: '#25B4BD',
  },
  debtFilterText: {
    fontSize: 14,
    color: '#25B4BD',
  },
  debtFilterTextSelected: {
    color: '#fff',
  },
});