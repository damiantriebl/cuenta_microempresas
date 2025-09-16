/**
 * Comprehensive Client Creation Tests
 * Tests for task 7.2: Test client creation functionality
 * 
 * This test suite covers:
 * - Client creation with valid data
 * - Client creation with invalid data  
 * - Client creation under various network conditions
 * - Requirements: 2.1, 2.4, 2.5
 */

import { jest } from '@jest/globals';

// Mock Firebase modules
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  Timestamp: {
    now: () => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    }),
  },
};

jest.mock('firebase/firestore', () => mockFirestore);
jest.mock('@/firebaseConfig', () => ({
  db: 'mock-db'
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Toast Provider
const mockShowToast = jest.fn();
jest.mock('@/context/ToastProvider', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

// Mock ErrorTracker
jest.mock('../../services/ErrorTracker', () => ({
  errorTracker: {
    addBreadcrumb: jest.fn(),
    trackError: jest.fn(),
  },
  trackClientError: jest.fn(),
}));

// Mock DebugLogger
jest.mock('../../services/DebugLogger', () => ({
  debugLogger: {
    startOperation: jest.fn(() => 'mock-operation-id'),
    endOperation: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    logValidation: jest.fn(),
    logFirestoreOperation: jest.fn(),
    logServiceResponse: jest.fn(),
  },
  logClientCreation: {
    start: jest.fn(),
    validation: jest.fn(),
    firestore: jest.fn(),
    complete: jest.fn(),
  },
}));

import { ClientService } from '../../services/ClientService';
import { createClient } from '../firestore-utils';
import { validateClient } from '../validation';
import { CreateClientData } from '../types';

describe('Client Creation Comprehensive Tests', () => {
  let clientService: ClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    clientService = ClientService.getInstance();
    
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Valid Data Scenarios - Requirement 2.1', () => {
    const validEmpresaId = 'test-empresa-123';

    test('should create client with complete valid data', async () => {
      const validClientData: CreateClientData = {
        nombre: 'Juan Pérez',
        telefono: '+1234567890',
        direccion: 'Calle Principal 123',
        email: 'juan@example.com',
        activo: true
      };

      const mockClientRef = { id: 'client-123' };
      mockFirestore.addDoc.mockResolvedValue(mockClientRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('client-123');
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Juan Pérez',
          telefono: '+1234567890',
          direccion: 'Calle Principal 123',
          email: 'juan@example.com',
          activo: true,
          saldoFavor: 0,
          creado: expect.anything(),
          actualizado: expect.anything()
        })
      );

      // Verify logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting client creation'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Client created successfully'),
        expect.any(Object)
      );
    });

    test('should create client with minimal valid data (name only)', async () => {
      const minimalClientData: CreateClientData = {
        nombre: 'Cliente Básico',
        activo: true
      };

      const mockClientRef = { id: 'client-minimal' };
      mockFirestore.addDoc.mockResolvedValue(mockClientRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, minimalClientData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('client-minimal');
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Cliente Básico',
          activo: true,
          saldoFavor: 0,
          creado: expect.anything(),
          actualizado: expect.anything()
        })
      );

      // Should not contain optional fields
      const addDocCall = mockFirestore.addDoc.mock.calls[0][1];
      expect(addDocCall).not.toHaveProperty('telefono');
      expect(addDocCall).not.toHaveProperty('direccion');
      expect(addDocCall).not.toHaveProperty('email');
    });

    test('should create client with phone number variations', async () => {
      const phoneVariations = [
        '+1234567890',
        '1234567890',
        '(123) 456-7890',
        '123-456-7890',
        '123.456.7890'
      ];

      for (const telefono of phoneVariations) {
        const clientData: CreateClientData = {
          nombre: `Cliente ${telefono}`,
          telefono,
          activo: true
        };

        const mockClientRef = { id: `client-${telefono.replace(/\D/g, '')}` };
        mockFirestore.addDoc.mockResolvedValue(mockClientRef);
        mockFirestore.collection.mockReturnValue('mock-collection');

        const result = await clientService.createClient(validEmpresaId, clientData);

        expect(result.success).toBe(true);
        expect(mockFirestore.addDoc).toHaveBeenCalledWith(
          'mock-collection',
          expect.objectContaining({
            telefono
          })
        );
      }
    });

    test('should create client with special characters in name', async () => {
      const specialCharData: CreateClientData = {
        nombre: 'María José Rodríguez-García',
        telefono: '+1234567890',
        activo: true
      };

      const mockClientRef = { id: 'client-special' };
      mockFirestore.addDoc.mockResolvedValue(mockClientRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, specialCharData);

      expect(result.success).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'María José Rodríguez-García'
        })
      );
    });

    test('should create client with long address', async () => {
      const longAddressData: CreateClientData = {
        nombre: 'Cliente Dirección Larga',
        direccion: 'Avenida de los Insurgentes Sur 1234, Colonia Del Valle, Delegación Benito Juárez, Ciudad de México, México, CP 03100',
        activo: true
      };

      const mockClientRef = { id: 'client-long-address' };
      mockFirestore.addDoc.mockResolvedValue(mockClientRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, longAddressData);

      expect(result.success).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          direccion: expect.stringContaining('Avenida de los Insurgentes Sur')
        })
      );
    });

    test('should create client with various email formats', async () => {
      const emailFormats = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example-domain.com',
        'test@subdomain.example.com'
      ];

      for (const email of emailFormats) {
        const clientData: CreateClientData = {
          nombre: `Cliente ${email}`,
          email,
          activo: true
        };

        const mockClientRef = { id: `client-${email.split('@')[0]}` };
        mockFirestore.addDoc.mockResolvedValue(mockClientRef);
        mockFirestore.collection.mockReturnValue('mock-collection');

        const result = await clientService.createClient(validEmpresaId, clientData);

        expect(result.success).toBe(true);
        expect(mockFirestore.addDoc).toHaveBeenCalledWith(
          'mock-collection',
          expect.objectContaining({
            email
          })
        );
      }
    });
  });

  describe('Invalid Data Scenarios - Requirement 2.5', () => {
    const validEmpresaId = 'test-empresa-123';

    test('should reject client with empty name', async () => {
      const invalidData: CreateClientData = {
        nombre: '',
        activo: true
      };

      const result = await clientService.createClient(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.errors).toContain('El nombre del cliente es requerido');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject client with whitespace-only name', async () => {
      const invalidData: CreateClientData = {
        nombre: '   ',
        activo: true
      };

      const result = await clientService.createClient(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject client with name too long', async () => {
      const invalidData: CreateClientData = {
        nombre: 'A'.repeat(101), // Exceeds 100 character limit
        activo: true
      };

      const result = await clientService.createClient(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject client with invalid phone number formats', async () => {
      const invalidPhones = [
        '123', // Too short
        'abc123def', // Contains letters
        '+', // Just plus sign
        '123-456-789012345', // Too long
        '++1234567890', // Double plus
        ''
      ];

      for (const telefono of invalidPhones) {
        const invalidData: CreateClientData = {
          nombre: 'Valid Name',
          telefono,
          activo: true
        };

        const result = await clientService.createClient(validEmpresaId, invalidData);

        expect(result.success).toBe(false);
        expect(result.errorType).toBe('validation');
        expect(mockFirestore.addDoc).not.toHaveBeenCalled();
      }
    });

    test('should reject client with invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
        'user@example.',
        'user name@example.com', // Space in email
        ''
      ];

      for (const email of invalidEmails) {
        const invalidData: CreateClientData = {
          nombre: 'Valid Name',
          email,
          activo: true
        };

        const result = await clientService.createClient(validEmpresaId, invalidData);

        expect(result.success).toBe(false);
        expect(result.errorType).toBe('validation');
        expect(mockFirestore.addDoc).not.toHaveBeenCalled();
      }
    });

    test('should reject client with address too long', async () => {
      const invalidData: CreateClientData = {
        nombre: 'Valid Name',
        direccion: 'A'.repeat(501), // Exceeds 500 character limit
        activo: true
      };

      const result = await clientService.createClient(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject client with empty empresa ID', async () => {
      const validData: CreateClientData = {
        nombre: 'Valid Name',
        activo: true
      };

      const result = await clientService.createClient('', validData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject client with null or undefined required fields', async () => {
      const invalidDataSets = [
        { nombre: null, activo: true },
        { nombre: undefined, activo: true },
        { nombre: 'Valid Name', activo: null },
        { nombre: 'Valid Name', activo: undefined }
      ];

      for (const invalidData of invalidDataSets) {
        const result = await clientService.createClient(validEmpresaId, invalidData as any);

        expect(result.success).toBe(false);
        expect(result.errorType).toBe('validation');
        expect(mockFirestore.addDoc).not.toHaveBeenCalled();
      }
    });
  });

  describe('Network Condition Scenarios - Requirement 2.4', () => {
    const validEmpresaId = 'test-empresa-123';
    const validClientData: CreateClientData = {
      nombre: 'Network Test Client',
      telefono: '+1234567890',
      activo: true
    };

    test('should handle network timeout errors', async () => {
      const networkError = new Error('Network request failed');
      (networkError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(networkError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.retryable).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Client creation failed'),
        expect.any(Object)
      );
    });

    test('should handle permission denied errors', async () => {
      const permissionError = new Error('Missing or insufficient permissions');
      (permissionError as any).code = 'permission-denied';
      mockFirestore.addDoc.mockRejectedValue(permissionError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('firestore');
      expect(result.retryable).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Client creation failed'),
        expect.any(Object)
      );
    });

    test('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      (quotaError as any).code = 'resource-exhausted';
      mockFirestore.addDoc.mockRejectedValue(quotaError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('firestore');
      expect(result.retryable).toBe(true);
    });

    test('should handle connection timeout with retry', async () => {
      const timeoutError = new Error('Connection timeout');
      (timeoutError as any).code = 'deadline-exceeded';
      
      // First call fails, second succeeds
      mockFirestore.addDoc
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({ id: 'client-retry-success' });
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('client-retry-success');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(2);
    });

    test('should handle intermittent network failures', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'unavailable';
      
      // Fail twice, then succeed
      mockFirestore.addDoc
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ id: 'client-network-recovery' });
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('client-network-recovery');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retry attempts', async () => {
      const persistentError = new Error('Persistent network error');
      (persistentError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(persistentError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should handle Firestore service unavailable', async () => {
      const serviceError = new Error('Service unavailable');
      (serviceError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(serviceError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.retryable).toBe(true);
    });

    test('should handle duplicate client detection', async () => {
      const duplicateError = new Error('Document already exists');
      (duplicateError as any).code = 'already-exists';
      mockFirestore.addDoc.mockRejectedValue(duplicateError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('firestore');
      expect(result.retryable).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const validEmpresaId = 'test-empresa-123';

    test('should handle malformed Firestore responses', async () => {
      const validClientData: CreateClientData = {
        nombre: 'Malformed Response Test',
        activo: true
      };

      // Mock malformed response (no id)
      mockFirestore.addDoc.mockResolvedValue({});
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
    });

    test('should handle unexpected errors gracefully', async () => {
      const validClientData: CreateClientData = {
        nombre: 'Unexpected Error Test',
        activo: true
      };

      const unexpectedError = new Error('Unexpected error occurred');
      mockFirestore.addDoc.mockRejectedValue(unexpectedError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Client creation failed'),
        expect.any(Object)
      );
    });

    test('should handle collection reference failures', async () => {
      const validClientData: CreateClientData = {
        nombre: 'Collection Error Test',
        activo: true
      };

      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Collection reference failed');
      });

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
    });

    test('should handle timestamp creation failures', async () => {
      const validClientData: CreateClientData = {
        nombre: 'Timestamp Error Test',
        activo: true
      };

      // Mock timestamp failure
      mockFirestore.Timestamp.now = jest.fn().mockImplementation(() => {
        throw new Error('Timestamp creation failed');
      });

      const result = await clientService.createClient(validEmpresaId, validClientData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
    });
  });

  describe('Validation Integration Tests', () => {
    test('should use validateClient function correctly', () => {
      const validData: CreateClientData = {
        nombre: 'Valid Client',
        telefono: '+1234567890',
        email: 'valid@example.com',
        activo: true
      };

      const validation = validateClient(validData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch validation errors from validateClient', () => {
      const invalidData: CreateClientData = {
        nombre: '',
        telefono: 'invalid-phone',
        email: 'invalid-email',
        activo: true
      };

      const validation = validateClient(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should validate phone number formats correctly', () => {
      const phoneTests = [
        { phone: '+1234567890', valid: true },
        { phone: '1234567890', valid: true },
        { phone: '(123) 456-7890', valid: true },
        { phone: '123-456-7890', valid: true },
        { phone: '123', valid: false },
        { phone: 'abc123', valid: false }
      ];

      phoneTests.forEach(({ phone, valid }) => {
        const data: CreateClientData = {
          nombre: 'Test Client',
          telefono: phone,
          activo: true
        };

        const validation = validateClient(data);
        expect(validation.isValid).toBe(valid);
      });
    });

    test('should validate email formats correctly', () => {
      const emailTests = [
        { email: 'valid@example.com', valid: true },
        { email: 'user.name@example.com', valid: true },
        { email: 'user+tag@example.com', valid: true },
        { email: 'invalid-email', valid: false },
        { email: '@example.com', valid: false },
        { email: 'user@', valid: false }
      ];

      emailTests.forEach(({ email, valid }) => {
        const data: CreateClientData = {
          nombre: 'Test Client',
          email: email,
          activo: true
        };

        const validation = validateClient(data);
        expect(validation.isValid).toBe(valid);
      });
    });
  });

  describe('Logging and Debugging Tests', () => {
    const validEmpresaId = 'test-empresa-123';
    const validClientData: CreateClientData = {
      nombre: 'Logging Test Client',
      telefono: '+1234567890',
      activo: true
    };

    test('should log all creation steps', async () => {
      const mockClientRef = { id: 'client-logging' };
      mockFirestore.addDoc.mockResolvedValue(mockClientRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      await clientService.createClient(validEmpresaId, validClientData);

      // Verify comprehensive logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting client creation'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Validating client data'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Creating client in Firestore'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Client created successfully'),
        expect.any(Object)
      );
    });

    test('should log validation failures with details', async () => {
      const invalidData: CreateClientData = {
        nombre: '',
        activo: true
      };

      await clientService.createClient(validEmpresaId, invalidData);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
        expect.objectContaining({
          errors: expect.arrayContaining([expect.any(String)])
        })
      );
    });

    test('should log Firestore errors with context', async () => {
      const firestoreError = new Error('Firestore error');
      (firestoreError as any).code = 'internal';
      mockFirestore.addDoc.mockRejectedValue(firestoreError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      await clientService.createClient(validEmpresaId, validClientData);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Client creation failed'),
        expect.objectContaining({
          empresaId: validEmpresaId,
          clientName: validClientData.nombre,
          error: expect.objectContaining({
            name: 'Error',
            message: 'Firestore error'
          })
        })
      );
    });

    test('should log client data structure without sensitive info', async () => {
      const sensitiveClientData: CreateClientData = {
        nombre: 'Sensitive Client',
        telefono: '+1234567890',
        email: 'sensitive@example.com',
        direccion: 'Secret Address 123',
        activo: true
      };

      const mockClientRef = { id: 'client-sensitive' };
      mockFirestore.addDoc.mockResolvedValue(mockClientRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      await clientService.createClient(validEmpresaId, sensitiveClientData);

      // Verify that logging doesn't expose full sensitive data
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting client creation'),
        expect.objectContaining({
          clientData: expect.objectContaining({
            nombre: 'Sensitive Client',
            hasTelefono: true,
            hasEmail: true,
            hasDireccion: true,
            activo: true
          })
        })
      );
    });
  });
});