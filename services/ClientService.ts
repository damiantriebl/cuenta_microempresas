import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
  Client,
  CreateClientData,
  UpdateClientData,
  ValidationResult,
  ServiceResponse,
  COLLECTIONS
} from '@/schemas/types';
import { validateClient } from '@/schemas/validation';

export class ClientService {
  private empresaId: string;

  constructor(empresaId: string) {
    this.empresaId = empresaId;
  }

  private getClientCollection() {
    return collection(db, COLLECTIONS.EMPRESAS, this.empresaId, COLLECTIONS.CLIENTES);
  }

  private getClientDoc(clientId: string) {
    return doc(db, COLLECTIONS.EMPRESAS, this.empresaId, COLLECTIONS.CLIENTES, clientId);
  }

  /**
   * Create a new client
   */
  async createClient(clientData: CreateClientData): Promise<ServiceResponse<string>> {
    const context = 'ClientService.createClient';

    console.log(`${context}: Starting client creation`, {
      empresaId: this.empresaId,
      clientName: clientData.nombre
    });

    try {
      // Step 1: Validate client data
      console.log(`${context}: Validating client data`);
      const validation = validateClient(clientData);
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      console.log(`${context}: Validation passed`);

      // Step 2: Prepare client document
      const clientDoc = {
        ...clientData,
        deudaActual: 0, // Initialize with no debt
        creado: Timestamp.now(),
        actualizado: Timestamp.now()
      };

      // Step 3: Add to Firestore
      const docRef = await addDoc(this.getClientCollection(), clientDoc);

      console.log(`${context}: Client created successfully`, { 
        clientId: docRef.id,
        clientName: clientData.nombre 
      });

      return {
        success: true,
        data: docRef.id
      };

    } catch (error) {
      console.error(`${context}: Client creation failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Get all clients for the company
   */
  async getClients(): Promise<ServiceResponse<Client[]>> {
    const context = 'ClientService.getClients';

    try {
      const q = query(
        this.getClientCollection(),
        orderBy('nombre', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const clients: Client[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        clients.push({
          id: doc.id,
          ...data,
          deudaActual: data.deudaActual ?? 0, // Ensure deudaActual is always a number
          creado: data.creado,
          actualizado: data.actualizado,
          fechaImportante: data.fechaImportante || null
        } as Client);
      });

      console.log(`${context}: Retrieved ${clients.length} clients`);

      return {
        success: true,
        data: clients
      };

    } catch (error) {
      console.error(`${context}: Failed to get clients`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Update an existing client
   */
  async updateClient(clientId: string, updateData: UpdateClientData): Promise<ServiceResponse<void>> {
    const context = 'ClientService.updateClient';

    try {
      // Validate update data if needed
      if (updateData.nombre !== undefined) {
        const validation = validateClient({ ...updateData, nombre: updateData.nombre } as CreateClientData);
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors
          };
        }
      }

      // Add timestamp
      const updateDoc = {
        ...updateData,
        actualizado: Timestamp.now()
      };

      await updateDoc(this.getClientDoc(clientId), updateDoc);

      console.log(`${context}: Client updated successfully`, { clientId });

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      console.error(`${context}: Client update failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<ServiceResponse<void>> {
    const context = 'ClientService.deleteClient';

    try {
      await deleteDoc(this.getClientDoc(clientId));

      console.log(`${context}: Client deleted successfully`, { clientId });

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      console.error(`${context}: Client deletion failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<ServiceResponse<Client | null>> {
    const context = 'ClientService.getClient';

    try {
      const docSnap = await getDoc(this.getClientDoc(clientId));

      if (!docSnap.exists()) {
        return {
          success: true,
          data: null
        };
      }

      const data = docSnap.data();
      const client: Client = {
        id: docSnap.id,
        ...data,
        deudaActual: data.deudaActual ?? 0, // Ensure deudaActual is always a number
        creado: data.creado,
        actualizado: data.actualizado,
        fechaImportante: data.fechaImportante || null
      } as Client;

      return {
        success: true,
        data: client
      };

    } catch (error) {
      console.error(`${context}: Failed to get client`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Subscribe to client changes
   */
  subscribeToClients(callback: (clients: Client[]) => void) {
    const q = query(
      this.getClientCollection(),
      orderBy('nombre', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const clients: Client[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        clients.push({
          id: doc.id,
          ...data,
          deudaActual: data.deudaActual ?? 0, // Ensure deudaActual is always a number
          creado: data.creado,
          actualizado: data.actualizado,
          fechaImportante: data.fechaImportante || null
        } as Client);
      });

      callback(clients);
    });
  }

  /**
   * Search clients by name
   */
  async searchClients(searchTerm: string): Promise<ServiceResponse<Client[]>> {
    const context = 'ClientService.searchClients';

    try {
      // Get all clients and filter locally (Firestore doesn't support case-insensitive search)
      const result = await this.getClients();
      
      if (!result.success) {
        return result;
      }

      const filteredClients = result.data!.filter(client =>
        client.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return {
        success: true,
        data: filteredClients
      };

    } catch (error) {
      console.error(`${context}: Search failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Recalculate debt for a specific client (utility function)
   */
  async recalculateClientDebt(clientId: string): Promise<ServiceResponse<void>> {
    const context = 'ClientService.recalculateClientDebt';

    try {
      const { recalculateAndUpdateClientDebt } = await import('@/schemas/firestore-utils');
      await recalculateAndUpdateClientDebt(this.empresaId, clientId);

      console.log(`${context}: Debt recalculated successfully for client ${clientId}`);

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      console.error(`${context}: Failed to recalculate debt`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
}

export default ClientService;