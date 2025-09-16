import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import { useProducts } from '@/context/RealtimeDataProvider';
import { Product, CreateProductData, UpdateProductData } from '@/schemas/types';
import ProductService from '@/services/ProductService';
import ProductForm from '@/components/ProductForm';
import AppLogo from '@/components/AppLogo';
export default function ProductManagementScreen() {
  const router = useRouter();
  const { empresaId } = useAuth();
  const { products, productsLoading, refreshProducts } = useProducts();
  const [isLoading, setIsLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const productService = ProductService.getInstance();
  useEffect(() => {
    initializeService();
  }, []);
  const initializeService = async () => {
    try {
      await productService.initialize();
    } catch (error) {
      console.error('Error initializing product service:', error);
    }
  };
  const handleRefreshProducts = async () => {
    try {
      await refreshProducts();
    } catch (error) {
      console.error('ProductManagementScreen.handleRefreshProducts: Refresh failed', error);
    }
  };
  const handleCreateProduct = () => {
    setEditingProduct(undefined);
    setFormVisible(true);
  };
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormVisible(true);
  };
  const handleSubmitProduct = async (productData: CreateProductData | UpdateProductData) => {
    const context = 'ProductManagementScreen.handleSubmitProduct';
    if (!empresaId) {
      console.error(`${context}: No empresaId available`);
      Alert.alert('Error', 'No se pudo identificar la empresa');
      return;
    }
    setIsLoading(true);
    try {
      if (editingProduct) {
        const result = await productService.updateProduct(
          empresaId,
          editingProduct.id,
          productData as UpdateProductData
        );
        if (result.success) {
          Alert.alert('Éxito', 'Producto actualizado correctamente');
        } else {
          console.error(`${context}: Update failed`, { errors: result.errors });
          Alert.alert('Error', result.errors?.join('\n') || 'Error al actualizar producto');
        }
      } else {
        const posicion = products?.length || 0;
        const newProductData: CreateProductData = {
          ...(productData as Omit<CreateProductData, 'posicion'>),
          posicion, // Ensure posicion is always a valid number
        };
        const result = await productService.createProduct(empresaId, newProductData);
        if (result.success) {
          Alert.alert('Éxito', 'Producto creado correctamente');
        } else {
          console.error(`${context}: Creation failed`, { errors: result.errors });
          Alert.alert('Error', result.errors?.join('\n') || 'Error al crear producto');
        }
      }
    } catch (error) {
      console.error(`${context}: Exception during product submission`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        empresaId,
        isEditing: !!editingProduct
      });
      Alert.alert('Error', 'No se pudo guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteProduct = async (product: Product) => {
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const dependencies = await productService.checkProductDependencies(empresaId, product.id);
      if (dependencies.hasTransactions) {
        Alert.alert(
          'No se puede eliminar',
          `Este producto tiene ${dependencies.transactionCount} transacciones asociadas. No se puede eliminar.`
        );
        return;
      }
      const result = await productService.deleteProduct(empresaId, product.id);
      if (result.success) {
        Alert.alert('Éxito', 'Producto eliminado correctamente');
      } else {
        Alert.alert('Error', result.errors?.join('\n') || 'Error al eliminar producto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Error', 'No se pudo eliminar el producto');
    } finally {
      setIsLoading(false);
    }
  };
  const handleMoveProduct = async (fromIndex: number, toIndex: number) => {
    if (!empresaId || !products) return;
    const sorted = [...products].sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
    if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) return;
    if (fromIndex === toIndex) return;
    const product = sorted[fromIndex];
    setIsLoading(true);
    try {
      const result = await productService.moveProduct(empresaId, product.id, fromIndex, toIndex, sorted);
      if (!result.success) {
        Alert.alert('Error', result.errors?.join('\n') || 'No se pudo mover el producto');
      }
    } catch (error) {
      console.error('ProductManagementScreen.handleMoveProduct: Exception', error);
      Alert.alert('Error', 'No se pudo mover el producto');
    } finally {
      setIsLoading(false);
    }
  };
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No hay productos aún</Text>
      <Text style={styles.emptySubtitle}>
        Agrega tu primer producto para comenzar
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={handleCreateProduct}
      >
        <Text style={styles.emptyActionText}>Agregar Producto</Text>
      </TouchableOpacity>
    </View>
  );
  return (
    <SafeAreaView style={styles.container}>
      {}
      <View style={styles.logoHeader}>
        <AppLogo size="small" showText={false} />
        <Text style={[styles.title]}>Gestión de Productos</Text>
      </View>
      {}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateProduct}
          disabled={isLoading}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Nuevo Producto</Text>
        </TouchableOpacity>
        {}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefreshProducts}
          disabled={isLoading || productsLoading}
        >
          <Ionicons name="refresh" size={18} color="#25B4BD" />
        </TouchableOpacity>
        {}
        <TouchableOpacity
          style={styles.companyButton}
          onPress={() => {
            router.push('/(company)');
          }}
          disabled={isLoading}
        >
          <Ionicons name="business" size={18} color="#25B4BD" />
          <Text style={styles.companyButtonText}>Empresas</Text>
        </TouchableOpacity>
      </View>
      {}
      {productsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25B4BD" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : (
        <FlatList
          data={products ? [...products].sort((a, b) => (a.posicion || 0) - (b.posicion || 0)) : []}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.productRow}>
              <View style={styles.productInfo}>
                <View style={[styles.colorDot, { backgroundColor: item.colorFondo }]} />
                <Text style={styles.productName}>{item.nombre}</Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]}
                  onPress={() => handleMoveProduct(index, index - 1)}
                  disabled={index === 0 || isLoading}
                >
                  <Ionicons name="chevron-up" size={18} color={index === 0 ? '#bbb' : '#25B4BD'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, (products ? index === products.length - 1 : true) && styles.iconButtonDisabled]}
                  onPress={() => handleMoveProduct(index, index + 1)}
                  disabled={!products || index === products.length - 1 || isLoading}
                >
                  <Ionicons name="chevron-down" size={18} color={!products || index === products.length - 1 ? '#bbb' : '#25B4BD'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleEditProduct(item)} disabled={isLoading}>
                  <Ionicons name="create-outline" size={18} color="#2C3E50" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleDeleteProduct(item)} disabled={isLoading}>
                  <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContainer,
            (!products || products.length === 0) && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ProductForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSubmitProduct}
        product={editingProduct}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  companyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#25B4BD',
    gap: 4,
  },
  companyButtonText: {
    fontSize: 12,
    color: '#25B4BD',
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
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  productName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 6,
    backgroundColor: '#f7f7f7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
});
