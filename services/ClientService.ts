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
  async createClient(clientData: CreateClientData): Promise<ServiceResponse<string>> {
    const context = 'ClientService.createClient';
    console.log(`${context}: Iniciando cliente creation`, {
      empresaId: this.empresaId,
      clientName: clientData.nombre
    });
    try {
      console.log(`${context}: Validando cliente data`);
      const validation = validateClient(clientData);
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }
      console.log(`${context}: Validación passed`);
      const clientDoc = {
        ...clientData,
        deudaActual: 0, // Initialize with no debt
        creado: Timestamp.now(),
        actualizado: Timestamp.now()
      };
      const docRef = await addDoc(this.getClientCollection(), clientDoc);
      console.log(`${context}: Cliente creado exitosamente`, { 
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
      console.log(`${context}: Obtenido ${clients.length} clients`);
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
  async updateClient(clientId: string, updateData: UpdateClientData): Promise<ServiceResponse<void>> {
    const context = 'ClientService.updateClient';
    try {
      if (updateData.nombre !== undefined) {
        const validation = validateClient({ ...updateData, nombre: updateData.nombre } as CreateClientData);
        if (!validation.isValid) {
          return {
            success: false,
            errors: validation.errors
          };
        }
      }
      const updateDocData = {
        ...updateData,
        actualizado: Timestamp.now()
      };
      await updateDoc(this.getClientDoc(clientId), updateDocData);
      console.log(`${context}: Cliente actualizado exitosamente`, { clientId });
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
  async deleteClient(clientId: string): Promise<ServiceResponse<void>> {
    const context = 'ClientService.deleteClient';
    try {
      await deleteDoc(this.getClientDoc(clientId));
      console.log(`${context}: Cliente eliminado exitosamente`, { clientId });
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
  async searchClients(searchTerm: string): Promise<ServiceResponse<Client[]>> {
    const context = 'ClientService.searchClients';
    try {
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
  async toggleClientVisibility(clientId: string): Promise<{ success: boolean; isHidden?: boolean; error?: string }> {
    const context = 'ClientService.toggleClientVisibility';
    try {
      const clientResult = await this.getClient(clientId);
      if (!clientResult.success || !clientResult.data) {
        return {
          success: false,
          error: 'Cliente no encontrado'
        };
      }
      const client = clientResult.data;
      const newHiddenState = !client.oculto;
      const updateResult = await this.updateClient(clientId, {
        oculto: newHiddenState
      });
      if (updateResult.success) {
        console.log(`${context}: Cliente visibilidad cambiado exitosamente`, { 
          clientId, 
          wasHidden: client.oculto, 
          nowHidden: newHiddenState 
        });
        return {
          success: true,
          isHidden: newHiddenState
        };
      } else {
        return {
          success: false,
          error: updateResult.errors?.join('\n') || 'Error al cambiar visibilidad'
        };
      }
    } catch (error) {
      console.error(`${context}: Failed to toggle visibility`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  async recalculateClientDebt(clientId: string): Promise<ServiceResponse<void>> {
    const context = 'ClientService.recalculateClientDebt';
    try {
      const { recalculateAndUpdateClientDebt } = await import('@/schemas/firestore-utils');
      await recalculateAndUpdateClientDebt(this.empresaId, clientId);
      console.log(`${context}: Deuda recalculado exitosamente for cliente ${clientId}`);
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