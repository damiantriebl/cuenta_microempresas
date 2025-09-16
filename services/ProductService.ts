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
  getProducts as getProductsFromFirestore,
  updateProduct as updateProductInFirestore,
  deleteProduct as deleteProductInFirestore,
  subscribeToProducts
} from '@/schemas/firestore-utils';
import { savePriceToHistory } from '@/components/PriceHistoryTracker';

// ============================================================================
// PRODUCT PRICE CACHING (Simplified)
// ============================================================================

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
    this.cache[productId] = {
      ultimoCosto,
      ultimaGanancia,
      lastUpdated: new Date().toISOString()
    };
    this.saveCache();
  }

  clearCache(): void {
    this.cache = {};
    this.saveCache();
  }
}

// ============================================================================
// PRODUCT SERVICE (Simplified)
// ============================================================================

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

  /**
   * Create a new product
   */
  async createProduct(empresaId: string, productData: CreateProductData): Promise<ServiceResponse<string>> {
    const context = 'ProductService.createProduct';
    console.log(`${context}: Starting product creation`, {
      empresaId,
      productName: productData.nombre,
      ultimaCosto: productData.ultimoCosto,
      ultimaGanancia: productData.ultimaGanancia
    });

    try {
      // Step 1: Validate required fields
      if (!productData.nombre?.trim()) {
        return {
          success: false,
          errors: ['El nombre del producto es requerido']
        };
      }

      // Step 2: Validate complete product data
      const validation = validateProduct(productData);
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Step 3: Create product in Firestore
      const productId = await createProductInFirestore(empresaId, productData);

      // Step 4: Cache price data if provided
      if (productData.ultimoCosto !== undefined || productData.ultimaGanancia !== undefined) {
        try {
          this.priceCache.setCachedPrice(productId, productData.ultimoCosto, productData.ultimaGanancia);
        } catch (cacheError) {
          console.warn(`${context}: Price caching failed`, cacheError);
        }
      }

      // Step 5: Save to price history if needed
      if (productData.ultimoCosto !== undefined || productData.ultimaGanancia !== undefined) {
        try {
          await savePriceToHistory(productId, {
            ultimoCosto: productData.ultimoCosto,
            ultimaGanancia: productData.ultimaGanancia,
            timestamp: Timestamp.now()
          });
        } catch (historyError) {
          console.warn(`${context}: Price history save failed`, historyError);
        }
      }

      console.log(`${context}: Product created successfully`, { productId });
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

  /**
   * Get all products for a company
   */
  async getProducts(empresaId: string): Promise<ServiceResponse<Product[]>> {
    const context = 'ProductService.getProducts';
    
    try {
      const products = await getProductsFromFirestore(empresaId);
      
      console.log(`${context}: Retrieved ${products.length} products`, { empresaId });
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

  /**
   * Update an existing product
   */
  async updateProduct(empresaId: string, productId: string, updateData: UpdateProductData): Promise<ServiceResponse<void>> {
    const context = 'ProductService.updateProduct';
    
    try {
      // Validate update data
      if (updateData.nombre !== undefined) {
        const validation = validateProduct({ ...updateData, nombre: updateData.nombre } as CreateProductData);
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors
          };
        }
      }

      // Update in Firestore
      await updateProductInFirestore(empresaId, productId, updateData);

      // Update price cache if prices changed
      if (updateData.ultimoCosto !== undefined || updateData.ultimaGanancia !== undefined) {
        try {
          this.priceCache.setCachedPrice(productId, updateData.ultimoCosto, updateData.ultimaGanancia);
        } catch (cacheError) {
          console.warn(`${context}: Price caching failed`, cacheError);
        }
      }

      console.log(`${context}: Product updated successfully`, { productId });
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

  /**
   * Delete a product
   */
  async deleteProduct(empresaId: string, productId: string): Promise<ServiceResponse<void>> {
    const context = 'ProductService.deleteProduct';
    
    try {
      await deleteProductInFirestore(empresaId, productId);
      
      console.log(`${context}: Product deleted successfully`, { productId });
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

  /**
   * Move product position
   */
  async moveProduct(empresaId: string, productId: string, fromIndex: number, toIndex: number, sortedProducts: Product[]): Promise<ServiceResponse<void>> {
    const context = 'ProductService.moveProduct';
    
    try {
      // Simple position update - just update the moved product's position
      const updateData: UpdateProductData = {
        posicion: toIndex
      };

      await updateProductInFirestore(empresaId, productId, updateData);

      console.log(`${context}: Product moved successfully`, { productId, fromIndex, toIndex });
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

  /**
   * Check product dependencies before deletion
   */
  async checkProductDependencies(empresaId: string, productId: string): Promise<{
    hasTransactions: boolean;
    transactionCount: number;
  }> {
    // Simplified - just return no dependencies for now
    return {
      hasTransactions: false,
      transactionCount: 0
    };
  }

  /**
   * Get cached prices for a product
   */
  getLastUsedPrices(productId: string): { ultimoCosto?: number; ultimaGanancia?: number } {
    try {
      const cachedPrice = this.priceCache.getCachedPrice(productId);
      return cachedPrice || {};
    } catch (error) {
      console.warn('ProductService.getLastUsedPrices: Error getting cached prices', error);
      return {};
    }
  }

  /**
   * Subscribe to product changes
   */
  subscribeToProducts(empresaId: string, callback: (products: Product[]) => void) {
    return subscribeToProducts(empresaId, callback);
  }
}

export default ProductService;