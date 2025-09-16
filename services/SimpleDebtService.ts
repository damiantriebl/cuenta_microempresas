import AsyncStorage from '@react-native-async-storage/async-storage';
interface ClientDebt {
  clientId: string;
  clientName: string;
  debt: number; // Positive = debe, Negative = a favor
  lastUpdated: string;
}
interface DebtStorage {
  [empresaId: string]: {
    [clientId: string]: ClientDebt;
  };
}
export class SimpleDebtService {
  private static instance: SimpleDebtService;
  private static readonly STORAGE_KEY = 'client_debts_simple';
  static getInstance(): SimpleDebtService {
    if (!SimpleDebtService.instance) {
      SimpleDebtService.instance = new SimpleDebtService();
    }
    return SimpleDebtService.instance;
  }
  async getClientDebt(empresaId: string, clientId: string): Promise<number> {
    try {
      const storage = await this.getStorage();
      const clientDebt = storage[empresaId]?.[clientId];
      return clientDebt?.debt ?? 0;
    } catch (error) {
      console.warn('SimpleDebtService.getClientDebt: Error getting debt', error);
      return 0;
    }
  }
  async setClientDebt(empresaId: string, clientId: string, clientName: string, debt: number): Promise<void> {
    try {
      const storage = await this.getStorage();
      if (!storage[empresaId]) {
        storage[empresaId] = {};
      }
      storage[empresaId][clientId] = {
        clientId,
        clientName,
        debt,
        lastUpdated: new Date().toISOString()
      };
      await this.saveStorage(storage);
      console.log(`SimpleDebtService: Actualizado deuda for ${clientName}: ${debt}`);
    } catch (error) {
      console.error('SimpleDebtService.setClientDebt: Error setting debt', error);
    }
  }
  async addToClientDebt(empresaId: string, clientId: string, clientName: string, amount: number): Promise<void> {
    const currentDebt = await this.getClientDebt(empresaId, clientId);
    await this.setClientDebt(empresaId, clientId, clientName, currentDebt + amount);
  }
  async subtractFromClientDebt(empresaId: string, clientId: string, clientName: string, amount: number): Promise<void> {
    const currentDebt = await this.getClientDebt(empresaId, clientId);
    await this.setClientDebt(empresaId, clientId, clientName, currentDebt - amount);
  }
  async getAllClientDebts(empresaId: string): Promise<ClientDebt[]> {
    try {
      const storage = await this.getStorage();
      const companyDebts = storage[empresaId] || {};
      return Object.values(companyDebts);
    } catch (error) {
      console.warn('SimpleDebtService.getAllClientDebts: Error getting debts', error);
      return [];
    }
  }
  async clearCompanyDebts(empresaId: string): Promise<void> {
    try {
      const storage = await this.getStorage();
      delete storage[empresaId];
      await this.saveStorage(storage);
      console.log(`SimpleDebtService: Limpiado all debts for empresa ${empresaId}`);
    } catch (error) {
      console.error('SimpleDebtService.clearCompanyDebts: Error clearing debts', error);
    }
  }
  async syncAllClientDebts(empresaId: string): Promise<void> {
    try {
      console.log('SimpleDebtService: Iniciando automático deuda sincronización...');
      const { getClients, getClientEvents } = await import('@/schemas/firestore-utils');
      const { calculateClientDebt } = await import('@/schemas/business-logic');
      const clients = await getClients(empresaId);
      for (const client of clients) {
        try {
          const events = await getClientEvents(empresaId, client.id);
          if (events.length > 0) {
            const calculation = calculateClientDebt(events);
            const finalDebt = calculation.totalDebt - calculation.favorBalance;
            await this.setClientDebt(empresaId, client.id, client.nombre, finalDebt);
            console.log(`Synced deuda for ${client.nombre}: ${finalDebt}`);
          } else {
            await this.setClientDebt(empresaId, client.id, client.nombre, 0);
          }
        } catch (error) {
          console.warn(`Failed to sync debt for client ${client.id}:`, error);
        }
      }
      console.log('SimpleDebtService: Deuda sincronización completado');
    } catch (error) {
      console.error('SimpleDebtService: Failed to sync debts:', error);
    }
  }
  private async getStorage(): Promise<DebtStorage> {
    try {
      const data = await AsyncStorage.getItem(SimpleDebtService.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('SimpleDebtService.getStorage: Error reading storage', error);
      return {};
    }
  }
  private async saveStorage(storage: DebtStorage): Promise<void> {
    try {
      await AsyncStorage.setItem(SimpleDebtService.STORAGE_KEY, JSON.stringify(storage));
    } catch (error) {
      console.error('SimpleDebtService.saveStorage: Error saving storage', error);
    }
  }
}
export default SimpleDebtService;
