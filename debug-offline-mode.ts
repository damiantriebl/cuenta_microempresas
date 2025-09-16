import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export class OfflineModeDebugger {
  private static isOfflineForced = false;

  static async forceOffline(): Promise<void> {
    try {
      await disableNetwork(db);
      this.isOfflineForced = true;
      console.log('🔴 FIRESTORE OFFLINE MODE ENABLED - No network operations will work');
      
      // Show visual indicator
      if (typeof window !== 'undefined') {
        const indicator = document.createElement('div');
        indicator.id = 'offline-debug-indicator';
        indicator.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #ff4444;
          color: white;
          text-align: center;
          padding: 8px;
          z-index: 9999;
          font-weight: bold;
        `;
        indicator.textContent = '🔴 FIRESTORE OFFLINE MODE - DEBUG';
        document.body.appendChild(indicator);
      }
    } catch (error) {
      console.error('Error forcing offline mode:', error);
    }
  }

  static async forceOnline(): Promise<void> {
    try {
      await enableNetwork(db);
      this.isOfflineForced = false;
      console.log('🟢 FIRESTORE ONLINE MODE ENABLED - Network operations restored');
      
      // Remove visual indicator
      if (typeof window !== 'undefined') {
        const indicator = document.getElementById('offline-debug-indicator');
        if (indicator) {
          indicator.remove();
        }
      }
    } catch (error) {
      console.error('Error restoring online mode:', error);
    }
  }

  static isOffline(): boolean {
    return this.isOfflineForced;
  }

  static async toggleOfflineMode(): Promise<void> {
    if (this.isOfflineForced) {
      await this.forceOnline();
    } else {
      await this.forceOffline();
    }
  }
}

// Para usar en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).debugOffline = OfflineModeDebugger;
}