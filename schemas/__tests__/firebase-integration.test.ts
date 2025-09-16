// Mock Firebase for testing
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: () => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    }),
    fromDate: (date: Date) => ({
      toMillis: () => date.getTime(),
      toDate: () => date,
    }),
  },
};

// Mock Firebase modules
jest.mock('firebase/firestore', () => mockFirestore);
jest.mock('@/firebaseConfig', () => ({
  db: 'mock-db'
}));

import {
  createCompany,
  getCompany,
  getCompanyMembers,
  addCompanyMember,
  removeCompanyMember,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  createClient,
  getClients,
  getClient,
  updateClient,
  updateClientDebt,
  createSaleEvent,
  createPaymentEvent,
  getClientEvents,
  updateTransactionEvent,
  deleteTransactionEvent,
  createJoinRequest,
  getPendingJoinRequests,
  updateJoinRequestStatus,
  subscribeToProducts,
  subscribeToClients,
  subscribeToClientEvents
} from '../firestore-utils';

import {
  CreateCompanyData,
  CreateProductData,
  CreateClientData,
  CreateSaleEventData,
  CreatePaymentEventData,
  Company,
  Product,
  Client,
  TransactionEvent,
  CompanyJoinRequest
} from '../types';

describe('Firebase Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Company Operations', () => {
    const mockCompanyData: CreateCompanyData = {
      nombre: 'Test Company',
      propietario: 'owner@test.com'
    };

    test('createCompany creates company and adds owner as member', async () => {
      const mockCompanyRef = { id: 'company-123' };
      mockFirestore.addDoc.mockResolvedValue(mockCompanyRef);
      mockFirestore.setDoc.mockResolvedValue(undefined);

      const companyId = await createCompany(mockCompanyData, 'user-123');

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nombre: 'Test Company',
          propietario: 'owner@test.com'
        })
      );
      expect(mockFirestore.setDoc).toHaveBeenCalledTimes(2); // Company member + user membership
      expect(companyId).toBe('company-123');
    });

    test('getCompany retrieves company data', async () => {
      const mockCompanyDoc = {
        exists: () => true,
        id: 'company-123',
        data: () => ({
          nombre: 'Test Company',
          propietario: 'owner@test.com'
        })
      };
      mockFirestore.getDoc.mockResolvedValue(mockCompanyDoc);

      const company = await getCompany('company-123');

      expect(mockFirestore.getDoc).toHaveBeenCalled();
      expect(company).toEqual({
        id: 'company-123',
        nombre: 'Test Company',
        propietario: 'owner@test.com'
      });
    });

    test('getCompany returns null for non-existent company', async () => {
      const mockCompanyDoc = {
        exists: () => false
      };
      mockFirestore.getDoc.mockResolvedValue(mockCompanyDoc);

      const company = await getCompany('non-existent');

      expect(company).toBeNull();
    });

    test('addCompanyMember adds member to company and user memberships', async () => {
      mockFirestore.setDoc.mockResolvedValue(undefined);

      await addCompanyMember('company-123', 'user-456', 'member@test.com');

      expect(mockFirestore.setDoc).toHaveBeenCalledTimes(2);
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-456',
          email: 'member@test.com',
          role: 'member'
        })
      );
    });

    test('removeCompanyMember removes member from company and user memberships', async () => {
      mockFirestore.deleteDoc.mockResolvedValue(undefined);

      await removeCompanyMember('company-123', 'user-456');

      expect(mockFirestore.deleteDoc).toHaveBeenCalledTimes(2);
    });

    test('getCompanyMembers retrieves all company members', async () => {
      const mockSnapshot = {
        docs: [
          {
            data: () => ({
              userId: 'user-123',
              email: 'owner@test.com',
              role: 'owner'
            })
          },
          {
            data: () => ({
              userId: 'user-456',
              email: 'member@test.com',
              role: 'member'
            })
          }
        ]
      };
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);

      const members = await getCompanyMembers('company-123');

      expect(members).toHaveLength(2);
      expect(members[0].role).toBe('owner');
      expect(members[1].role).toBe('member');
    });
  });

  describe('Product Operations', () => {
    const mockProductData: CreateProductData = {
      nombre: 'Test Product',
      colorFondo: '#FF0000',
      posicion: 0,
      ultimoCosto: 10,
      ultimaGanancia: 5,
      activo: true
    };

    test('createProduct creates product with correct data', async () => {
      const mockProductRef = { id: 'product-123' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);

      const productId = await createProduct('company-123', mockProductData);

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nombre: 'Test Product',
          colorFondo: '#FF0000',
          posicion: 0,
          ultimoCosto: 10,
          ultimaGanancia: 5,
          activo: true
        })
      );
      expect(productId).toBe('product-123');
    });

    test('getProducts retrieves active products ordered by position', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'product-1',
            data: () => ({
              nombre: 'Product 1',
              posicion: 0,
              activo: true
            })
          },
          {
            id: 'product-2',
            data: () => ({
              nombre: 'Product 2',
              posicion: 1,
              activo: true
            })
          }
        ]
      };
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');
      mockFirestore.orderBy.mockReturnValue('mock-orderby');

      const products = await getProducts('company-123');

      expect(mockFirestore.query).toHaveBeenCalled();
      expect(mockFirestore.where).toHaveBeenCalledWith('activo', '==', true);
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('posicion');
      expect(products).toHaveLength(2);
      expect(products[0].nombre).toBe('Product 1');
    });

    test('updateProduct updates product with timestamp', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await updateProduct('company-123', 'product-123', { nombre: 'Updated Product' });

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nombre: 'Updated Product',
          actualizado: expect.anything()
        })
      );
    });

    test('deleteProduct soft deletes product', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await deleteProduct('company-123', 'product-123');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          activo: false,
          actualizado: expect.anything()
        })
      );
    });
  });

  describe('Client Operations', () => {
    const mockClientData: CreateClientData = {
      nombre: 'Test Client',
      direccion: 'Test Address',
      telefono: '1234567890',
      oculto: false,
      notas: 'Test notes'
    };

    test('createClient creates client with zero initial debt', async () => {
      const mockClientRef = { id: 'client-123' };
      mockFirestore.addDoc.mockResolvedValue(mockClientRef);

      const clientId = await createClient('company-123', mockClientData);

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nombre: 'Test Client',
          direccion: 'Test Address',
          telefono: '1234567890',
          oculto: false,
          deudaActual: 0
        })
      );
      expect(clientId).toBe('client-123');
    });

    test('getClients retrieves visible clients by default', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'client-1',
            data: () => ({
              nombre: 'Client 1',
              oculto: false
            })
          }
        ]
      };
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');

      const clients = await getClients('company-123');

      expect(mockFirestore.where).toHaveBeenCalledWith('oculto', '==', false);
      expect(clients).toHaveLength(1);
    });

    test('getClients includes hidden clients when requested', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'client-1',
            data: () => ({ nombre: 'Client 1', oculto: false })
          },
          {
            id: 'client-2',
            data: () => ({ nombre: 'Client 2', oculto: true })
          }
        ]
      };
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);
      mockFirestore.query.mockReturnValue('mock-query');

      const clients = await getClients('company-123', true);

      expect(clients).toHaveLength(2);
    });

    test('getClient retrieves specific client', async () => {
      const mockClientDoc = {
        exists: () => true,
        id: 'client-123',
        data: () => ({
          nombre: 'Test Client',
          direccion: 'Test Address'
        })
      };
      mockFirestore.getDoc.mockResolvedValue(mockClientDoc);

      const client = await getClient('company-123', 'client-123');

      expect(client).toEqual({
        id: 'client-123',
        nombre: 'Test Client',
        direccion: 'Test Address'
      });
    });

    test('updateClient updates client with timestamp', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await updateClient('company-123', 'client-123', { nombre: 'Updated Client' });

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nombre: 'Updated Client',
          actualizado: expect.anything()
        })
      );
    });

    test('updateClientDebt updates debt and transaction timestamp', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);
      const mockTimestamp = mockFirestore.Timestamp.now();

      await updateClientDebt('company-123', 'client-123', 150.50, mockTimestamp);

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deudaActual: 150.50,
          ultimaTransaccion: mockTimestamp,
          actualizado: expect.anything()
        })
      );
    });
  });

  describe('Transaction Event Operations', () => {
    const mockSaleData: CreateSaleEventData = {
      clienteId: 'client-123',
      tipo: 'venta',
      fecha: mockFirestore.Timestamp.now(),
      producto: 'Test Product',
      cantidad: 2,
      costoUnitario: 10,
      gananciaUnitaria: 5,
      totalVenta: 30
    };

    const mockPaymentData: CreatePaymentEventData = {
      clienteId: 'client-123',
      tipo: 'pago',
      fecha: mockFirestore.Timestamp.now(),
      montoPago: 100
    };

    test('createSaleEvent creates sale event with correct data', async () => {
      const mockEventRef = { id: 'event-123' };
      mockFirestore.addDoc.mockResolvedValue(mockEventRef);

      const eventId = await createSaleEvent('company-123', mockSaleData);

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clienteId: 'client-123',
          tipo: 'venta',
          producto: 'Test Product',
          cantidad: 2,
          costoUnitario: 10,
          gananciaUnitaria: 5,
          totalVenta: 30,
          borrado: false
        })
      );
      expect(eventId).toBe('event-123');
    });

    test('createPaymentEvent creates payment event with correct data', async () => {
      const mockEventRef = { id: 'event-456' };
      mockFirestore.addDoc.mockResolvedValue(mockEventRef);

      const eventId = await createPaymentEvent('company-123', mockPaymentData);

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clienteId: 'client-123',
          tipo: 'pago',
          montoPago: 100,
          borrado: false
        })
      );
      expect(eventId).toBe('event-456');
    });

    test('getClientEvents retrieves non-deleted events ordered by date', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'event-1',
            data: () => ({
              clienteId: 'client-123',
              tipo: 'venta',
              fecha: mockFirestore.Timestamp.now(),
              borrado: false
            })
          },
          {
            id: 'event-2',
            data: () => ({
              clienteId: 'client-123',
              tipo: 'pago',
              fecha: mockFirestore.Timestamp.now(),
              borrado: false
            })
          }
        ]
      };
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');
      mockFirestore.orderBy.mockReturnValue('mock-orderby');

      const events = await getClientEvents('company-123', 'client-123');

      expect(mockFirestore.where).toHaveBeenCalledWith('clienteId', '==', 'client-123');
      expect(mockFirestore.where).toHaveBeenCalledWith('borrado', '==', false);
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('fecha', 'desc');
      expect(events).toHaveLength(2);
    });

    test('updateTransactionEvent updates event with edit timestamp', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await updateTransactionEvent('company-123', 'event-123', { notas: 'Updated notes' });

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          notas: 'Updated notes',
          editado: expect.anything()
        })
      );
    });

    test('deleteTransactionEvent soft deletes event', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await deleteTransactionEvent('company-123', 'event-123');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          borrado: true,
          editado: expect.anything()
        })
      );
    });
  });

  describe('Company Join Request Operations', () => {
    test('createJoinRequest creates request and sends notification', async () => {
      const mockRequestRef = { id: 'request-123' };
      const mockCompany = {
        id: 'company-123',
        nombre: 'Test Company',
        propietario: 'owner-123'
      };
      
      mockFirestore.addDoc.mockResolvedValue(mockRequestRef);
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'company-123',
        data: () => mockCompany
      });

      const requestId = await createJoinRequest('company-123', 'user-456', 'user@test.com');

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          empresaId: 'company-123',
          solicitanteId: 'user-456',
          solicitanteEmail: 'user@test.com',
          estado: 'pendiente'
        })
      );
      expect(requestId).toBe('request-123');
    });

    test('getPendingJoinRequests retrieves pending requests', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'request-1',
            data: () => ({
              empresaId: 'company-123',
              solicitanteEmail: 'user1@test.com',
              estado: 'pendiente'
            })
          },
          {
            id: 'request-2',
            data: () => ({
              empresaId: 'company-123',
              solicitanteEmail: 'user2@test.com',
              estado: 'pendiente'
            })
          }
        ]
      };
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');
      mockFirestore.orderBy.mockReturnValue('mock-orderby');

      const requests = await getPendingJoinRequests('company-123');

      expect(mockFirestore.where).toHaveBeenCalledWith('empresaId', '==', 'company-123');
      expect(mockFirestore.where).toHaveBeenCalledWith('estado', '==', 'pendiente');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('creado', 'desc');
      expect(requests).toHaveLength(2);
    });

    test('updateJoinRequestStatus updates request status', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await updateJoinRequestStatus('request-123', 'aceptada');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'aceptada',
          procesado: expect.anything()
        })
      );
    });
  });

  describe('Real-time Listeners', () => {
    test('subscribeToProducts sets up real-time listener with correct query', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      mockFirestore.onSnapshot.mockReturnValue(mockUnsubscribe);
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');
      mockFirestore.orderBy.mockReturnValue('mock-orderby');

      const unsubscribe = subscribeToProducts('company-123', mockCallback);

      expect(mockFirestore.query).toHaveBeenCalled();
      expect(mockFirestore.where).toHaveBeenCalledWith('activo', '==', true);
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('posicion');
      expect(mockFirestore.onSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    test('subscribeToClients sets up real-time listener with visibility filter', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      mockFirestore.onSnapshot.mockReturnValue(mockUnsubscribe);
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');

      const unsubscribe = subscribeToClients('company-123', false, mockCallback);

      expect(mockFirestore.where).toHaveBeenCalledWith('oculto', '==', false);
      expect(mockFirestore.onSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    test('subscribeToClientEvents sets up real-time listener for client events', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      mockFirestore.onSnapshot.mockReturnValue(mockUnsubscribe);
      mockFirestore.query.mockReturnValue('mock-query');
      mockFirestore.where.mockReturnValue('mock-where');
      mockFirestore.orderBy.mockReturnValue('mock-orderby');

      const unsubscribe = subscribeToClientEvents('company-123', 'client-123', mockCallback);

      expect(mockFirestore.where).toHaveBeenCalledWith('clienteId', '==', 'client-123');
      expect(mockFirestore.where).toHaveBeenCalledWith('borrado', '==', false);
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('fecha', 'desc');
      expect(mockFirestore.onSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    test('real-time listeners handle snapshot updates correctly', () => {
      const mockCallback = jest.fn();
      const mockSnapshot = {
        docs: [
          {
            id: 'product-1',
            data: () => ({ nombre: 'Product 1', activo: true })
          }
        ]
      };

      // Capture the callback passed to onSnapshot
      let snapshotCallback: (snapshot: any) => void;
      mockFirestore.onSnapshot.mockImplementation((query, callback) => {
        snapshotCallback = callback;
        return jest.fn(); // Return unsubscribe function
      });

      subscribeToProducts('company-123', mockCallback);

      // Simulate snapshot update
      snapshotCallback!(mockSnapshot);

      expect(mockCallback).toHaveBeenCalledWith([
        { id: 'product-1', nombre: 'Product 1', activo: true }
      ]);
    });
  });

  describe('Error Handling', () => {
    test('handles Firestore errors gracefully in create operations', async () => {
      mockFirestore.addDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(createProduct('company-123', {
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      })).rejects.toThrow('Firestore error');
    });

    test('handles Firestore errors gracefully in read operations', async () => {
      mockFirestore.getDoc.mockRejectedValue(new Error('Network error'));

      await expect(getCompany('company-123')).rejects.toThrow('Network error');
    });

    test('handles Firestore errors gracefully in update operations', async () => {
      mockFirestore.updateDoc.mockRejectedValue(new Error('Permission denied'));

      await expect(updateProduct('company-123', 'product-123', { nombre: 'Updated' }))
        .rejects.toThrow('Permission denied');
    });

    test('handles non-existent documents gracefully', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await getClient('company-123', 'non-existent');
      expect(result).toBeNull();
    });

    test('handles empty query results gracefully', async () => {
      mockFirestore.getDocs.mockResolvedValue({
        docs: []
      });

      const results = await getProducts('company-123');
      expect(results).toEqual([]);
    });
  });

  describe('Data Consistency', () => {
    test('ensures timestamps are added to create operations', async () => {
      const mockRef = { id: 'test-123' };
      mockFirestore.addDoc.mockResolvedValue(mockRef);

      await createClient('company-123', {
        nombre: 'Test Client',
        direccion: 'Test Address',
        telefono: '1234567890',
        oculto: false
      });

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          creado: expect.anything()
        })
      );
    });

    test('ensures timestamps are added to update operations', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await updateClient('company-123', 'client-123', { nombre: 'Updated' });

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actualizado: expect.anything()
        })
      );
    });

    test('ensures soft delete preserves data integrity', async () => {
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await deleteProduct('company-123', 'product-123');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          activo: false,
          actualizado: expect.anything()
        })
      );
      // Verify hard delete is not called
      expect(mockFirestore.deleteDoc).not.toHaveBeenCalled();
    });
  });
});