import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  TransactionEvent, 
  SaleEvent, 
  PaymentEvent,
  CreateSaleEventData,
  CreatePaymentEventData,
  UpdateTransactionEventData,
  COLLECTIONS
} from '../schemas/types';
import { 
  validateSaleEvent, 
  validatePaymentEvent, 
  validateTransactionEvent 
} from '../schemas/validation';

// Helper to remove undefined fields before writing to Firestore
function sanitizeFirestoreData<T extends Record<string, any>>(data: T): T {
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    const value = (data as any)[key];
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

export class TransactionEventService {
  private static getEventsCollection(empresaId: string) {
    return collection(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS);
  }

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  /**
   * Creates a new sale event
   */
  static async createSaleEvent(
    empresaId: string, 
    saleData: CreateSaleEventData
  ): Promise<{ success: boolean; eventId?: string; errors?: string[] }> {
    try {
      // If offline, enqueue and return success immediately
      const offlineManager = require('./OfflineDataManager').default.getInstance();
      if (!offlineManager.getConnectionStatus()) {
        await offlineManager.addToSyncQueue({
          type: 'create',
          collection: 'events',
          empresaId,
          data: saleData,
        } as any);
        return { success: true };
      }
      // Validate the sale event data
      const validation = validateSaleEvent(saleData);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      // Calculate total if not provided or incorrect
      const calculatedTotal = saleData.cantidad * (saleData.costoUnitario + saleData.gananciaUnitaria);
      
      const eventData: Omit<SaleEvent, 'id'> = sanitizeFirestoreData({
        ...saleData,
        notas: saleData.notas?.trim() ?? '',
        tipo: 'venta',
        totalVenta: calculatedTotal,
        creado: Timestamp.now(),
        borrado: false
      });

      const eventsCollection = this.getEventsCollection(empresaId);
      const docRef = await addDoc(eventsCollection, eventData);

      return { success: true, eventId: docRef.id };
    } catch (error) {
      console.error('Error creating sale event:', error);
      return { 
        success: false, 
        errors: ['Error al crear el evento de venta. Intente nuevamente.'] 
      };
    }
  }

  /**
   * Creates a new payment event
   */
  static async createPaymentEvent(
    empresaId: string, 
    paymentData: CreatePaymentEventData
  ): Promise<{ success: boolean; eventId?: string; errors?: string[] }> {
    try {
      // If offline, enqueue and return success immediately
      const offlineManager = require('./OfflineDataManager').default.getInstance();
      if (!offlineManager.getConnectionStatus()) {
        await offlineManager.addToSyncQueue({
          type: 'create',
          collection: 'events',
          empresaId,
          data: paymentData,
        } as any);
        return { success: true };
      }
      // Validate the payment event data
      const validation = validatePaymentEvent(paymentData);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      const eventData: Omit<PaymentEvent, 'id'> = sanitizeFirestoreData({
        ...paymentData,
        notas: paymentData.notas?.trim() ?? '',
        tipo: 'pago',
        creado: Timestamp.now(),
        borrado: false
      });

      const eventsCollection = this.getEventsCollection(empresaId);
      const docRef = await addDoc(eventsCollection, eventData);

      return { success: true, eventId: docRef.id };
    } catch (error) {
      console.error('Error creating payment event:', error);
      return { 
        success: false, 
        errors: ['Error al crear el evento de pago. Intente nuevamente.'] 
      };
    }
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /**
   * Gets all events for a specific client
   */
  static async getClientEvents(
    empresaId: string, 
    clienteId: string
  ): Promise<TransactionEvent[]> {
    try {
      const eventsCollection = this.getEventsCollection(empresaId);
      const q = query(
        eventsCollection,
        where('clienteId', '==', clienteId),
        where('borrado', '==', false),
        orderBy('fecha', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const events: TransactionEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data
        } as TransactionEvent);
      });

      return events;
    } catch (error) {
      console.error('Error getting client events:', error);
      return [];
    }
  }

  /**
   * Gets a specific event by ID
   */
  static async getEventById(
    empresaId: string, 
    eventId: string
  ): Promise<TransactionEvent | null> {
    try {
      const eventDoc = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS, eventId);
      const docSnap = await getDoc(eventDoc);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as TransactionEvent;
      }

      return null;
    } catch (error) {
      console.error('Error getting event by ID:', error);
      return null;
    }
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  /**
   * Updates an existing transaction event
   */
  static async updateEvent(
    empresaId: string,
    eventId: string,
    updateData: UpdateTransactionEventData
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Get the existing event to validate the update
      const existingEvent = await this.getEventById(empresaId, eventId);
      if (!existingEvent) {
        return { success: false, errors: ['Evento no encontrado'] };
      }

      // Create the updated event for validation
      const updatedEvent = { ...existingEvent, ...updateData } as TransactionEvent;
      
      // Validate the updated event
      const validation = validateTransactionEvent(updatedEvent as TransactionEvent);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      // If it's a sale event and price/quantity changed, recalculate total
      let updateFields: UpdateTransactionEventData = { ...updateData };
      if (updatedEvent.tipo === 'venta') {
        const saleEvent = updatedEvent as SaleEvent;
        const calculatedTotal = saleEvent.cantidad * (saleEvent.costoUnitario + saleEvent.gananciaUnitaria);
        (updateFields as any).totalVenta = calculatedTotal;
      }

      // Add edit timestamp
      const finalUpdateData = {
        ...updateFields,
        editado: Timestamp.now()
      };

      const eventDoc = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS, eventId);
      await updateDoc(eventDoc, finalUpdateData);

      return { success: true };
    } catch (error) {
      console.error('Error updating event:', error);
      return { 
        success: false, 
        errors: ['Error al actualizar el evento. Intente nuevamente.'] 
      };
    }
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  /**
   * Soft deletes an event (marks as borrado: true)
   */
  static async deleteEvent(
    empresaId: string,
    eventId: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const eventDoc = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS, eventId);
      await updateDoc(eventDoc, {
        borrado: true,
        editado: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      return { 
        success: false, 
        errors: ['Error al eliminar el evento. Intente nuevamente.'] 
      };
    }
  }

  /**
   * Permanently deletes an event (hard delete)
   */
  static async permanentlyDeleteEvent(
    empresaId: string,
    eventId: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const eventDoc = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS, eventId);
      await deleteDoc(eventDoc);

      return { success: true };
    } catch (error) {
      console.error('Error permanently deleting event:', error);
      return { 
        success: false, 
        errors: ['Error al eliminar permanentemente el evento. Intente nuevamente.'] 
      };
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Creates a properly formatted sale event data object
   */
  static createSaleEventData(
    clienteId: string,
    producto: string,
    cantidad: number,
    costoUnitario: number,
    gananciaUnitaria: number,
    fecha: Timestamp = Timestamp.now(),
    productoColor?: string,
    notas?: string
  ): CreateSaleEventData {
    return {
      clienteId,
      tipo: 'venta',
      fecha,
      producto,
      productoColor,
      cantidad,
      costoUnitario,
      gananciaUnitaria,
      totalVenta: cantidad * (costoUnitario + gananciaUnitaria),
      notas
    };
  }

  /**
   * Creates a properly formatted payment event data object
   */
  static createPaymentEventData(
    clienteId: string,
    montoPago: number,
    fecha: Timestamp = Timestamp.now(),
    notas?: string
  ): CreatePaymentEventData {
    return {
      clienteId,
      tipo: 'pago',
      fecha,
      montoPago,
      notas
    };
  }

  /**
   * Validates if an event can be edited (business rules)
   */
  static canEditEvent(event: TransactionEvent): { canEdit: boolean; reason?: string } {
    if (event.borrado) {
      return { canEdit: false, reason: 'No se puede editar un evento eliminado' };
    }

    // Add any other business rules for editing events
    // For example, events older than X days cannot be edited
    const daysSinceCreation = (Timestamp.now().toMillis() - event.creado.toMillis()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      return { canEdit: false, reason: 'No se pueden editar eventos de más de 30 días' };
    }

    return { canEdit: true };
  }

  /**
   * Validates if an event can be deleted (business rules)
   */
  static canDeleteEvent(event: TransactionEvent): { canDelete: boolean; reason?: string } {
    if (event.borrado) {
      return { canDelete: false, reason: 'El evento ya está eliminado' };
    }

    // Add any other business rules for deleting events
    const daysSinceCreation = (Timestamp.now().toMillis() - event.creado.toMillis()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      return { canDelete: false, reason: 'No se pueden eliminar eventos de más de 30 días' };
    }

    return { canDelete: true };
  }

  // ============================================================================
  // REAL-TIME LISTENERS
  // ============================================================================

  /**
   * Subscribe to real-time updates for a client's transaction events
   */
  static subscribeToClientEvents(
    empresaId: string,
    clienteId: string,
    callback: (events: TransactionEvent[]) => void
  ): () => void {
    const eventsCollection = this.getEventsCollection(empresaId);
    const q = query(
      eventsCollection,
      where('clienteId', '==', clienteId),
      where('borrado', '==', false),
      orderBy('fecha', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const events: TransactionEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data
        } as TransactionEvent);
      });

      callback(events);
    }, (error) => {
      console.error('Error in transaction events subscription:', error);
    });

    return unsubscribe;
  }

  /**
   * Subscribe to real-time updates for all events in a company
   */
  static subscribeToAllEvents(
    empresaId: string,
    callback: (events: TransactionEvent[]) => void
  ): () => void {
    const eventsCollection = this.getEventsCollection(empresaId);
    const q = query(
      eventsCollection,
      where('borrado', '==', false),
      orderBy('fecha', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const events: TransactionEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data
        } as TransactionEvent);
      });

      callback(events);
    }, (error) => {
      console.error('Error in all events subscription:', error);
    });

    return unsubscribe;
  }

  /**
   * Subscribe to a specific transaction event
   */
  static subscribeToEvent(
    empresaId: string,
    eventId: string,
    callback: (event: TransactionEvent | null) => void
  ): () => void {
    const eventDoc = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS, eventId);
    
    const unsubscribe = onSnapshot(eventDoc, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const event: TransactionEvent = {
          id: docSnapshot.id,
          ...data
        } as TransactionEvent;
        callback(event);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in event subscription:', error);
      callback(null);
    });

    return unsubscribe;
  }
}