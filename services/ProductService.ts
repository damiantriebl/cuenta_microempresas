import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductPriceCache,
  ValidationResult,
  ServiceResponse
} from '@/schemas/types';
import { validateProduct } from '@/schemas/validation';
import {
  createProduct as createProductInFirestore,
  getProducts,
  updateProduct as updateProductInFirestore,
  deleteProduct as deleteProductInFirestore,
  subscribeToProducts
} from '@/schemas/firestore-utils';
import { savePriceToHistory } from '@/components/PriceHistoryTracker';
const PRICE_CACHE_KEY = 'product_price_cache';
export class ProductPriceCacheService {
  private static instance: ProductPriceCacheService;
  private cache: ProductPriceCache = {};
  static getInstance(): ProductPriceCacheService {
    if (!ProductPriceCacheService.instance) {
      ProductPriceCacheService.instance = new ProductPriceCacheService();
    }
    return ProductPriceCacheService.instance;
  }
  async loadCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(PRICE_CACHE_KEY);
      if (cacheData) {
        this.cache = JSON.parse(cacheData);
      }
    } catch (error) {
      console.error('Error loading price cache:', error);
    }
  }
  async saveCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Error saving price cache:', error);
    }
  }
  getCachedPrice(productId: string): { ultimoCosto?: number; ultimaGanancia?: number } | null {
    return this.cache[productId] || null;
  }
  setCachedPrice(productId: string, ultimoCosto?: number, ultimaGanancia?: number): void {
    if (typeof ultimoCosto === 'number' && typeof ultimaGanancia === 'number') {
      this.cache[productId] = {
        ultimoCosto,
        ultimaGanancia,
        fechaActualizacion: Timestamp.now()
      };
    }
    this.saveCache();
  }
  clearCache(): void {
    this.cache = {};
    this.saveCache();
  }
}
export class ProductService {
  private static instance: ProductService;
  private priceCache: ProductPriceCacheService;
  constructor() {
    this.priceCache = ProductPriceCacheService.getInstance();
  }
  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }
  async initialize(): Promise<void> {
    try {
      await this.priceCache.loadCache();
    } catch (error) {
      console.error('ProductService initialization failed:', error);
    }
  }
  async createProduct(empresaId: string, productData: CreateProductData): Promise<ServiceResponse<string>> {
    const context = 'ProductService.createProduct';
    console.log(`${context}: Iniciando producto creation`, {
      empresaId,
      productName: productData.nombre,
      ultimaCosto: productData.ultimoCosto,
      ultimaGanancia: productData.ultimaGanancia
    });
    try {
      if (!productData.nombre?.trim()) {
        return {
          success: false,
          errors: ['El nombre del producto es requerido']
        };
      }
      const validation = validateProduct(productData);
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }
      const productId = await createProductInFirestore(empresaId, productData);
      if (productData.ultimoCosto !== undefined || productData.ultimaGanancia !== undefined) {
        try {
          this.priceCache.setCachedPrice(productId, productData.ultimoCosto, productData.ultimaGanancia);
        } catch (cacheError) {
          console.warn(`${context}: Price caching failed`, cacheError);
        }
      }
      if (productData.ultimoCosto !== undefined || productData.ultimaGanancia !== undefined) {
        try {
          if (typeof productData.ultimoCosto === 'number' && typeof productData.ultimaGanancia === 'number') {
            await savePriceToHistory(
              productId, 
              productData.nombre || 'Unknown Product',
              productData.ultimoCosto,
              productData.ultimaGanancia
            );
          }
        } catch (historyError) {
          console.warn(`${context}: Price history save failed`, historyError);
        }
      }
      console.log(`${context}: Producto creado exitosamente`, { productId });
      return {
        success: true,
        data: productId
      };
    } catch (error) {
      console.error(`${context}: Product creation failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async getProducts(empresaId: string): Promise<ServiceResponse<Product[]>> {
    const context = 'ProductService.getProducts';
    try {
      const products = await getProducts(empresaId);
      console.log(`${context}: Obtenido ${products.length} products`, { empresaId });
      return {
        success: true,
        data: products
      };
    } catch (error) {
      console.error(`${context}: Failed to get products`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async updateProduct(empresaId: string, productId: string, updateData: UpdateProductData): Promise<ServiceResponse<void>> {
    const context = 'ProductService.updateProduct';
    try {
      if (updateData.nombre !== undefined) {
        const validation = validateProduct({ ...updateData, nombre: updateData.nombre } as CreateProductData);
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors
          };
        }
      }
      await updateProductInFirestore(empresaId, productId, updateData);
      if (updateData.ultimoCosto !== undefined || updateData.ultimaGanancia !== undefined) {
        try {
          this.priceCache.setCachedPrice(productId, updateData.ultimoCosto, updateData.ultimaGanancia);
        } catch (cacheError) {
          console.warn(`${context}: Price caching failed`, cacheError);
        }
      }
      console.log(`${context}: Producto actualizado exitosamente`, { productId });
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error(`${context}: Product update failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async deleteProduct(empresaId: string, productId: string): Promise<ServiceResponse<void>> {
    const context = 'ProductService.deleteProduct';
    try {
      await deleteProductInFirestore(empresaId, productId);
      console.log(`${context}: Producto eliminado exitosamente`, { productId });
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error(`${context}: Product deletion failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async moveProduct(empresaId: string, productId: string, fromIndex: number, toIndex: number, sortedProducts: Product[]): Promise<ServiceResponse<void>> {
    const context = 'ProductService.moveProduct';
    try {
      const updateData: UpdateProductData = {
        posicion: toIndex
      };
      await updateProductInFirestore(empresaId, productId, updateData);
      console.log(`${context}: Producto moved exitosamente`, { productId, fromIndex, toIndex });
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error(`${context}: Product move failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async checkProductDependencies(empresaId: string, productId: string): Promise<{
    hasTransactions: boolean;
    transactionCount: number;
  }> {
    return {
      hasTransactions: false,
      transactionCount: 0
    };
  }
  getLastUsedPrices(productId: string): { ultimoCosto?: number; ultimaGanancia?: number } {
    try {
      const cachedPrice = this.priceCache.getCachedPrice(productId);
      return cachedPrice || {};
    } catch (error) {
      console.warn('ProductService.getLastUsedPrices: Error getting cached prices', error);
      return {};
    }
  }
  subscribeToProducts(empresaId: string, callback: (products: Product[]) => void) {
    return subscribeToProducts(empresaId, callback);
  }
}
export default ProductService;