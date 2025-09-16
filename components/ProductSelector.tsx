import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, CreateProductData } from '@/schemas/types';
import ProductService from '@/services/ProductService';
import { useAuth } from '@/context/AuthProvider';
interface ProductSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product, cachedPrices: { ultimoCosto?: number; ultimaGanancia?: number }) => void;
  onCreateProduct?: (productData: CreateProductData) => Promise<Product | null>;
  selectedProductId?: string;
}
interface ProductWithPrices extends Product {
  cachedCosto?: number;
  cachedGanancia?: number;
  hasCachedPrices: boolean;
}
export default function ProductSelector({
  visible,
  onClose,
  onSelectProduct,
  onCreateProduct,
  selectedProductId,
}: ProductSelectorProps) {
  const { empresaId } = useAuth();
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithPrices[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const productService = ProductService.getInstance();
  const loadProducts = useCallback(async () => {
    if (!empresaId) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await productService.getProducts(empresaId);
      if (!result.success || !result.data) {
        console.error('Error loading products: service failed', result.errors || result.error);
        Alert.alert('Error', result.errors?.join('\n') || 'No se pudieron cargar los productos');
        setProducts([]);
        return;
      }
      const productList = result.data;
      const enhancedProducts: ProductWithPrices[] = productList
        .map(product => {
          const hasValidPrices =
            product.ultimoCosto !== undefined &&
            product.ultimaGanancia !== undefined &&
            product.ultimoCosto > 0 &&
            product.ultimaGanancia > 0;
          return {
            ...product,
            cachedCosto: hasValidPrices ? product.ultimoCosto : undefined,
            cachedGanancia: hasValidPrices ? product.ultimaGanancia : undefined,
            hasCachedPrices: hasValidPrices,
          };
        })
        .sort((a, b) => a.posicion - b.posicion); // Sort by position
      setProducts(enhancedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, productService]);
  const filterProducts = useCallback(() => {
    if (!searchText.trim()) {
      setFilteredProducts([...products]);
      return;
    }
    const filtered = products.filter(product =>
      product.nombre.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredProducts([...filtered]);
  }, [searchText, products]);
  useEffect(() => {
    if (visible && empresaId) {
      loadProducts();
    }
  }, [visible, empresaId, loadProducts]);
  useEffect(() => {
    filterProducts();
  }, [filterProducts]);
  useEffect(() => {
    if (products.length > 0) {
      filterProducts();
    }
  }, [products, filterProducts]);
  const handleSelectProduct = (product: ProductWithPrices) => {
    const cachedPrices = {
      ultimoCosto: product.cachedCosto,
      ultimaGanancia: product.cachedGanancia,
    };
    onSelectProduct(product, cachedPrices);
    onClose();
  };
  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para el producto');
      return;
    }
    if (!onCreateProduct) {
      Alert.alert('Error', 'Función de creación no disponible');
      return;
    }
    setIsLoading(true);
    try {
      const productData: CreateProductData = {
        nombre: newProductName.trim(),
        colorFondo: '#808080', // Default color
        posicion: products.length,
        activo: true,
        ultimoCosto: 0,
        ultimaGanancia: 0,
      };
      const newProduct = await onCreateProduct(productData);
      if (newProduct) {
        handleSelectProduct({
          ...newProduct,
          cachedCosto: undefined,
          cachedGanancia: undefined,
          hasCachedPrices: false,
        });
      }
      setShowCreateForm(false);
      setNewProductName('');
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'No se pudo crear el producto');
    } finally {
      setIsLoading(false);
    }
  };
  const formatPrice = (price?: number) => {
    return price !== undefined ? `$${price.toFixed(2)}` : '-';
  };
  const renderProduct = ({ item: product }: { item: ProductWithPrices }) => {
    const isSelected = product.id === selectedProductId;
    const totalPrice = (product.cachedCosto || 0) + (product.cachedGanancia || 0);
    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          { backgroundColor: product.colorFondo },
          isSelected && styles.selectedProduct
        ]}
        onPress={() => handleSelectProduct(product)}
        disabled={isLoading}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.nombre}</Text>
          {product.hasCachedPrices && (
            <View style={styles.priceInfo}>
              <Text style={styles.priceText}>
                Último: Costo {formatPrice(product.cachedCosto)} +
                Ganancia {formatPrice(product.cachedGanancia)} =
                Total {formatPrice(totalPrice)}
              </Text>
            </View>
          )}
          {!product.hasCachedPrices && (
            <Text style={styles.noPriceText}>Sin precios guardados</Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
        )}
      </TouchableOpacity>
    );
  };
  const renderCreateForm = () => (
    <View style={styles.createForm}>
      <Text style={styles.createFormTitle}>Crear Nuevo Producto</Text>
      <TextInput
        style={styles.createInput}
        value={newProductName}
        onChangeText={setNewProductName}
        placeholder="Nombre del producto"
        autoFocus
      />
      <View style={styles.createActions}>
        <TouchableOpacity
          style={[styles.createButton, styles.cancelButton]}
          onPress={() => {
            setShowCreateForm(false);
            setNewProductName('');
          }}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createButton, styles.confirmButton]}
          onPress={handleCreateProduct}
          disabled={isLoading}
        >
          <Text style={styles.confirmButtonText}>
            {isLoading ? 'Creando...' : 'Crear'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
            <Text style={styles.title}>Seleccionar Producto</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          {!showCreateForm && (
            <>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Buscar productos..."
                />
              </View>
              <View style={styles.actions}>
                {onCreateProduct && (
                  <TouchableOpacity
                    style={styles.createNewButton}
                    onPress={() => setShowCreateForm(true)}
                    disabled={isLoading}
                  >
                    <Ionicons name="add" size={20} color="#25B4BD" />
                    <Text style={styles.createNewText}>Crear Nuevo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                style={styles.productList}
                contentContainerStyle={filteredProducts.length === 0 ? styles.emptyListContainer : undefined}
                showsVerticalScrollIndicator={false}
                extraData={filteredProducts.length}
                removeClippedSubviews={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>
                      {searchText ? 'No se encontraron productos' : 'No hay productos'}
                    </Text>
                  </View>
                }
              />
            </>
          )}
          {showCreateForm && renderCreateForm()}
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
    width: '95%',
    maxWidth: 600,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  actions: {
    marginBottom: 16,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#25B4BD',
  },
  createNewText: {
    color: '#25B4BD',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  productList: {
    flex: 1,
    minHeight: 300,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    minHeight: 80,
  },
  selectedProduct: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  priceInfo: {
    marginTop: 4,
  },
  priceText: {
    fontSize: 14,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  noPriceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  createForm: {
    padding: 20,
  },
  createFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  createInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  createButton: {
    flex: 1,
    padding: 12,
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
  confirmButton: {
    backgroundColor: '#25B4BD',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});