import { Timestamp } from 'firebase/firestore';
import { 
  TransactionEvent, 
  SaleEvent, 
  PaymentEvent,
  CreateSaleEventData,
  CreatePaymentEventData,
  isSaleEvent,
  isPaymentEvent
} from './types';

// ============================================================================
// EVENT CREATION UTILITIES
// ============================================================================

/**
 * Creates a sale event data object with proper validation and calculation
 */
export function createSaleEventData(params: {
  clienteId: string;
  producto: string;
  cantidad: number;
  costoUnitario: number;
  gananciaUnitaria: number;
  fecha?: Timestamp;
  productoColor?: string;
  notas?: string;
}): CreateSaleEventData {
  const {
    clienteId,
    producto,
    cantidad,
    costoUnitario,
    gananciaUnitaria,
    fecha = Timestamp.now(),
    productoColor,
    notas
  } = params;

  // Calculate total automatically
  const totalVenta = cantidad * (costoUnitario + gananciaUnitaria);

  return {
    clienteId,
    tipo: 'venta',
    fecha,
    producto,
    productoColor,
    cantidad,
    costoUnitario,
    gananciaUnitaria,
    totalVenta,
    notas
  };
}

/**
 * Creates a payment event data object
 */
export function createPaymentEventData(params: {
  clienteId: string;
  montoPago: number;
  fecha?: Timestamp;
  notas?: string;
}): CreatePaymentEventData {
  const {
    clienteId,
    montoPago,
    fecha = Timestamp.now(),
    notas
  } = params;

  return {
    clienteId,
    tipo: 'pago',
    fecha,
    montoPago,
    notas
  };
}

// ============================================================================
// EVENT MANIPULATION UTILITIES
// ============================================================================

/**
 * Calculates the total amount for a sale event
 */
export function calculateSaleTotal(cantidad: number, costoUnitario: number, gananciaUnitaria: number): number {
  return cantidad * (costoUnitario + gananciaUnitaria);
}

/**
 * Recalculates the total for a sale event and returns updated event
 */
export function recalculateSaleTotal(saleEvent: SaleEvent): SaleEvent {
  const newTotal = calculateSaleTotal(
    saleEvent.cantidad,
    saleEvent.costoUnitario,
    saleEvent.gananciaUnitaria
  );

  return {
    ...saleEvent,
    totalVenta: newTotal
  };
}

/**
 * Gets the monetary impact of an event (positive for sales, negative for payments)
 */
export function getEventMonetaryImpact(event: TransactionEvent): number {
  if (isSaleEvent(event)) {
    return event.totalVenta;
  } else if (isPaymentEvent(event)) {
    return -event.montoPago;
  }
  return 0;
}

/**
 * Formats an event for display purposes
 */
export function formatEventForDisplay(event: TransactionEvent): {
  type: 'sale' | 'payment';
  description: string;
  amount: number;
  date: Date;
  hasNotes: boolean;
} {
  const baseInfo = {
    date: event.fecha.toDate(),
    hasNotes: Boolean(event.notas && event.notas.trim().length > 0)
  };

  if (isSaleEvent(event)) {
    return {
      ...baseInfo,
      type: 'sale',
      description: `${event.producto} x${event.cantidad}`,
      amount: event.totalVenta
    };
  } else {
    return {
      ...baseInfo,
      type: 'payment',
      description: 'Pago recibido',
      amount: event.montoPago
    };
  }
}

// ============================================================================
// EVENT SORTING AND FILTERING UTILITIES
// ============================================================================

/**
 * Sorts events by date (newest first by default)
 */
export function sortEventsByDate(events: TransactionEvent[], ascending: boolean = false): TransactionEvent[] {
  return [...events].sort((a, b) => {
    const aTime = a.fecha.toMillis();
    const bTime = b.fecha.toMillis();
    return ascending ? aTime - bTime : bTime - aTime;
  });
}

/**
 * Filters out deleted events
 */
export function filterActiveEvents(events: TransactionEvent[]): TransactionEvent[] {
  return events.filter(event => !event.borrado);
}

/**
 * Filters events by type
 */
export function filterEventsByType(events: TransactionEvent[], type: 'venta' | 'pago'): TransactionEvent[] {
  return events.filter(event => event.tipo === type);
}

/**
 * Filters events by date range
 */
export function filterEventsByDateRange(
  events: TransactionEvent[], 
  startDate: Date, 
  endDate: Date
): TransactionEvent[] {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  
  return events.filter(event => {
    const eventTime = event.fecha.toDate().getTime();
    return eventTime >= startTime && eventTime <= endTime;
  });
}

// ============================================================================
// EVENT VALIDATION UTILITIES
// ============================================================================

/**
 * Checks if an event is editable based on business rules
 */
export function isEventEditable(event: TransactionEvent): boolean {
  if (event.borrado) return false;
  
  // Don't allow editing events older than 30 days
  const daysSinceCreation = (Date.now() - event.creado.toMillis()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation <= 30;
}

/**
 * Checks if an event is deletable based on business rules
 */
export function isEventDeletable(event: TransactionEvent): boolean {
  if (event.borrado) return false;
  
  // Don't allow deleting events older than 30 days
  const daysSinceCreation = (Date.now() - event.creado.toMillis()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation <= 30;
}

/**
 * Gets a human-readable reason why an event cannot be edited
 */
export function getEditRestrictionReason(event: TransactionEvent): string | null {
  if (event.borrado) {
    return 'No se puede editar un evento eliminado';
  }
  
  const daysSinceCreation = (Date.now() - event.creado.toMillis()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation > 30) {
    return 'No se pueden editar eventos de más de 30 días';
  }
  
  return null;
}

/**
 * Gets a human-readable reason why an event cannot be deleted
 */
export function getDeleteRestrictionReason(event: TransactionEvent): string | null {
  if (event.borrado) {
    return 'El evento ya está eliminado';
  }
  
  const daysSinceCreation = (Date.now() - event.creado.toMillis()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation > 30) {
    return 'No se pueden eliminar eventos de más de 30 días';
  }
  
  return null;
}

// ============================================================================
// EVENT CLONING UTILITIES
// ============================================================================

/**
 * Creates a copy of an event with a new date (useful for recurring transactions)
 */
export function cloneEventWithNewDate(event: TransactionEvent, newDate: Timestamp): CreateSaleEventData | CreatePaymentEventData {
  if (isSaleEvent(event)) {
    return createSaleEventData({
      clienteId: event.clienteId,
      producto: event.producto,
      cantidad: event.cantidad,
      costoUnitario: event.costoUnitario,
      gananciaUnitaria: event.gananciaUnitaria,
      fecha: newDate,
      productoColor: event.productoColor,
      notas: event.notas
    });
  } else {
    return createPaymentEventData({
      clienteId: event.clienteId,
      montoPago: event.montoPago,
      fecha: newDate,
      notas: event.notas
    });
  }
}

/**
 * Creates a template event based on an existing event (removes specific data like amounts)
 */
export function createEventTemplate(event: TransactionEvent): Partial<CreateSaleEventData | CreatePaymentEventData> {
  const baseTemplate = {
    clienteId: event.clienteId,
    tipo: event.tipo,
    notas: event.notas
  };

  if (isSaleEvent(event)) {
    return {
      ...baseTemplate,
      producto: event.producto,
      productoColor: event.productoColor,
      // Don't include amounts - let user fill them in
    };
  } else {
    return baseTemplate;
  }
}