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

  /**
   * Get debt for a specific client
   */
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

  /**
   * Set debt for a specific client
   */
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
      console.log(`SimpleDebtService: Updated debt for ${clientName}: ${debt}`);
    } catch (error) {
      console.error('SimpleDebtService.setClientDebt: Error setting debt', error);
    }
  }

  /**
   * Add to client debt (for sales)
   */
  async addToClientDebt(empresaId: string, clientId: string, clientName: string, amount: number): Promise<void> {
    const currentDebt = await this.getClientDebt(empresaId, clientId);
    await this.setClientDebt(empresaId, clientId, clientName, currentDebt + amount);
  }

  /**
   * Subtract from client debt (for payments)
   */
  async subtractFromClientDebt(empresaId: string, clientId: string, clientName: string, amount: number): Promise<void> {
    const currentDebt = await this.getClientDebt(empresaId, clientId);
    await this.setClientDebt(empresaId, clientId, clientName, currentDebt - amount);
  }

  /**
   * Get all client debts for a company
   */
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

  /**
   * Clear all debts for a company
   */
  async clearCompanyDebts(empresaId: string): Promise<void> {
    try {
      const storage = await this.getStorage();
      delete storage[empresaId];
      await this.saveStorage(storage);
      console.log(`SimpleDebtService: Cleared all debts for company ${empresaId}`);
    } catch (error) {
      console.error('SimpleDebtService.clearCompanyDebts: Error clearing debts', error);
    }
  }

  /**
   * Sync all client debts from Firestore transactions (automatic sync)
   */
  async syncAllClientDebts(empresaId: string): Promise<void> {
    try {
      console.log('SimpleDebtService: Starting automatic debt sync...');
      
      // Import firestore functions
      const { getClients, getClientEvents } = await import('@/schemas/firestore-utils');
      const { calculateClientDebt } = await import('@/schemas/business-logic');
      
      // Get all clients
      const clients = await getClients(empresaId);
      
      for (const client of clients) {
        try {
          // Get client events
          const events = await getClientEvents(empresaId, client.id);
          
          if (events.length > 0) {
            // Calculate debt from transactions
            const calculation = calculateClientDebt(events);
            const finalDebt = calculation.totalDebt - calculation.favorBalance;
            
            // Update simple debt
            await this.setClientDebt(empresaId, client.id, client.nombre, finalDebt);
            console.log(`Synced debt for ${client.nombre}: ${finalDebt}`);
          } else {
            // No transactions, ensure debt is 0
            await this.setClientDebt(empresaId, client.id, client.nombre, 0);
          }
        } catch (error) {
          console.warn(`Failed to sync debt for client ${client.id}:`, error);
        }
      }
      
      console.log('SimpleDebtService: Debt sync completed');
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
