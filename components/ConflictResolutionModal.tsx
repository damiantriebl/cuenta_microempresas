import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConflictData {
  field: string;
  localValue: any;
  serverValue: any;
  displayName: string;
}

interface ConflictResolutionModalProps {
  visible: boolean;
  title: string;
  conflicts: ConflictData[];
  onResolve: (resolution: Record<string, 'local' | 'server'>) => void;
  onCancel: () => void;
}

export default function ConflictResolutionModal({
  visible,
  title,
  conflicts,
  onResolve,
  onCancel,
}: ConflictResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server'>>({});

  const handleFieldResolution = (field: string, choice: 'local' | 'server') => {
    setResolutions(prev => ({
      ...prev,
      [field]: choice
    }));
  };

  const handleResolveAll = (choice: 'local' | 'server') => {
    const allResolutions: Record<string, 'local' | 'server'> = {};
    conflicts.forEach(conflict => {
      allResolutions[conflict.field] = choice;
    });
    setResolutions(allResolutions);
  };

  const handleSubmit = () => {
    // Check if all conflicts are resolved
    const unresolvedConflicts = conflicts.filter(
      conflict => !resolutions[conflict.field]
    );

    if (unresolvedConflicts.length > 0) {
      Alert.alert(
        'Conflictos sin resolver',
        `Debes resolver ${unresolvedConflicts.length} conflicto${unresolvedConflicts.length > 1 ? 's' : ''} antes de continuar.`
      );
      return;
    }

    onResolve(resolutions);
    setResolutions({});
  };

  const handleCancel = () => {
    setResolutions({});
    onCancel();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Sin valor';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') {
      if (value.toDate && typeof value.toDate === 'function') {
        return value.toDate().toLocaleString();
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderConflictItem = (conflict: ConflictData) => {
    const selectedChoice = resolutions[conflict.field];

    return (
      <View key={conflict.field} style={styles.conflictItem}>
        <Text style={styles.fieldName}>{conflict.displayName}</Text>
        
        <View style={styles.choicesContainer}>
          {/* Local Version */}
          <TouchableOpacity
            style={[
              styles.choiceButton,
              selectedChoice === 'local' && styles.selectedChoice
            ]}
            onPress={() => handleFieldResolution(conflict.field, 'local')}
          >
            <View style={styles.choiceHeader}>
              <Ionicons 
                name="phone-portrait-outline" 
                size={16} 
                color={selectedChoice === 'local' ? '#fff' : '#25B4BD'} 
              />
              <Text style={[
                styles.choiceTitle,
                selectedChoice === 'local' && styles.selectedChoiceText
              ]}>
                Tu versión
              </Text>
            </View>
            <Text style={[
              styles.choiceValue,
              selectedChoice === 'local' && styles.selectedChoiceText
            ]}>
              {formatValue(conflict.localValue)}
            </Text>
          </TouchableOpacity>

          {/* Server Version */}
          <TouchableOpacity
            style={[
              styles.choiceButton,
              selectedChoice === 'server' && styles.selectedChoice
            ]}
            onPress={() => handleFieldResolution(conflict.field, 'server')}
          >
            <View style={styles.choiceHeader}>
              <Ionicons 
                name="cloud-outline" 
                size={16} 
                color={selectedChoice === 'server' ? '#fff' : '#25B4BD'} 
              />
              <Text style={[
                styles.choiceTitle,
                selectedChoice === 'server' && styles.selectedChoiceText
              ]}>
                Versión del servidor
              </Text>
            </View>
            <Text style={[
              styles.choiceValue,
              selectedChoice === 'server' && styles.selectedChoiceText
            ]}>
              {formatValue(conflict.serverValue)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            Se detectaron conflictos entre tu versión local y la versión del servidor. 
            Selecciona qué versión quieres mantener para cada campo.
          </Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleResolveAll('local')}
          >
            <Text style={styles.quickActionText}>Usar mi versión para todo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleResolveAll('server')}
          >
            <Text style={styles.quickActionText}>Usar versión del servidor</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.conflictsList}>
          {conflicts.map(renderConflictItem)}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={handleSubmit}
          >
            <Text style={styles.resolveButtonText}>Resolver conflictos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderBottomWidth: 1,
    borderBottomColor: '#ffeaa7',
  },
  descriptionText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  conflictsList: {
    flex: 1,
    padding: 16,
  },
  conflictItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fieldName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  choicesContainer: {
    gap: 12,
  },
  choiceButton: {
    borderWidth: 2,
    borderColor: '#25B4BD',
    borderRadius: 8,
    padding: 12,
  },
  selectedChoice: {
    backgroundColor: '#25B4BD',
    borderColor: '#25B4BD',
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25B4BD',
    marginLeft: 8,
  },
  selectedChoiceText: {
    color: '#fff',
  },
  choiceValue: {
    fontSize: 14,
    color: '#495057',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resolveButton: {
    flex: 2,
    backgroundColor: '#25B4BD',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});