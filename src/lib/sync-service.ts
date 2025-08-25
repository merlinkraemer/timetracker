import { TimeTrackerData, Session } from "@/types";

export interface SyncResult {
  success: boolean;
  data?: TimeTrackerData;
  version?: number;
  conflict?: boolean;
  error?: string;
}

class SyncService {
  private static instance: SyncService;
  private currentVersion: number = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private onDataChange: ((data: TimeTrackerData) => void) | null = null;
  private pollIntervalMs: number = 10000; // Poll every 10 seconds instead of 2
  private clientId: string;

  private constructor() {
    // Generate unique client ID
    this.clientId = this.generateClientId();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getClientId(): string {
    return this.clientId;
  }

  setOnDataChange(callback: (data: TimeTrackerData) => void) {
    this.onDataChange = callback;
  }

  setCurrentVersion(version: number) {
    this.currentVersion = version;
  }

  getCurrentVersion(): number {
    return this.currentVersion;
  }

  async loadData(): Promise<SyncResult> {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        if (response.status === 401) {
          // Don't redirect here - let the context handle authentication
          return { success: false, error: 'Unauthorized' };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      this.currentVersion = result._version || 0;
      
      // Remove internal fields
      const { ...cleanData } = result;
      
      return {
        success: true,
        data: cleanData,
        version: this.currentVersion,
      };
    } catch (error) {
      console.error('Error loading data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async saveData(data: TimeTrackerData): Promise<SyncResult> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data,
            expectedVersion: this.currentVersion,
            clientId: this.clientId,
          }),
        });

        if (response.status === 401) {
          // Don't redirect here - let the context handle authentication
          return { success: false, error: 'Unauthorized' };
        }

        if (response.status === 409) {
          // Conflict - data has been modified by another client
          const conflictData = await response.json();
          this.currentVersion = conflictData.actualVersion;
          
          // If this is the first conflict, try to retry with updated version
          if (retryCount < maxRetries - 1) {
            retryCount++;
            console.log(`Save conflict, retrying ${retryCount}/${maxRetries} with updated version ${this.currentVersion}`);
            
            // Wait with exponential backoff before retry
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            
            continue; // Try again with updated version
          }
          
          // Max retries reached, return conflict
          return {
            success: false,
            conflict: true,
            data: conflictData.currentData,
            version: this.currentVersion,
            error: conflictData.error,
          };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        this.currentVersion = result.version;
        
        return {
          success: true,
          version: this.currentVersion,
        };
      } catch (error) {
        console.error(`Error saving data (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < maxRetries - 1) {
          retryCount++;
          // Wait with exponential backoff before retry
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    
    // This should never be reached, but just in case
    return {
      success: false,
      error: 'Max retries exceeded',
    };
  }

  async checkForUpdates(): Promise<boolean> {
    try {
      const response = await fetch('/api/data', { method: 'HEAD' });
      if (response.status === 401) {
        // Don't redirect here - let the context handle authentication
        return false;
      }
      
      if (!response.ok) return false;
      
      const versionHeader = response.headers.get('X-Data-Version');
      if (!versionHeader) return false;
      
      const serverVersion = parseInt(versionHeader, 10);
      if (serverVersion > this.currentVersion) {
        return true; // Updates available
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }

  startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.syncInterval = setInterval(async () => {
      if (await this.checkForUpdates()) {
        // Data has changed, reload it
        const result = await this.loadData();
        if (result.success && result.data && this.onDataChange) {
          this.onDataChange(result.data);
        }
      }
    }, this.pollIntervalMs);
  }

  stopPolling() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isPolling = false;
  }

  setPollInterval(intervalMs: number) {
    this.pollIntervalMs = intervalMs;
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  async saveCurrentSession(session: Session): Promise<boolean> {
    try {
      const response = await fetch('/api/current-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentSession: session }),
      });

      if (!response.ok) {
        console.error('Failed to save current session:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error saving current session:', error);
      return false;
    }
  }

  async clearCurrentSession(): Promise<boolean> {
    try {
      const response = await fetch('/api/current-session', {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Failed to clear current session:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error clearing current session:', error);
      return false;
    }
  }

  // Get sync method being used
  getSyncMethod(): 'polling' {
    return 'polling';
  }

  // Force fallback to polling
  forcePolling() {
    this.startPolling();
  }
}

export const syncService = SyncService.getInstance();
