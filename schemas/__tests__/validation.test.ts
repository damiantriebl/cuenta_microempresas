// Mock Firebase Timestamp for testing
const mockTimestamp = {
  toMillis: () => Date.now(),
  toDate: () => new Date(),
  now: () => mockTimestamp,
  fromDate: (date: Date) => ({
    toMillis: () => date.getTime(),
    toDate: () => date,
    now: () => mockTimestamp,
    fromDate: mockTimestamp.fromDate
  })
};

// Mock Firebase module
jest.mock('firebase/firestore', () => ({
  Timestamp: mockTimestamp
}));

import {
  validateCompany,
  validateProduct,
  validateClient,
  validateSaleEvent,
  validatePaymentEvent,
  validateTransactionEvent,
  validateCompanyJoinRequest,
  validateDebtCalculation
} from '../validation';
import {
  CreateCompanyData,
  CreateProductData,
  CreateClientData,
  CreateSaleEventData,
  CreatePaymentEventData,
  TransactionEvent,
  CompanyJoinRequest
} from '../types';

describe('Validation Functions', () => {
  describe('Company Validation', () => {
    test('validates correct company data', () => {
      const companyData: CreateCompanyData = {
        nombre: 'Test Company',
        propietario: 'owner-123'
      };

      const result = validateCompany(companyData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects empty company name', () => {
      const companyData: CreateCompanyData = {
        nombre: '',
        propietario: 'owner-123'
      };

      const result = validateCompany(companyData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El nombre de la empresa es requerido');
    });

    test('rejects company name that is too long', () => {
      const companyData: CreateCompanyData = {
        nombre: 'A'.repeat(101), // 101 characters
        propietario: 'owner-123'
      };

      const result = validateCompany(companyData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El nombre de la empresa no puede exceder 100 caracteres');
    });

    test('rejects empty propietario', () => {
      const companyData: CreateCompanyData = {
        nombre: 'Test Company',
        propietario: ''
      };

      const result = validateCompany(companyData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El propietario de la empresa es requerido');
    });

    test('handles whitespace-only names', () => {
      const companyData: CreateCompanyData = {
        nombre: '   ',
        propietario: '   '
      };

      const result = validateCompany(companyData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El nombre de la empresa es requerido');
      expect(result.errors).toContain('El propietario de la empresa es requerido');
    });
  });

  describe('Product Validation', () => {
    test('validates correct product data', () => {
      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: 1,
        ultimoCosto: 10.50,
        ultimaGanancia: 5.25,
        activo: true
      };

      const result = validateProduct(productData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid color format', () => {
      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: 'red', // Invalid format
        posicion: 1,
        activo: true
      };

      const result = validateProduct(productData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El color de fondo debe ser un código hexadecimal válido (ej: #FF0000)');
    });

    test('accepts short hex colors', () => {
      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#F00', // Short format should be valid
        posicion: 1,
        activo: true
      };

      const result = validateProduct(productData);
      
      expect(result.isValid).toBe(true);
    });

    test('rejects negative position', () => {
      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: -1,
        activo: true
      };

      const result = validateProduct(productData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La posición debe ser un número mayor o igual a 0');
    });

    test('rejects negative costs and profits', () => {
      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: 1,
        ultimoCosto: -5,
        ultimaGanancia: -2,
        activo: true
      };

      const result = validateProduct(productData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El último costo debe ser un número mayor o igual a 0');
      expect(result.errors).toContain('La última ganancia debe ser un número mayor o igual a 0');
    });

    test('handles optional fields correctly', () => {
      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: 1,
        activo: true
        // ultimoCosto and ultimaGanancia are undefined
      };

      const result = validateProduct(productData);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Client Validation', () => {
    test('validates correct client data', () => {
      const clientData: CreateClientData = {
        nombre: 'Juan Pérez',
        direccion: 'Av. Corrientes 1234',
        telefono: '+54 11 1234-5678',
        notas: 'Cliente frecuente',
        fechaImportante: mockTimestamp,
        oculto: false
      };

      const result = validateClient(clientData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid phone numbers', () => {
      const clientData: CreateClientData = {
        nombre: 'Juan Pérez',
        direccion: 'Av. Corrientes 1234',
        telefono: 'abc123', // Invalid phone
        oculto: false
      };

      const result = validateClient(clientData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El teléfono debe ser un número válido');
    });

    test('accepts various phone formats', () => {
      const validPhones = [
        '+54 11 1234-5678',
        '11 1234 5678',
        '(011) 1234-5678',
        '1112345678'
      ];

      for (const phone of validPhones) {
        const clientData: CreateClientData = {
          nombre: 'Juan Pérez',
          direccion: 'Av. Corrientes 1234',
          telefono: phone,
          oculto: false
        };

        const result = validateClient(clientData);
        expect(result.isValid).toBe(true);
      }
    });

    test('rejects too long notes', () => {
      const clientData: CreateClientData = {
        nombre: 'Juan Pérez',
        direccion: 'Av. Corrientes 1234',
        telefono: '1112345678',
        notas: 'A'.repeat(501), // Too long
        oculto: false
      };

      const result = validateClient(clientData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Las notas no pueden exceder 500 caracteres');
    });

    test('requires all mandatory fields', () => {
      const clientData: CreateClientData = {
        nombre: '',
        direccion: '',
        telefono: '',
        oculto: false
      };

      const result = validateClient(clientData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El nombre del cliente es requerido');
      expect(result.errors).toContain('La dirección del cliente es requerida');
      expect(result.errors).toContain('El teléfono del cliente es requerido');
    });
  });

  describe('Sale Event Validation', () => {
    test('validates correct sale event', () => {
      const saleData: CreateSaleEventData = {
        clienteId: 'client-123',
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 2,
        costoUnitario: 10,
        gananciaUnitaria: 5,
        totalVenta: 30, // 2 * (10 + 5)
        productoColor: '#FF0000',
        notas: 'Test sale'
      };

      const result = validateSaleEvent(saleData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects incorrect total calculation', () => {
      const saleData: CreateSaleEventData = {
        clienteId: 'client-123',
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 2,
        costoUnitario: 10,
        gananciaUnitaria: 5,
        totalVenta: 25 // Wrong! Should be 30
      };

      const result = validateSaleEvent(saleData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El total de venta no coincide con el cálculo (cantidad × (costo + ganancia))');
    });

    test('rejects negative values', () => {
      const saleData: CreateSaleEventData = {
        clienteId: 'client-123',
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: -1,
        costoUnitario: -10,
        gananciaUnitaria: -5,
        totalVenta: -30
      };

      const result = validateSaleEvent(saleData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La cantidad debe ser un número mayor a 0');
      expect(result.errors).toContain('El costo unitario debe ser un número mayor o igual a 0');
      expect(result.errors).toContain('La ganancia unitaria debe ser un número mayor o igual a 0');
      expect(result.errors).toContain('El total de venta debe ser un número mayor a 0');
    });

    test('allows zero cost or profit', () => {
      const saleData: CreateSaleEventData = {
        clienteId: 'client-123',
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 1,
        costoUnitario: 0, // Free product
        gananciaUnitaria: 10,
        totalVenta: 10
      };

      const result = validateSaleEvent(saleData);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Payment Event Validation', () => {
    test('validates correct payment event', () => {
      const paymentData: CreatePaymentEventData = {
        clienteId: 'client-123',
        tipo: 'pago',
        fecha: mockTimestamp,
        montoPago: 100.50,
        notas: 'Cash payment'
      };

      const result = validatePaymentEvent(paymentData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects zero or negative payment', () => {
      const paymentData: CreatePaymentEventData = {
        clienteId: 'client-123',
        tipo: 'pago',
        fecha: mockTimestamp,
        montoPago: 0
      };

      const result = validatePaymentEvent(paymentData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El monto del pago debe ser un número mayor a 0');
    });

    test('handles optional notes', () => {
      const paymentData: CreatePaymentEventData = {
        clienteId: 'client-123',
        tipo: 'pago',
        fecha: mockTimestamp,
        montoPago: 100
        // No notes
      };

      const result = validatePaymentEvent(paymentData);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Company Join Request Validation', () => {
    test('validates correct join request', () => {
      const requestData: Omit<CompanyJoinRequest, 'id' | 'creado'> = {
        empresaId: 'company-123',
        solicitanteId: 'user-456',
        solicitanteEmail: 'user@example.com',
        estado: 'pendiente'
      };

      const result = validateCompanyJoinRequest(requestData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid email', () => {
      const requestData: Omit<CompanyJoinRequest, 'id' | 'creado'> = {
        empresaId: 'company-123',
        solicitanteId: 'user-456',
        solicitanteEmail: 'invalid-email',
        estado: 'pendiente'
      };

      const result = validateCompanyJoinRequest(requestData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El email del solicitante debe ser válido');
    });

    test('rejects invalid estado', () => {
      const requestData: Omit<CompanyJoinRequest, 'id' | 'creado'> = {
        empresaId: 'company-123',
        solicitanteId: 'user-456',
        solicitanteEmail: 'user@example.com',
        estado: 'invalid' as any
      };

      const result = validateCompanyJoinRequest(requestData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El estado debe ser: pendiente, aceptada o rechazada');
    });
  });

  describe('Debt Calculation Validation', () => {
    const createSaleEvent = (id: string, amount: number, dateOffset: number = 0): TransactionEvent => ({
      id,
      clienteId: 'client-123',
      tipo: 'venta',
      fecha: {
        ...mockTimestamp,
        toMillis: () => Date.now() + dateOffset
      },
      producto: 'Test Product',
      cantidad: 1,
      costoUnitario: amount * 0.6,
      gananciaUnitaria: amount * 0.4,
      totalVenta: amount,
      creado: mockTimestamp,
      borrado: false
    });

    const createPaymentEvent = (id: string, amount: number, dateOffset: number = 0): TransactionEvent => ({
      id,
      clienteId: 'client-123',
      tipo: 'pago',
      fecha: {
        ...mockTimestamp,
        toMillis: () => Date.now() + dateOffset
      },
      montoPago: amount,
      creado: mockTimestamp,
      borrado: false
    });

    test('validates consistent debt calculation', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 60, 2000),
        createSaleEvent('3', 50, 3000)
      ];

      const result = validateDebtCalculation(events);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects overpayment scenarios', () => {
      const events: TransactionEvent[] = [
        createPaymentEvent('1', 100, 1000), // Payment without debt
        createSaleEvent('2', 50, 2000)
      ];

      const result = validateDebtCalculation(events);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Pago excesivo detectado'))).toBe(true);
    });

    test('handles empty event list', () => {
      const result = validateDebtCalculation([]);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('ignores deleted events', () => {
      const deletedSale = createSaleEvent('1', 100, 1000);
      deletedSale.borrado = true;
      
      const events: TransactionEvent[] = [
        deletedSale,
        createPaymentEvent('2', 50, 2000)
      ];

      const result = validateDebtCalculation(events);
      
      expect(result.isValid).toBe(false); // Should detect overpayment since sale is deleted
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles null and undefined values gracefully', () => {
      const invalidCompany = {
        nombre: null as any,
        propietario: undefined as any
      };

      const result = validateCompany(invalidCompany);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('handles special characters in names', () => {
      const clientData: CreateClientData = {
        nombre: 'José María Ñoño',
        direccion: 'Calle Ñandú 123, 1° "A"',
        telefono: '1112345678',
        oculto: false
      };

      const result = validateClient(clientData);
      
      expect(result.isValid).toBe(true);
    });

    test('handles very long valid inputs at boundary', () => {
      const clientData: CreateClientData = {
        nombre: 'A'.repeat(100), // Exactly at limit
        direccion: 'B'.repeat(200), // Exactly at limit
        telefono: '1112345678',
        notas: 'C'.repeat(500), // Exactly at limit
        oculto: false
      };

      const result = validateClient(clientData);
      
      expect(result.isValid).toBe(true);
    });

    test('handles floating point precision in sale totals', () => {
      const saleData: CreateSaleEventData = {
        clienteId: 'client-123',
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 3,
        costoUnitario: 0.1,
        gananciaUnitaria: 0.2,
        totalVenta: 0.9 // 3 * (0.1 + 0.2) = 0.8999999999999999 due to floating point
      };

      const result = validateSaleEvent(saleData);
      
      expect(result.isValid).toBe(true); // Should handle floating point precision
    });
  });
});