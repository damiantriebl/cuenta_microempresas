# Enhanced Data Models and Firebase Integration

This directory contains the complete data model definitions, validation logic, and Firebase integration utilities for the debt management application.

## Overview

The enhanced data models support a multi-company architecture where users can create or join companies, manage products and clients within those companies, and track detailed transaction histories with automatic debt calculations.

## File Structure

```
schemas/
├── index.ts              # Main exports and convenience functions
├── types.ts              # TypeScript interface definitions
├── validation.ts         # Data validation functions
├── firestore-utils.ts    # Firebase Firestore operations
├── business-logic.ts     # Debt calculation and business rules
└── README.md            # This documentation
```

## Data Model Architecture

### Core Entities

1. **Company** - The main organizational unit
2. **CompanyMember** - Users belonging to a company
3. **Product** - Items sold by the company
4. **Client** - Customers who purchase products
5. **TransactionEvent** - Sales and payment records

### Firestore Collection Structure

```
/usuarios/{userId}
  - User profile information
  /empresas/{empresaId}
    - User's company memberships

/empresas/{empresaId}
  - Company information
  /miembros/{userId}
    - Company member details
  /productos/{productoId}
    - Product catalog
  /clientes/{clienteId}
    - Client information
  /eventos/{eventoId}
    - Transaction events (sales/payments)

/solicitudes/{solicitudId}
  - Company join requests
```

## Key Features

### Enhanced Data Models

- **Type Safety**: Full TypeScript interfaces with strict typing
- **Validation**: Comprehensive validation functions for all data types
- **Business Logic**: Automatic debt calculation and payment splitting
- **Real-time Updates**: Firestore listeners for live data synchronization

### Security

- **Firestore Rules**: Comprehensive security rules in `firestore.rules`
- **Role-based Access**: Owner/member permissions for company operations
- **Data Validation**: Server-side validation through security rules

### Performance

- **Optimized Queries**: Proper indexing configuration in `firestore.indexes.json`
- **Efficient Listeners**: Targeted real-time subscriptions
- **Caching Support**: Local price caching for products

## Usage Examples

### Creating a Company

```typescript
import { createCompany, addUserCompanyMembership } from '@/schemas';

const companyData = {
  nombre: "Mi Empresa",
  propietario: userId
};

const empresaId = await createCompany(companyData, userId);
```

### Managing Products

```typescript
import { createProduct, getProducts, updateProduct } from '@/schemas';

// Create a product
const productData = {
  nombre: "Producto A",
  colorFondo: "#FF5733",
  posicion: 0,
  activo: true
};

const productId = await createProduct(empresaId, productData);

// Get all active products
const products = await getProducts(empresaId);
```

### Recording Transactions

```typescript
import { createSaleEvent, createPaymentEvent, calculateClientDebt } from '@/schemas';

// Record a sale
const saleData = {
  clienteId: "client123",
  producto: "Producto A",
  cantidad: 2,
  costoUnitario: 100,
  gananciaUnitaria: 50,
  totalVenta: 300,
  fecha: Timestamp.now()
};

await createSaleEvent(empresaId, saleData);

// Record a payment
const paymentData = {
  clienteId: "client123",
  montoPago: 150,
  fecha: Timestamp.now()
};

await createPaymentEvent(empresaId, paymentData);
```

### Calculating Debt

```typescript
import { getClientEvents, calculateClientDebt, formatTransactionHistory } from '@/schemas';

// Get client's transaction history
const events = await getClientEvents(empresaId, clientId);

// Calculate current debt
const debtCalculation = calculateClientDebt(events);

// Format for display
const formattedHistory = formatTransactionHistory(debtCalculation);
```

## Validation

All data models include comprehensive validation:

```typescript
import { validateClient, validateSaleEvent } from '@/schemas';

const clientData = {
  nombre: "Juan Pérez",
  direccion: "Calle 123",
  telefono: "+54911234567",
  oculto: false
};

const validation = validateClient(clientData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

## Real-time Updates

Subscribe to real-time data changes:

```typescript
import { subscribeToClients, subscribeToClientEvents } from '@/schemas';

// Subscribe to client list changes
const unsubscribe = subscribeToClients(empresaId, false, (clients) => {
  console.log('Updated clients:', clients);
});

// Subscribe to client transaction changes
const unsubscribeEvents = subscribeToClientEvents(empresaId, clientId, (events) => {
  const debtCalculation = calculateClientDebt(events);
  console.log('Current debt:', debtCalculation.totalDebt);
});
```

## Firebase Setup

### 1. Security Rules

Deploy the security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

### 2. Indexes

Deploy the index configuration:

```bash
firebase deploy --only firestore:indexes
```

### 3. Environment Configuration

The Firebase configuration is automatically loaded from `firebaseConfig.ts`. For development, you can enable emulators by uncommenting the emulator connection lines.

## Business Logic

### Debt Calculation

The system automatically calculates running debt totals:

- **Sales** increase debt
- **Payments** decrease debt
- **Zero Balance Points** are tracked for UI display
- **Overpayments** create favor balances

### Payment Splitting

When a payment exceeds the current debt:

1. First portion pays down the debt to zero
2. Remaining amount becomes a favor balance
3. Visual separators show the split in the UI

### Data Consistency

- All calculations maintain precision to avoid floating-point errors
- Transaction validation ensures data integrity
- Automatic recalculation when transactions are modified

## Migration from Legacy Schema

The new schema is designed to be compatible with existing data while providing enhanced functionality. Legacy interfaces (`clienteItf.ts`, `eventoTy.ts`) can be gradually migrated to the new types.

## Testing

The validation and business logic functions are designed to be easily testable:

```typescript
import { validateTransactionConsistency, calculateClientDebt } from '@/schemas';

// Test debt calculation
const events = [/* transaction events */];
const validation = validateTransactionConsistency(events);
const calculation = calculateClientDebt(events);
```

## Performance Considerations

- Use real-time listeners judiciously to avoid excessive reads
- Implement proper pagination for large datasets
- Cache frequently accessed data locally
- Use compound queries with proper indexes

## Security Considerations

- All operations require authentication
- Company-level permissions prevent unauthorized access
- Input validation prevents malicious data
- Audit trails track all changes