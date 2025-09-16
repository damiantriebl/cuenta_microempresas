// ============================================================================
// MAIN EXPORTS - Enhanced Data Models and Firebase Integration
// ============================================================================

// Type definitions
export * from './types';

// Validation functions
export * from './validation';

// Firestore utilities and operations
export * from './firestore-utils';

// Business logic and calculations
export * from './business-logic';

// Event utilities and helpers
export * from './event-utils';

// Re-export commonly used Firebase types
export { Timestamp, FieldValue } from 'firebase/firestore';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Main interfaces for easy importing
export type {
  Company,
  CompanyMember,
  Product,
  Client,
  TransactionEvent,
  SaleEvent,
  PaymentEvent,
  CompanyJoinRequest,
  UserProfile,
  UserCompanyMembership,
  ValidationResult,
  ProductPriceCache,
  UISettings
} from './types';

// Main validation functions
export {
  validateCompany,
  validateProduct,
  validateClient,
  validateSaleEvent,
  validatePaymentEvent,
  validateTransactionEvent,
  validateCompanyJoinRequest,
  validateDebtCalculation
} from './validation';

// Main Firestore operations
export {
  // User operations
  createUserProfile,
  getUserProfile,
  addUserCompanyMembership,
  getUserCompanyMemberships,
  
  // Company operations
  createCompany,
  getCompany,
  getCompanyMembers,
  addCompanyMember,
  removeCompanyMember,
  
  // Product operations
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  
  // Client operations
  createClient,
  getClients,
  getClient,
  updateClient,
  updateClientDebt,
  
  // Transaction operations
  createSaleEvent,
  createPaymentEvent,
  getClientEvents,
  updateTransactionEvent,
  deleteTransactionEvent,
  
  // Join request operations
  createJoinRequest,
  getPendingJoinRequests,
  updateJoinRequestStatus,
  deleteJoinRequest,
  
  // Real-time subscriptions
  subscribeToCompanyMembers,
  subscribeToProducts,
  subscribeToClients,
  subscribeToClientEvents,
  subscribeToJoinRequests
} from './firestore-utils';

// Main business logic functions
export {
  calculateClientDebt,
  calculateSaleTotal,
  validateSaleTotal,
  splitPayment,
  recalculateClientDebt,
  formatTransactionHistory,
  extractProductPriceFromSale,
  validateTransactionConsistency,
  formatCurrency,
  formatDate,
  formatDateTime
} from './business-logic';

// Constants
export { COLLECTIONS } from './types';