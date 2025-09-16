import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, CreateProductData, UpdateProductData } from '@/schemas/types';
import { validateProduct } from '@/schemas/validation';
import { useToast } from '@/context/ToastProvider';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import AppColorPicker from '@/components/ColorPicker';
interface ProductFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (productData: CreateProductData | UpdateProductData) => Promise<void>;
  product?: Product; // If provided, we're editing
  isLoading?: boolean;
}
const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];
export default function ProductForm({
  visible,
  onClose,
  onSubmit,
  product,
  isLoading = false
}: ProductFormProps) {
  const [nombre, setNombre] = useState('');
  const [colorFondo, setColorFondo] = useState('#808080');
  const [ultimoCosto, setUltimoCosto] = useState('');
  const [ultimaGanancia, setUltimaGanancia] = useState('');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canCancel, setCanCancel] = useState(true);
  const { showToast } = useToast();
  const isEditing = !!product;
  useEffect(() => {
    if (product) {
      setNombre(product.nombre);
      setColorFondo(product.colorFondo);
      setUltimoCosto(product.ultimoCosto?.toString() || '');
      setUltimaGanancia(product.ultimaGanancia?.toString() || '');
    } else {
      setNombre('');
      setColorFondo('#808080');
      setUltimoCosto('');
      setUltimaGanancia('');
    }
    setErrors([]);
    setFieldErrors({});
    setTouched({});
  }, [product, visible]);
  const validateField = useCallback((fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'nombre':
        if (!value || !value.trim()) {
          return 'El nombre del producto es requerido';
        }
        if (value.trim().length > 50) {
          return 'El nombre no puede exceder 50 caracteres';
        }
        if (value.trim().length < 2) {
          return 'El nombre debe tener al menos 2 caracteres';
        }
        return '';
      case 'colorFondo':
        if (!value || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
          return 'Selecciona un color válido';
        }
        return '';
      case 'ultimoCosto':
        if (!value || !value.trim()) {
          return 'El costo unitario es requerido';
        }
        const costoValue = Number(value);
        if (isNaN(costoValue)) {
          return 'El costo debe ser un número válido';
        }
        if (costoValue < 0) {
          return 'El costo debe ser mayor o igual a 0';
        }
        if (costoValue > 999999) {
          return 'El costo no puede exceder $999,999';
        }
        return '';
      case 'ultimaGanancia':
        if (!value || !value.trim()) {
          return 'La ganancia unitaria es requerida';
        }
        const gananciaValue = Number(value);
        if (isNaN(gananciaValue)) {
          return 'La ganancia debe ser un número válido';
        }
        if (gananciaValue < 0) {
          return 'La ganancia debe ser mayor o igual a 0';
        }
        if (gananciaValue > 999999) {
          return 'La ganancia no puede exceder $999,999';
        }
        return '';
      default:
        return '';
    }
  }, []);
  const validateForm = useCallback((): boolean => {
    const productData: CreateProductData = {
      nombre: nombre.trim(),
      colorFondo,
      ultimoCosto: ultimoCosto ? Number(ultimoCosto) : 0, // Required field, default to 0 if empty
      ultimaGanancia: ultimaGanancia ? Number(ultimaGanancia) : 0, // Required field, default to 0 if empty
      activo: true,
      posicion: product?.posicion || 0,
    };
    const validation = validateProduct(productData);
    const newFieldErrors: { [key: string]: string } = {};
    newFieldErrors.nombre = validateField('nombre', nombre);
    newFieldErrors.colorFondo = validateField('colorFondo', colorFondo);
    newFieldErrors.ultimoCosto = validateField('ultimoCosto', ultimoCosto);
    newFieldErrors.ultimaGanancia = validateField('ultimaGanancia', ultimaGanancia);
    setFieldErrors(newFieldErrors);
    setErrors(validation.errors);
    const hasFieldErrors = Object.values(newFieldErrors).some(error => error !== '');
    return validation.isValid && !hasFieldErrors;
  }, [nombre, colorFondo, ultimoCosto, ultimaGanancia, product?.posicion, validateField]);
  const handleFieldBlur = useCallback((fieldName: string, value: any) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
  }, [validateField]);
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
    switch (fieldName) {
      case 'nombre':
        setNombre(value);
        break;
      case 'colorFondo':
        setColorFondo(value);
        break;
      case 'ultimoCosto':
        setUltimoCosto(value);
        break;
      case 'ultimaGanancia':
        setUltimaGanancia(value);
        break;
    }
  }, [fieldErrors]);
  const handleSubmit = async () => {
    const context = 'ProductForm.handleSubmit';

    setTouched({
      nombre: true,
      colorFondo: true,
      ultimoCosto: true,
      ultimaGanancia: true,
    });

    if (!validateForm()) {
      console.error(`${context}: Form validation failed`, {
        fieldErrors,
        errors,
        formData: {
          nombre: nombre.trim(),
          colorFondo,
          ultimoCosto,
          ultimaGanancia
        }
      });
      showToast(
        'Por favor corrige los errores en el formulario antes de continuar.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    setCanCancel(false);
    try {
      const productData: CreateProductData | UpdateProductData = {
        nombre: nombre.trim(),
        colorFondo,
        ultimoCosto: Number(ultimoCosto) || 0, // Required field
        ultimaGanancia: Number(ultimaGanancia) || 0, // Required field
        activo: true,
        ...(product && { posicion: product.posicion }), // Only include posicion when editing
      };

      await onSubmit(productData);

      showToast(
        isEditing ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
        'success'
      );
      onClose();
    } catch (error) {
      console.error(`${context}: Form submission failed`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        productData: {
          nombre: nombre.trim(),
          colorFondo,
          ultimoCosto: ultimoCosto ? Number(ultimoCosto) : undefined,
          ultimaGanancia: ultimaGanancia ? Number(ultimaGanancia) : undefined
        }
      });
      let errorMessage = 'No se pudo guardar el producto';
      let showRetry = true;
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'No tienes permisos para realizar esta acción.';
          showRetry = false;
        } else if (error.message.includes('validation')) {
          errorMessage = 'Los datos del producto no son válidos.';
          showRetry = false;
        } else if (error.message.includes('Missing or insufficient permissions')) {
          errorMessage = 'No tienes permisos para crear productos en esta empresa.';
          showRetry = false;
        } else if (error.message.includes('offline')) {
          errorMessage = 'Sin conexión a internet. Verifica tu conexión e intenta nuevamente.';
        }
      }
      showToast(
        errorMessage,
        'error',
        showRetry ? {
          label: 'Reintentar',
          onPress: handleSubmit
        } : undefined
      );
    } finally {
      setIsSubmitting(false);
      setCanCancel(true);
    }
  };
  const handleColorSelect = (color: string) => {
    handleFieldChange('colorFondo', color);
    setColorPickerVisible(false);
  };
  const getInputStyle = (fieldName: string) => {
    const hasError = touched[fieldName] && fieldErrors[fieldName];
    return [
      styles.input,
      hasError ? styles.inputError : null,
      touched[fieldName] && !fieldErrors[fieldName] ? styles.inputValid : null
    ];
  };
  const renderFieldError = (fieldName: string) => {
    if (touched[fieldName] && fieldErrors[fieldName]) {
      return (
        <View style={styles.fieldErrorContainer}>
          <Ionicons name="alert-circle" size={16} color="#c62828" />
          <Text style={styles.fieldErrorText}>{fieldErrors[fieldName]}</Text>
        </View>
      );
    }
    return null;
  };
  const isFormValid = !Object.values(fieldErrors).some(error => error !== '') &&
    nombre.trim() !== '' &&
    colorFondo !== '';
  const handleCancel = () => {
    if (isSubmitting && !canCancel) {
      showToast('No se puede cancelar mientras se guarda el producto', 'warning');
      return;
    }
    onClose();
  };
  const getTotalPrice = () => {
    const costo = ultimoCosto ? Number(ultimoCosto) : 0;
    const ganancia = ultimaGanancia ? Number(ultimaGanancia) : 0;
    if (isNaN(costo) || isNaN(ganancia)) {
      return null;
    }
    return costo + ganancia;
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          {errors.length > 0 && (
            <View style={styles.errorContainer}>
              <View style={styles.errorHeader}>
                <Ionicons name="warning" size={20} color="#c62828" />
                <Text style={styles.errorHeaderText}>Errores de Validación</Text>
              </View>
              {errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>• {error}</Text>
              ))}
            </View>
          )}
          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nombre del Producto *
                {touched.nombre && !fieldErrors.nombre && (
                  <Ionicons name="checkmark-circle" size={16} color="#2e7d32" style={styles.validIcon} />
                )}
              </Text>
              <TextInput
                style={getInputStyle('nombre')}
                value={nombre}
                onChangeText={(value) => handleFieldChange('nombre', value)}
                onBlur={() => handleFieldBlur('nombre', nombre)}
                placeholder="Ej: Coca Cola 500ml"
                maxLength={50}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <Text style={styles.characterCount}>{nombre.length}/50</Text>
              {renderFieldError('nombre')}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Color de Fondo *
                {touched.colorFondo && !fieldErrors.colorFondo && (
                  <Ionicons name="checkmark-circle" size={16} color="#2e7d32" style={styles.validIcon} />
                )}
              </Text>
              <View style={styles.colorSection}>
                <TouchableOpacity
                  style={[
                    styles.colorPreview,
                    { backgroundColor: colorFondo },
                    touched.colorFondo && fieldErrors.colorFondo ? styles.colorPreviewError : null
                  ]}
                  onPress={() => setColorPickerVisible(true)}
                >
                  <Ionicons name="color-palette" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.colorGrid}>
                  {DEFAULT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        colorFondo === color && styles.selectedColor
                      ]}
                      onPress={() => handleFieldChange('colorFondo', color)}
                    />
                  ))}
                </View>
              </View>
              {renderFieldError('colorFondo')}
            </View>
            <View style={styles.priceRow}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Costo Unitario *
                  {touched.ultimoCosto && !fieldErrors.ultimoCosto && ultimoCosto && (
                    <Ionicons name="checkmark-circle" size={16} color="#2e7d32" style={styles.validIcon} />
                  )}
                </Text>
                <TextInput
                  style={getInputStyle('ultimoCosto')}
                  value={ultimoCosto}
                  onChangeText={(value) => handleFieldChange('ultimoCosto', value)}
                  onBlur={() => handleFieldBlur('ultimoCosto', ultimoCosto)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                {renderFieldError('ultimoCosto')}
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Ganancia Unitaria *
                  {touched.ultimaGanancia && !fieldErrors.ultimaGanancia && ultimaGanancia && (
                    <Ionicons name="checkmark-circle" size={16} color="#2e7d32" style={styles.validIcon} />
                  )}
                </Text>
                <TextInput
                  style={getInputStyle('ultimaGanancia')}
                  value={ultimaGanancia}
                  onChangeText={(value) => handleFieldChange('ultimaGanancia', value)}
                  onBlur={() => handleFieldBlur('ultimaGanancia', ultimaGanancia)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                {renderFieldError('ultimaGanancia')}
              </View>
            </View>
            {(() => {
              const totalPrice = getTotalPrice();
              if (totalPrice !== null && totalPrice > 0) {
                return (
                  <View style={styles.totalPreview}>
                    <Ionicons name="calculator" size={20} color="#2e7d32" />
                    <Text style={styles.totalText}>
                      Precio total: ${totalPrice.toFixed(2)}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                (isSubmitting && !canCancel) && styles.disabledButton
              ]}
              onPress={handleCancel}
              disabled={isSubmitting && !canCancel}
            >
              <Text style={[
                styles.cancelButtonText,
                (isSubmitting && !canCancel) && styles.disabledText
              ]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                ((isLoading || isSubmitting) || !isFormValid) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={(isLoading || isSubmitting) || !isFormValid}
            >
              {(isLoading || isSubmitting) && (
                <Ionicons name="hourglass" size={16} color="#fff" style={styles.loadingIcon} />
              )}
              <Text style={styles.submitButtonText}>
                {(isLoading || isSubmitting) ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
              </Text>
            </TouchableOpacity>
          </View>
          { }
          <Modal
            visible={colorPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setColorPickerVisible(false)}
          >
            <View style={styles.colorPickerOverlay}>
              <View style={styles.colorPickerContainer}>
                <AppColorPicker
                  onColorChange={handleColorSelect}
                />
                <TouchableOpacity
                  style={styles.colorPickerClose}
                  onPress={() => setColorPickerVisible(false)}
                >
                  <Text style={styles.colorPickerCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          { }
          <LoadingOverlay
            visible={isSubmitting}
            message={isEditing ? 'Actualizando producto...' : 'Creando producto...'}
            cancelable={canCancel}
            onCancel={canCancel ? handleCancel : undefined}
          />
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
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#c62828',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorHeaderText: {
    color: '#c62828',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    lineHeight: 20,
  },
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fieldErrorText: {
    color: '#c62828',
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#c62828',
    backgroundColor: '#ffebee',
  },
  inputValid: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e8',
  },
  validIcon: {
    marginLeft: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  colorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  colorPreviewError: {
    borderColor: '#c62828',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  totalPreview: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginLeft: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#25B4BD',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.6,
  },
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  nativeColorPicker: {
    width: 300,
    height: 300,
  },
  colorPickerClose: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#25B4BD',
    borderRadius: 8,
    alignItems: 'center',
  },
  colorPickerCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});