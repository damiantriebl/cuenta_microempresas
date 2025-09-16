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
  calculateClientDebt,
  splitPayment,
  applyPaymentWithVisualization,
  calculateDebtImpact,
  detectZeroBalanceTransitions,
  formatTransactionHistory,
  validateTransactionConsistency
} from '../business-logic';
import {
  TransactionEvent,
  SaleEvent,
  PaymentEvent
} from '../types';

describe('Debt Calculation and Accumulation Logic', () => {
  const mockClientId = 'client-123';

  const createSaleEvent = (id: string, amount: number, dateOffset: number = 0): SaleEvent => ({
    id,
    clienteId: mockClientId,
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

  const createPaymentEvent = (id: string, amount: number, dateOffset: number = 0): PaymentEvent => ({
    id,
    clienteId: mockClientId,
    tipo: 'pago',
    fecha: {
      ...mockTimestamp,
      toMillis: () => Date.now() + dateOffset
    },
    montoPago: amount,
    creado: mockTimestamp,
    borrado: false
  });

  describe('Basic Debt Calculation', () => {
    test('calculates debt correctly with sales only', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createSaleEvent('2', 50, 2000),
        createSaleEvent('3', 75, 3000)
      ];

      const result = calculateClientDebt(events);
      
      expect(result.totalDebt).toBe(225);
      expect(result.favorBalance).toBe(0);
      expect(result.events).toHaveLength(3);
      expect(result.events[2].runningTotal).toBe(225); // Last event should have total debt
    });

    test('calculates debt correctly with sales and payments', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 30, 2000),
        createSaleEvent('3', 50, 3000),
        createPaymentEvent('4', 20, 4000)
      ];

      const result = calculateClientDebt(events);
      
      expect(result.totalDebt).toBe(100); // 100 - 30 + 50 - 20 = 100
      expect(result.favorBalance).toBe(0);
    });

    test('handles exact payment to zero', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 100, 2000)
      ];

      const result = calculateClientDebt(events);
      
      expect(result.totalDebt).toBe(0);
      expect(result.favorBalance).toBe(0);
      expect(result.zeroBalancePoints).toContain(1); // Second event (index 1) reaches zero
    });

    test('handles overpayment correctly', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 150, 2000)
      ];

      const result = calculateClientDebt(events);
      
      expect(result.totalDebt).toBe(0);
      expect(result.favorBalance).toBe(50);
      expect(result.zeroBalancePoints).toContain(1);
    });
  });

  describe('Payment Splitting Logic', () => {
    test('splits regular payment correctly', () => {
      const split = splitPayment(100, 60);
      
      expect(split.debtPayment).toBe(60);
      expect(split.favorPayment).toBe(0);
      expect(split.isOverpayment).toBe(false);
      expect(split.zeroBalanceReached).toBe(false);
    });

    test('splits exact payment correctly', () => {
      const split = splitPayment(100, 100);
      
      expect(split.debtPayment).toBe(100);
      expect(split.favorPayment).toBe(0);
      expect(split.isOverpayment).toBe(false);
      expect(split.zeroBalanceReached).toBe(true);
    });

    test('splits overpayment correctly', () => {
      const split = splitPayment(100, 150);
      
      expect(split.debtPayment).toBe(100);
      expect(split.favorPayment).toBe(50);
      expect(split.isOverpayment).toBe(true);
      expect(split.zeroBalanceReached).toBe(true);
    });

    test('handles payment when no debt exists', () => {
      const split = splitPayment(0, 50);
      
      expect(split.debtPayment).toBe(0);
      expect(split.favorPayment).toBe(50);
      expect(split.isOverpayment).toBe(true);
      expect(split.zeroBalanceReached).toBe(false); // No debt to pay off
    });
  });

  describe('Payment Visualization Logic', () => {
    test('creates correct visualization for regular payment', () => {
      const result = applyPaymentWithVisualization(100, 60);
      
      expect(result.displayEvents).toHaveLength(1);
      expect(result.displayEvents[0].type).toBe('payment');
      expect(result.displayEvents[0].amount).toBe(60);
    });

    test('creates correct visualization for exact payment', () => {
      const result = applyPaymentWithVisualization(100, 100);
      
      expect(result.displayEvents).toHaveLength(2);
      expect(result.displayEvents[0].type).toBe('payment');
      expect(result.displayEvents[0].amount).toBe(100);
      expect(result.displayEvents[1].type).toBe('zero-separator');
    });

    test('creates correct visualization for overpayment', () => {
      const result = applyPaymentWithVisualization(100, 150);
      
      expect(result.displayEvents).toHaveLength(3);
      expect(result.displayEvents[0].type).toBe('payment');
      expect(result.displayEvents[0].amount).toBe(100);
      expect(result.displayEvents[1].type).toBe('zero-separator');
      expect(result.displayEvents[2].type).toBe('favor');
      expect(result.displayEvents[2].amount).toBe(50);
    });
  });

  describe('Debt Impact Calculation', () => {
    test('calculates sale impact correctly', () => {
      const saleEvent = createSaleEvent('1', 100);
      const impact = calculateDebtImpact(50, saleEvent);
      
      expect(impact.newDebt).toBe(150);
      expect(impact.debtChange).toBe(100);
      expect(impact.reachesZero).toBe(false);
      expect(impact.createsOverpayment).toBe(false);
    });

    test('calculates payment impact that reaches zero', () => {
      const paymentEvent = createPaymentEvent('1', 100);
      const impact = calculateDebtImpact(100, paymentEvent);
      
      expect(impact.newDebt).toBe(0);
      expect(impact.debtChange).toBe(-100);
      expect(impact.reachesZero).toBe(true);
      expect(impact.createsOverpayment).toBe(false);
    });

    test('calculates payment impact that creates overpayment', () => {
      const paymentEvent = createPaymentEvent('1', 150);
      const impact = calculateDebtImpact(100, paymentEvent);
      
      expect(impact.newDebt).toBe(0); // Debt cannot be negative for display
      expect(impact.debtChange).toBe(-150);
      expect(impact.reachesZero).toBe(false); // Went past zero
      expect(impact.createsOverpayment).toBe(true);
    });
  });

  describe('Zero Balance Detection', () => {
    test('detects zero balance transitions correctly', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 100, 2000), // Reaches zero
        createSaleEvent('3', 50, 3000),     // From zero
        createPaymentEvent('4', 75, 4000)   // Through zero (overpayment)
      ];

      const calculation = calculateClientDebt(events);
      const transitions = detectZeroBalanceTransitions(calculation.events);
      
      expect(transitions.length).toBeGreaterThanOrEqual(3);
      
      // Find the specific transition types we expect
      const toZeroTransitions = transitions.filter(t => t.transitionType === 'to-zero');
      const fromZeroTransitions = transitions.filter(t => t.transitionType === 'from-zero');
      const throughZeroTransitions = transitions.filter(t => t.transitionType === 'through-zero');
      
      expect(toZeroTransitions.length).toBeGreaterThanOrEqual(1);
      expect(fromZeroTransitions.length).toBeGreaterThanOrEqual(1);
      expect(throughZeroTransitions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Transaction History Formatting', () => {
    test('formats simple transaction history correctly', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 60, 2000)
      ];

      const calculation = calculateClientDebt(events);
      const formatted = formatTransactionHistory(calculation);
      
      // Should be reversed (newest first)
      expect(formatted[0].type).toBe('transaction');
      expect(formatted[0].event?.tipo).toBe('pago');
      expect(formatted[1].type).toBe('transaction');
      expect(formatted[1].event?.tipo).toBe('venta');
    });

    test('formats history with zero balance correctly', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 100, 2000)
      ];

      const calculation = calculateClientDebt(events);
      const formatted = formatTransactionHistory(calculation);
      
      expect(formatted).toHaveLength(3); // Payment, zero separator, sale
      expect(formatted[1].type).toBe('zero-balance');
      expect(formatted[1].message).toBe('cuenta en 0');
    });
  });

  describe('Transaction Consistency Validation', () => {
    test('validates consistent transactions', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 60, 2000),
        createSaleEvent('3', 50, 3000)
      ];

      const validation = validateTransactionConsistency(events);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('detects inconsistent sale totals', () => {
      const invalidSale = createSaleEvent('1', 100, 1000);
      invalidSale.totalVenta = 999; // Wrong total
      
      const events: TransactionEvent[] = [invalidSale];
      const validation = validateTransactionConsistency(events);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('detects negative debt states', () => {
      const events: TransactionEvent[] = [
        createPaymentEvent('1', 100, 1000), // Payment without prior debt
        createSaleEvent('2', 50, 2000)
      ];

      const validation = validateTransactionConsistency(events);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Negative debt detected'))).toBe(true);
    });

    test('handles empty event list', () => {
      const validation = validateTransactionConsistency([]);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('handles deleted events correctly', () => {
      const deletedSale = createSaleEvent('1', 100, 1000);
      deletedSale.borrado = true;
      
      const events: TransactionEvent[] = [
        deletedSale,
        createPaymentEvent('2', 50, 2000) // This would create negative debt if deleted event was counted
      ];

      const validation = validateTransactionConsistency(events);
      
      expect(validation.isValid).toBe(false); // Should detect negative debt since sale is deleted
    });
  });

  describe('Currency and Date Formatting', () => {
    test('formats currency correctly', () => {
      const { formatCurrency } = require('../business-logic');
      
      expect(formatCurrency(100)).toMatch(/100/);
      expect(formatCurrency(1234.56)).toMatch(/1.*234.*56/);
      expect(formatCurrency(0)).toMatch(/0/);
    });

    test('formats dates correctly', () => {
      const { formatDate, formatDateTime } = require('../business-logic');
      
      const testDate = {
        ...mockTimestamp,
        toDate: () => new Date('2024-01-15T10:30:00')
      };
      
      const dateStr = formatDate(testDate);
      const dateTimeStr = formatDateTime(testDate);
      
      expect(dateStr).toContain('2024');
      expect(dateTimeStr).toContain('2024');
      expect(dateTimeStr).toContain('10:30');
    });
  });

  describe('Product Price Extraction', () => {
    test('extracts price information from sale event', () => {
      const { extractProductPriceFromSale } = require('../business-logic');
      
      const saleEvent = createSaleEvent('1', 100, 1000);
      const priceUpdate = extractProductPriceFromSale(saleEvent);
      
      expect(priceUpdate).not.toBeNull();
      expect(priceUpdate.productId).toBe('Test Product');
      expect(priceUpdate.ultimoCosto).toBe(60); // 100 * 0.6
      expect(priceUpdate.ultimaGanancia).toBe(40); // 100 * 0.4
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles floating point precision in debt calculation', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 0.1, 1000),
        createSaleEvent('2', 0.2, 2000),
        createPaymentEvent('3', 0.3, 3000) // Should reach exactly zero
      ];

      const result = calculateClientDebt(events);
      
      expect(Math.abs(result.totalDebt)).toBeLessThan(0.01);
      expect(result.zeroBalancePoints).toContain(2);
    });

    test('handles very large numbers', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 999999.99, 1000),
        createPaymentEvent('2', 500000, 2000)
      ];

      const result = calculateClientDebt(events);
      
      expect(result.totalDebt).toBeCloseTo(499999.99, 2);
      expect(result.favorBalance).toBe(0);
    });

    test('handles multiple rapid zero crossings', () => {
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, 1000),
        createPaymentEvent('2', 100, 2000), // Zero
        createSaleEvent('3', 50, 3000),     // From zero
        createPaymentEvent('4', 50, 4000),  // Back to zero
        createPaymentEvent('5', 25, 5000)   // Overpayment
      ];

      const result = calculateClientDebt(events);
      
      expect(result.totalDebt).toBe(0);
      expect(result.favorBalance).toBe(25);
      expect(result.zeroBalancePoints.length).toBeGreaterThanOrEqual(2);
    });

    test('handles events with same timestamp', () => {
      const sameTime = 1000;
      const events: TransactionEvent[] = [
        createSaleEvent('1', 100, sameTime),
        createPaymentEvent('2', 50, sameTime),
        createSaleEvent('3', 25, sameTime)
      ];

      const result = calculateClientDebt(events);
      
      expect(result.totalDebt).toBe(75); // Order should be maintained by creation order
    });
  });
});