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
  calculateSaleTotal,
} from '../event-utils';
import {
  validateSaleEvent,
  validatePaymentEvent,
} from '../validation';
import {
  isSaleEvent,
  isPaymentEvent,
  CreateSaleEventData,
  CreatePaymentEventData
} from '../types';

describe('Transaction Event Data Models and Validation', () => {
  const mockClientId = 'client-123';

  describe('Sale Total Calculation', () => {
    test('calculateSaleTotal calculates correctly', () => {
      expect(calculateSaleTotal(2, 10, 5)).toBe(30);
      expect(calculateSaleTotal(1, 0, 10)).toBe(10);
      expect(calculateSaleTotal(3, 5.5, 2.5)).toBe(24);
    });
  });

  describe('Validation Functions', () => {
    test('validateSaleEvent validates correct sale event', () => {
      const saleData: CreateSaleEventData = {
        clienteId: mockClientId,
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 2,
        costoUnitario: 10,
        gananciaUnitaria: 5,
        totalVenta: 30
      };

      const validation = validateSaleEvent(saleData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('validateSaleEvent catches invalid data', () => {
      const invalidSaleData: CreateSaleEventData = {
        clienteId: '',
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: '',
        cantidad: -1,
        costoUnitario: -5,
        gananciaUnitaria: -2,
        totalVenta: -14
      };

      const validation = validateSaleEvent(invalidSaleData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('validatePaymentEvent validates correct payment event', () => {
      const paymentData: CreatePaymentEventData = {
        clienteId: mockClientId,
        tipo: 'pago',
        fecha: mockTimestamp,
        montoPago: 100
      };

      const validation = validatePaymentEvent(paymentData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('validatePaymentEvent catches invalid data', () => {
      const invalidPaymentData: CreatePaymentEventData = {
        clienteId: '',
        tipo: 'pago',
        fecha: mockTimestamp,
        montoPago: -50
      };

      const validation = validatePaymentEvent(invalidPaymentData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Type Guards', () => {
    test('isSaleEvent correctly identifies sale events', () => {
      const saleEvent = {
        id: '1',
        clienteId: mockClientId,
        tipo: 'venta' as const,
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 1,
        costoUnitario: 10,
        gananciaUnitaria: 5,
        totalVenta: 15,
        creado: mockTimestamp,
        borrado: false
      };

      expect(isSaleEvent(saleEvent)).toBe(true);
      expect(isPaymentEvent(saleEvent)).toBe(false);
    });

    test('isPaymentEvent correctly identifies payment events', () => {
      const paymentEvent = {
        id: '2',
        clienteId: mockClientId,
        tipo: 'pago' as const,
        fecha: mockTimestamp,
        montoPago: 100,
        creado: mockTimestamp,
        borrado: false
      };

      expect(isPaymentEvent(paymentEvent)).toBe(true);
      expect(isSaleEvent(paymentEvent)).toBe(false);
    });

    test('type guards handle invalid objects', () => {
      const invalidEvent = {
        id: '3',
        tipo: 'invalid' as any
      };

      expect(isSaleEvent(invalidEvent)).toBe(false);
      expect(isPaymentEvent(invalidEvent)).toBe(false);
    });

    test('type guards handle null and undefined', () => {
      expect(isSaleEvent(null)).toBe(false);
      expect(isSaleEvent(undefined)).toBe(false);
      expect(isPaymentEvent(null)).toBe(false);
      expect(isPaymentEvent(undefined)).toBe(false);
    });

    test('type guards handle objects with missing required fields', () => {
      const incompleteEvent = {
        id: '4',
        tipo: 'venta' as const,
        // Missing required fields like producto, cantidad, etc.
      };

      expect(isSaleEvent(incompleteEvent)).toBe(false);
    });
  });

  describe('Advanced Sale Total Calculations', () => {
    test('handles decimal quantities', () => {
      expect(calculateSaleTotal(2.5, 10, 5)).toBe(37.5);
      expect(calculateSaleTotal(0.5, 20, 10)).toBe(15);
    });

    test('handles zero values correctly', () => {
      expect(calculateSaleTotal(1, 0, 10)).toBe(10); // Free product with profit
      expect(calculateSaleTotal(1, 10, 0)).toBe(10); // Cost price only
      expect(calculateSaleTotal(0, 10, 5)).toBe(0);  // Zero quantity
    });

    test('handles very small decimal values', () => {
      expect(calculateSaleTotal(1, 0.01, 0.01)).toBe(0.02);
      expect(calculateSaleTotal(100, 0.001, 0.001)).toBe(0.2);
    });

    test('handles large numbers', () => {
      expect(calculateSaleTotal(1000, 999.99, 0.01)).toBe(1000000);
    });
  });

  describe('Enhanced Validation Edge Cases', () => {
    test('validateSaleEvent handles floating point precision', () => {
      const saleData: CreateSaleEventData = {
        clienteId: mockClientId,
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 3,
        costoUnitario: 0.1,
        gananciaUnitaria: 0.2,
        totalVenta: 0.9000000000000001 // Floating point imprecision
      };

      const validation = validateSaleEvent(saleData);
      expect(validation.isValid).toBe(true); // Should handle small floating point errors
    });

    test('validateSaleEvent rejects significant calculation errors', () => {
      const saleData: CreateSaleEventData = {
        clienteId: mockClientId,
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 2,
        costoUnitario: 10,
        gananciaUnitaria: 5,
        totalVenta: 25 // Should be 30, error > 0.01
      };

      const validation = validateSaleEvent(saleData);
      expect(validation.isValid).toBe(false);
    });

    test('validatePaymentEvent handles edge cases', () => {
      const validCases = [
        { montoPago: 0.01 }, // Minimum valid payment
        { montoPago: 999999.99 }, // Large payment
        { montoPago: 100.005 } // Precision test
      ];

      for (const testCase of validCases) {
        const paymentData: CreatePaymentEventData = {
          clienteId: mockClientId,
          tipo: 'pago',
          fecha: mockTimestamp,
          ...testCase
        };

        const validation = validatePaymentEvent(paymentData);
        expect(validation.isValid).toBe(true);
      }
    });

    test('validation handles special characters in text fields', () => {
      const saleData: CreateSaleEventData = {
        clienteId: mockClientId,
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Café & Té (Especial) - 500g',
        cantidad: 1,
        costoUnitario: 10,
        gananciaUnitaria: 5,
        totalVenta: 15,
        notas: 'Cliente VIP ⭐ - Descuento aplicado 💰'
      };

      const validation = validateSaleEvent(saleData);
      expect(validation.isValid).toBe(true);
    });

    test('validation handles empty and whitespace-only strings', () => {
      const invalidSaleData: CreateSaleEventData = {
        clienteId: '   ', // Whitespace only
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: '', // Empty
        cantidad: 1,
        costoUnitario: 10,
        gananciaUnitaria: 5,
        totalVenta: 15
      };

      const validation = validateSaleEvent(invalidSaleData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Data Model Consistency', () => {
    test('sale event maintains data integrity', () => {
      const saleData: CreateSaleEventData = {
        clienteId: mockClientId,
        tipo: 'venta',
        fecha: mockTimestamp,
        producto: 'Test Product',
        cantidad: 2,
        costoUnitario: 15.50,
        gananciaUnitaria: 4.50,
        totalVenta: 40 // 2 * (15.50 + 4.50)
      };

      const validation = validateSaleEvent(saleData);
      expect(validation.isValid).toBe(true);
      
      // Verify calculation matches
      const calculatedTotal = calculateSaleTotal(
        saleData.cantidad,
        saleData.costoUnitario,
        saleData.gananciaUnitaria
      );
      expect(calculatedTotal).toBe(saleData.totalVenta);
    });

    test('payment event maintains simplicity', () => {
      const paymentData: CreatePaymentEventData = {
        clienteId: mockClientId,
        tipo: 'pago',
        fecha: mockTimestamp,
        montoPago: 150.75,
        notas: 'Transferencia bancaria'
      };

      const validation = validatePaymentEvent(paymentData);
      expect(validation.isValid).toBe(true);
    });
  });
});