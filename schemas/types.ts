import { Timestamp } from "firebase/firestore";

// ============================================================================
// COMPANY INTERFACES
// ============================================================================

export interface Company {
  id: string;
  nombre: string;
  propietario: string; // userId of the owner
  creado: Timestamp;
  solicitudesAbiertas?: boolean; // Default true, allows join requests
}

export interface CompanyMember {
  userId: string;
  email: string;
  role: 'owner' | 'member';
  fechaIngreso: Timestamp;
}

// ============================================================================
// PRODUCT INTERFACES
// ============================================================================

export interface Product {
  id: string;
  nombre: string;
  colorFondo: string;
  posicion: number;
  ultimoCosto: number;    // REQUIRED: Unit cost
  ultimaGanancia: number; // REQUIRED: Unit profit
  activo: boolean;
  creado: Timestamp;
  actualizado?: Timestamp;
}

// Local cache for product prices
export interface ProductPriceCache {
  [productId: string]: {
    ultimoCosto: number;
    ultimaGanancia: number;
    fechaActualizacion: Timestamp;
  };
}

// ============================================================================
// MIGRATION INTERFACES
// ============================================================================

export interface MigrationStatus {
  empresaId: string;
  nombreAdded: boolean;
  productsValidated: boolean;
  backupCreated: boolean;
  migrationCompleted: boolean;
  errors: string[];
  timestamp: Timestamp;
}

export interface MigrationBackup {
  id: string;
  empresaId: string;
  backupData: {
    empresa: any;
    productos: any[];
  };
  creado: Timestamp;
  restored?: boolean;
}

export interface ProductMigrationData {
  id: string;
  nombre: string;
  colorFondo: string;
  posicion: number;
  ultimoCosto?: number; // Optional during migration
  ultimaGanancia?: number; // Optional during migration
  activo: boolean;
  creado: Timestamp;
  actualizado?: Timestamp;
  needsMigration: boolean;
}

export interface CompanyMigrationData {
  id: string;
  nombre?: string; // Optional during migration
  propietario: string;
  creado: Timestamp;
  needsMigration: boolean;
}

export interface MigrationRecovery {
  backupData: any[];
  rollbackSteps: string[];
  validationChecks: string[];
  manualSteps: string[];
}

// ============================================================================
// CLIENT INTERFACES
// ============================================================================

export interface Client {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string; // WhatsApp number
  notas?: string;
  fechaImportante?: Timestamp;
  oculto: boolean;
  deudaActual: number; // Calculated field, updated on transaction changes
  ultimaTransaccion?: Timestamp;
  creado: Timestamp;
  actualizado?: Timestamp;
}

// ============================================================================
// TRANSACTION EVENT INTERFACES
// ============================================================================

export interface BaseTransactionEvent {
  id: string;
  clienteId: string;
  fecha: Timestamp;
  notas?: string;
  creado: Timestamp;
  editado?: Timestamp;
  borrado: boolean;
}

export interface SaleEvent extends BaseTransactionEvent {
  tipo: 'venta';
  producto: string;
  productoColor?: string;
  cantidad: number;
  costoUnitario: number;
  gananciaUnitaria: number;
  totalVenta: number; // cantidad * (costoUnitario + gananciaUnitaria)
}

export interface PaymentEvent extends BaseTransactionEvent {
  tipo: 'pago';
  montoPago: number;
}

export type TransactionEvent = SaleEvent | PaymentEvent;

// ============================================================================
// COMPANY REQUEST INTERFACES
// ============================================================================

export interface CompanyJoinRequest {
  id: string;
  empresaId: string;
  solicitanteId: string;
  solicitanteEmail: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  creado: Timestamp;
  procesado?: Timestamp;
}

// ============================================================================
// USER INTERFACES
// ============================================================================

export interface UserProfile {
  id: string; // matches Firebase Auth UID
  email: string;
  creado: Timestamp;
  actualizado?: Timestamp;
}

export interface UserCompanyMembership {
  empresaId: string;
  role: 'owner' | 'member';
  fechaIngreso: Timestamp;
}

// ============================================================================
// UI SETTINGS INTERFACES
// ============================================================================

export interface UISettings {
  mostrarClientesOcultos: boolean;
  ordenClientes: 'nombre' | 'deuda' | 'ultimaTransaccion';
  temaOscuro: boolean;
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

export type ErrorType = 'validation' | 'network' | 'firestore' | 'permission' | 'unknown';

export interface ServiceError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
  code?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  errors?: string[]; // For backward compatibility
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// ============================================================================
// FIRESTORE COLLECTION PATHS
// ============================================================================

export const COLLECTIONS = {
  USUARIOS: 'usuarios',
  EMPRESAS: 'empresas',
  SOLICITUDES: 'solicitudes',
  // Sub-collections (relative to empresa)
  MIEMBROS: 'miembros',
  PRODUCTOS: 'productos', 
  CLIENTES: 'clientes',
  EVENTOS: 'eventos',
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isSaleEvent(event: any): event is SaleEvent {
  return !!(event && 
    typeof event === 'object' &&
    event.tipo === 'venta' &&
    typeof event.producto === 'string' &&
    typeof event.cantidad === 'number' &&
    typeof event.costoUnitario === 'number' &&
    typeof event.gananciaUnitaria === 'number' &&
    typeof event.totalVenta === 'number');
}

export function isPaymentEvent(event: any): event is PaymentEvent {
  return !!(event && 
    typeof event === 'object' &&
    event.tipo === 'pago' &&
    typeof event.montoPago === 'number');
}

/**
 * Type guard to check if an object has the structure of a transaction event
 */
export function isTransactionEvent(obj: any): obj is TransactionEvent {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.clienteId === 'string' &&
    (obj.tipo === 'venta' || obj.tipo === 'pago') &&
    obj.fecha &&
    typeof obj.borrado === 'boolean';
}

/**
 * Type guard to check if an object has the structure of a sale event
 */
export function isSaleEventData(obj: any): obj is SaleEvent {
  return isTransactionEvent(obj) &&
    obj.tipo === 'venta' &&
    typeof obj.producto === 'string' &&
    typeof obj.cantidad === 'number' &&
    typeof obj.costoUnitario === 'number' &&
    typeof obj.gananciaUnitaria === 'number' &&
    typeof obj.totalVenta === 'number';
}

/**
 * Type guard to check if an object has the structure of a payment event
 */
export function isPaymentEventData(obj: any): obj is PaymentEvent {
  return isTransactionEvent(obj) &&
    obj.tipo === 'pago' &&
    typeof obj.montoPago === 'number';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CreateCompanyData = Omit<Company, 'id' | 'creado'>;
export type CreateProductData = Omit<Product, 'id' | 'creado' | 'actualizado'>;
export type CreateClientData = Omit<Client, 'id' | 'deudaActual' | 'ultimaTransaccion' | 'creado' | 'actualizado'>;
export type CreateSaleEventData = Omit<SaleEvent, 'id' | 'creado' | 'editado' | 'borrado'>;
export type CreatePaymentEventData = Omit<PaymentEvent, 'id' | 'creado' | 'editado' | 'borrado'>;

export type UpdateProductData = Partial<Omit<Product, 'id' | 'creado'>>;
export type UpdateClientData = Partial<Omit<Client, 'id' | 'creado'>>;
export type UpdateTransactionEventData = Partial<Omit<TransactionEvent, 'id' | 'creado'>>;

// Migration utility types
export type MigrationProductData = Omit<ProductMigrationData, 'id' | 'creado' | 'actualizado' | 'needsMigration'>;
export type MigrationCompanyData = Omit<CompanyMigrationData, 'id' | 'creado' | 'needsMigration'>;
export type CreateMigrationStatusData = Omit<MigrationStatus, 'timestamp'>;
export type CreateMigrationBackupData = Omit<MigrationBackup, 'id' | 'creado' | 'restored'>;