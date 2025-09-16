import { Timestamp } from 'firebase/firestore';
import { TransactionEvent, SaleEvent } from './types';
import { isSaleEvent, isPaymentEvent } from './types';

// ============================================================================
// DEBT CALCULATION UTILITIES
// ============================================================================

export interface DebtCalculationResult {
  totalDebt: number;
  events: TransactionEventWithRunningTotal[];
  zeroBalancePoints: number[]; // Indices where debt reaches zero
  favorBalance: number; // Positive balance (client overpaid)
}

export interface TransactionEventWithRunningTotal {
  id: string;
  clienteId: string;
  fecha: Timestamp;
  notas?: string;
  creado: Timestamp;
  editado?: Timestamp;
  borrado: boolean;
  tipo: 'venta' | 'pago';
  
  // Sale event fields (optional)
  producto?: string;
  productoColor?: string;
  cantidad?: number;
  costoUnitario?: number;
  gananciaUnitaria?: number;
  totalVenta?: number;
  
  // Payment event fields (optional)
  montoPago?: number;
  
  // Running total fields
  runningTotal: number;
  isZeroBalance: boolean;
}

/**
 * Calculate running debt totals for a client's transaction history
 * Events should be sorted by date (oldest first) for accurate calculation
 */
export function calculateClientDebt(events: TransactionEvent[]): DebtCalculationResult {
  // Debug logging
  console.log('calculateClientDebt called with:', {
    events,
    isArray: Array.isArray(events),
    length: events?.length,
    type: typeof events
  });

  // Validate input
  if (!events) {
    console.error('calculateClientDebt: events is null or undefined');
    return {
      totalDebt: 0,
      events: [],
      zeroBalancePoints: [],
      favorBalance: 0
    };
  }

  if (!Array.isArray(events)) {
    console.error('calculateClientDebt: events is not an array', { events, type: typeof events });
    return {
      totalDebt: 0,
      events: [],
      zeroBalancePoints: [],
      favorBalance: 0
    };
  }

  // Coerce any serialized timestamps to Firebase Timestamp
  const toTimestamp = (value: any): Timestamp => {
    if (!value) return Timestamp.fromMillis(0);
    if (value instanceof Timestamp) return value;
    if (typeof value === 'object' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
      return new Timestamp(value.seconds, value.nanoseconds);
    }
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }
    if (typeof value === 'number') {
      return Timestamp.fromMillis(value);
    }
    return Timestamp.fromMillis(0);
  };

  const normalizedEvents: TransactionEvent[] = (events || []).map((e) => ({
    ...e,
    fecha: toTimestamp((e as any).fecha),
    creado: toTimestamp((e as any).creado),
    editado: (e as any).editado ? toTimestamp((e as any).editado) : undefined,
  }));

  // Sort events by date (oldest first) to ensure proper calculation order
  const sortedEvents = [...normalizedEvents]
    .filter(event => !event.borrado)
    .sort((a, b) => a.fecha.toMillis() - b.fecha.toMillis());

  let runningTotal = 0;
  const eventsWithTotals: TransactionEventWithRunningTotal[] = [];
  const zeroBalancePoints: number[] = [];

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const previousTotal = runningTotal;
    
    if (isSaleEvent(event)) {
      runningTotal += event.totalVenta;
    } else if (isPaymentEvent(event)) {
      runningTotal -= event.montoPago;
    }

    const isZeroBalance = Math.abs(runningTotal) < 0.01; // Account for floating point precision
    
    const eventWithTotal: TransactionEventWithRunningTotal = {
      id: event.id,
      clienteId: event.clienteId,
      fecha: event.fecha,
      notas: event.notas,
      creado: event.creado,
      editado: event.editado,
      borrado: event.borrado,
      tipo: event.tipo,
      runningTotal,
      isZeroBalance
    };

    // Add type-specific fields
    if (isSaleEvent(event)) {
      eventWithTotal.producto = event.producto;
      eventWithTotal.productoColor = event.productoColor;
      eventWithTotal.cantidad = event.cantidad;
      eventWithTotal.costoUnitario = event.costoUnitario;
      eventWithTotal.gananciaUnitaria = event.gananciaUnitaria;
      eventWithTotal.totalVenta = event.totalVenta;
    } else if (isPaymentEvent(event)) {
      eventWithTotal.montoPago = event.montoPago;
    }

    eventsWithTotals.push(eventWithTotal);

    // Check if this event brought the balance to zero or crossed zero
    if (isZeroBalance || (previousTotal > 0.01 && runningTotal < -0.01)) {
      zeroBalancePoints.push(i);
    }
  }

  const finalDebt = runningTotal;
  const favorBalance = finalDebt < 0 ? Math.abs(finalDebt) : 0;

  return {
    totalDebt: Math.max(0, finalDebt), // Debt cannot be negative
    events: eventsWithTotals,
    zeroBalancePoints,
    favorBalance
  };
}

/**
 * Calculate the total sale amount for a sale event
 */
export function calculateSaleTotal(
  cantidad: number, 
  costoUnitario: number, 
  gananciaUnitaria: number
): number {
  return cantidad * (costoUnitario + gananciaUnitaria);
}

/**
 * Validate that a sale event's total matches the calculated amount
 */
export function validateSaleTotal(saleEvent: SaleEvent): boolean {
  const expectedTotal = calculateSaleTotal(
    saleEvent.cantidad, 
    saleEvent.costoUnitario, 
    saleEvent.gananciaUnitaria
  );
  return Math.abs(saleEvent.totalVenta - expectedTotal) < 0.01;
}

// ============================================================================
// PAYMENT SPLITTING LOGIC
// ============================================================================

export interface PaymentSplit {
  debtPayment: number; // Amount that goes toward existing debt
  favorPayment: number; // Amount that creates favor balance
  isOverpayment: boolean;
  zeroBalanceReached: boolean; // Whether this payment brings debt to exactly zero
}

/**
 * Split a payment between debt reduction and favor balance
 */
export function splitPayment(currentDebt: number, paymentAmount: number): PaymentSplit {
  const zeroBalanceReached = Math.abs(paymentAmount - currentDebt) < 0.01;
  
  if (currentDebt <= 0.01) {
    // No debt exists - entire payment becomes favor
    return {
      debtPayment: 0,
      favorPayment: paymentAmount,
      isOverpayment: true,
      zeroBalanceReached: false // No debt to reach zero from
    };
  } else if (paymentAmount <= currentDebt) {
    return {
      debtPayment: paymentAmount,
      favorPayment: 0,
      isOverpayment: false,
      zeroBalanceReached
    };
  } else {
    return {
      debtPayment: currentDebt,
      favorPayment: paymentAmount - currentDebt,
      isOverpayment: true,
      zeroBalanceReached: true // There was debt and we paid it off
    };
  }
}

/**
 * Apply payment logic with visual separation for overpayments
 * Returns information needed for UI display
 */
export function applyPaymentWithVisualization(
  currentDebt: number, 
  paymentAmount: number
): {
  split: PaymentSplit;
  displayEvents: Array<{
    type: 'payment' | 'zero-separator' | 'favor';
    amount?: number;
    message?: string;
  }>;
} {
  const split = splitPayment(currentDebt, paymentAmount);
  const displayEvents: Array<{
    type: 'payment' | 'zero-separator' | 'favor';
    amount?: number;
    message?: string;
  }> = [];

  if (split.isOverpayment && split.debtPayment > 0) {
    // Payment that pays off debt and creates favor
    displayEvents.push({
      type: 'payment',
      amount: split.debtPayment,
      message: `Pago aplicado a deuda`
    });
    
    displayEvents.push({
      type: 'zero-separator',
      message: 'cuenta en 0'
    });
    
    displayEvents.push({
      type: 'favor',
      amount: split.favorPayment,
      message: 'saldo a favor'
    });
  } else if (split.zeroBalanceReached) {
    // Payment that exactly pays off debt
    displayEvents.push({
      type: 'payment',
      amount: paymentAmount,
      message: 'Pago recibido'
    });
    
    displayEvents.push({
      type: 'zero-separator',
      message: 'cuenta en 0'
    });
  } else {
    // Regular payment (partial or when no debt exists)
    displayEvents.push({
      type: 'payment',
      amount: paymentAmount,
      message: 'Pago recibido'
    });
  }

  return { split, displayEvents };
}

// ============================================================================
// CLIENT DEBT UPDATE UTILITIES
// ============================================================================

/**
 * Recalculate and update a client's debt based on all their transactions
 */
export async function recalculateClientDebt(
  events: TransactionEvent[]
): Promise<{ newDebt: number; lastTransactionDate?: Timestamp }> {
  const calculation = calculateClientDebt(events);
  
  // Find the most recent transaction date
  const lastTransactionDate = events.length > 0 
    ? events.reduce((latest, event) => 
        event.fecha.toMillis() > latest.toMillis() ? event.fecha : latest
      , events[0].fecha)
    : undefined;

  return {
    newDebt: calculation.totalDebt - calculation.favorBalance, // Net debt (can be negative for favor)
    lastTransactionDate
  };
}

/**
 * Calculate debt impact of adding a new transaction
 */
export function calculateDebtImpact(
  currentDebt: number,
  newEvent: TransactionEvent
): {
  newDebt: number;
  debtChange: number;
  reachesZero: boolean;
  createsOverpayment: boolean;
} {
  let debtChange = 0;
  
  if (isSaleEvent(newEvent)) {
    debtChange = newEvent.totalVenta;
  } else if (isPaymentEvent(newEvent)) {
    debtChange = -newEvent.montoPago;
  }
  
  const newDebt = currentDebt + debtChange;
  const reachesZero = currentDebt > 0 && Math.abs(newDebt) < 0.01;
  const createsOverpayment = currentDebt > 0 && newDebt < -0.01;
  
  return {
    newDebt: Math.max(0, newDebt), // Debt cannot be negative for display
    debtChange,
    reachesZero,
    createsOverpayment
  };
}

/**
 * Detect zero-balance transitions in a sequence of events
 */
export function detectZeroBalanceTransitions(
  events: TransactionEventWithRunningTotal[]
): Array<{
  eventIndex: number;
  previousDebt: number;
  newDebt: number;
  transitionType: 'to-zero' | 'from-zero' | 'through-zero';
}> {
  const transitions: Array<{
    eventIndex: number;
    previousDebt: number;
    newDebt: number;
    transitionType: 'to-zero' | 'from-zero' | 'through-zero';
  }> = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const previousDebt = i > 0 ? events[i - 1].runningTotal : 0;
    const currentDebt = event.runningTotal;
    
    const wasZero = Math.abs(previousDebt) < 0.01;
    const isZero = Math.abs(currentDebt) < 0.01;
    const crossedZero = (previousDebt > 0 && currentDebt < 0) || (previousDebt < 0 && currentDebt > 0);
    
    if (!wasZero && isZero) {
      transitions.push({
        eventIndex: i,
        previousDebt,
        newDebt: currentDebt,
        transitionType: 'to-zero'
      });
    } else if (wasZero && !isZero) {
      transitions.push({
        eventIndex: i,
        previousDebt,
        newDebt: currentDebt,
        transitionType: 'from-zero'
      });
    } else if (crossedZero) {
      transitions.push({
        eventIndex: i,
        previousDebt,
        newDebt: currentDebt,
        transitionType: 'through-zero'
      });
    }
  }
  
  return transitions;
}

// ============================================================================
// TRANSACTION HISTORY FORMATTING
// ============================================================================

export interface FormattedTransactionGroup {
  type: 'transaction' | 'zero-balance' | 'favor-balance' | 'payment-split';
  event?: TransactionEventWithRunningTotal;
  message?: string;
  amount?: number;
  splitInfo?: {
    debtPortion: number;
    favorPortion: number;
  };
}

/**
 * Format transaction history for display with zero-balance separators and overpayment handling
 */
export function formatTransactionHistory(
  calculation: DebtCalculationResult
): FormattedTransactionGroup[] {
  const formatted: FormattedTransactionGroup[] = [];
  
  // Reverse to show newest first (as per requirements)
  const reversedEvents = [...calculation.events].reverse();
  const transitions = detectZeroBalanceTransitions(calculation.events);
  
  for (let i = 0; i < reversedEvents.length; i++) {
    const event = reversedEvents[i];
    const originalIndex = calculation.events.length - 1 - i;
    
    // Check if this event created an overpayment scenario
    const transition = transitions.find(t => t.eventIndex === originalIndex);
    const isOverpaymentEvent = event.tipo === 'pago' && 
                              transition && 
                              transition.transitionType === 'through-zero';
    
    if (isOverpaymentEvent && event.tipo === 'pago') {
      // Handle overpayment visualization
      const previousDebt = transition!.previousDebt;
      const debtPortion = Math.min(event.montoPago, previousDebt);
      const favorPortion = event.montoPago - debtPortion;
      
      if (debtPortion > 0) {
        // Show debt payment portion
        const splitEvent: TransactionEventWithRunningTotal = {
          ...event,
          runningTotal: 0, // Show as reaching zero
          isZeroBalance: true
        };
        formatted.push({
          type: 'payment-split',
          event: splitEvent,
          amount: debtPortion,
          splitInfo: { debtPortion, favorPortion }
        });
        
        // Add zero balance separator
        formatted.push({
          type: 'zero-balance',
          message: 'cuenta en 0'
        });
      }
      
      if (favorPortion > 0) {
        // Show favor portion
        formatted.push({
          type: 'favor-balance',
          message: 'saldo a favor',
          amount: favorPortion
        });
      }
    } else {
      // Regular transaction
      formatted.push({
        type: 'transaction',
        event
      });
      
      // Check if this event brought balance to zero (but not overpayment)
      if (event.isZeroBalance && !isOverpaymentEvent) {
        formatted.push({
          type: 'zero-balance',
          message: 'cuenta en 0'
        });
      }
    }
  }

  return formatted;
}

/**
 * Format transaction history with enhanced overpayment visualization
 * This version provides more detailed information for complex payment scenarios
 */
export function formatTransactionHistoryDetailed(
  calculation: DebtCalculationResult
): FormattedTransactionGroup[] {
  const formatted: FormattedTransactionGroup[] = [];
  const events = [...calculation.events].reverse(); // Newest first
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const previousEvent = i < events.length - 1 ? events[i + 1] : null;
    const previousDebt = previousEvent ? previousEvent.runningTotal : 0;
    
    if (event.tipo === 'pago') {
      const paymentResult = applyPaymentWithVisualization(previousDebt, event.montoPago);
      
      // Newest-first ordering: show favor portion at the very top, then zero, then debt-applied payment
      const displayEventsInNewestFirst = [...paymentResult.displayEvents].reverse();

      for (const displayEvent of displayEventsInNewestFirst) {
        if (displayEvent.type === 'payment') {
          const paymentEvent: TransactionEventWithRunningTotal = {
            ...event,
            runningTotal: previousDebt - displayEvent.amount!,
            isZeroBalance: Math.abs(previousDebt - displayEvent.amount!) < 0.01
          };
          formatted.push({
            type: 'transaction',
            event: paymentEvent,
            amount: displayEvent.amount
          });
        } else if (displayEvent.type === 'zero-separator') {
          formatted.push({
            type: 'zero-balance',
            message: displayEvent.message
          });
        } else if (displayEvent.type === 'favor') {
          formatted.push({
            type: 'favor-balance',
            message: displayEvent.message,
            amount: displayEvent.amount
          });
        }
      }
    } else {
      // Sale event - add normally
      formatted.push({
        type: 'transaction',
        event
      });
    }
  }
  
  return formatted;
}

// ============================================================================
// PRODUCT PRICE CACHING
// ============================================================================

export interface ProductPriceUpdate {
  productId: string;
  ultimoCosto: number;
  ultimaGanancia: number;
}

/**
 * Extract product price information from a sale event for caching
 */
export function extractProductPriceFromSale(saleEvent: SaleEvent): ProductPriceUpdate | null {
  // We need a way to identify the product ID from the product name
  // This would typically require a product lookup, but for now we'll return the structure
  return {
    productId: saleEvent.producto, // This should be the product ID, not name
    ultimoCosto: saleEvent.costoUnitario,
    ultimaGanancia: saleEvent.gananciaUnitaria
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that transaction events maintain debt consistency
 */
export function validateTransactionConsistency(events: TransactionEvent[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  try {
    const calculation = calculateClientDebt(events);
    
    // Check for any impossible negative debt states during calculation
    for (const event of calculation.events) {
      if (event.runningTotal < -0.01) { // Allow small floating point errors
        errors.push(`Negative debt detected at event ${event.id}: ${event.runningTotal}`);
      }
    }
    
    // Validate individual sale events
    for (const event of events) {
      if (isSaleEvent(event) && !validateSaleTotal(event)) {
        errors.push(`Sale total mismatch in event ${event.id}`);
      }
    }
    
  } catch (error) {
    errors.push(`Calculation error: ${error}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format datetime for display
 */
export function formatDateTime(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}