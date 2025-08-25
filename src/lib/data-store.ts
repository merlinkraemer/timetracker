import { promises as fs } from 'fs';
import path from 'path';
import { TimeTrackerData } from '@/types';

interface DataWithMetadata extends TimeTrackerData {
  _version: number;
  _lastModified: string;
  _userId: string;
  _clients: string[]; // Track active clients
}

class DataStore {
  private static instance: DataStore;
  private readonly DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : process.cwd() + '/data';
  private readonly LOCK_FILE = process.env.NODE_ENV === 'production' ? '/app/data/.lock' : process.cwd() + '/data/.lock';
  private readonly USER_DATA_FILE = (userId: string) => process.env.NODE_ENV === 'production' 
    ? `/app/data/data_${userId}.json` 
    : `${process.cwd()}/data/data_${userId}.json`;
  private readonly CLIENT_TIMEOUT = 30000; // 30 seconds

  private constructor() {
    this.ensureDataDir();
  }

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.DATA_DIR);
    } catch {
      try {
        await fs.mkdir(this.DATA_DIR, { recursive: true });
        console.log(`Created data directory: ${this.DATA_DIR}`);
      } catch (error) {
        console.error(`Failed to create data directory ${this.DATA_DIR}:`, error);
        throw error;
      }
    }
  }

  private async acquireLock(): Promise<boolean> {
    try {
      // Check if lock exists and is stale
      try {
        const lockContent = await fs.readFile(this.LOCK_FILE, 'utf-8');
        const lockData = JSON.parse(lockContent);
        const lockTime = new Date(lockData.timestamp).getTime();
        const now = Date.now();
        
        if (now - lockTime > this.CLIENT_TIMEOUT) {
          // Lock is stale, remove it
          console.log('Removing stale lock file');
          await fs.unlink(this.LOCK_FILE);
        } else {
          console.log('Lock file is still valid, cannot acquire');
          return false; // Lock is still valid
        }
      } catch {
        // Lock file doesn't exist, we can acquire it
      }

      // Create lock file with atomic write
      const lockData = {
        timestamp: new Date().toISOString(),
        pid: process.pid,
        clientId: `pid_${process.pid}_${Date.now()}`,
      };
      
      // Use atomic write to prevent race conditions
      await fs.writeFile(this.LOCK_FILE, JSON.stringify(lockData));
      
      // Verify we actually got the lock by reading it back
      try {
        const verifyContent = await fs.readFile(this.LOCK_FILE, 'utf-8');
        const verifyData = JSON.parse(verifyContent);
        if (verifyData.clientId === lockData.clientId) {
          console.log('Lock acquired successfully');
          return true;
        } else {
          console.log('Lock was acquired by another process');
          return false;
        }
      } catch {
        console.log('Failed to verify lock acquisition');
        return false;
      }
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.LOCK_FILE);
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }

  private async waitForLock(maxWaitTime = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      if (await this.acquireLock()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  async loadUserData(userId: string): Promise<TimeTrackerData> {
    try {
      const filePath = this.USER_DATA_FILE(userId);
      console.log(`Loading user data from: ${filePath}`);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsedData: DataWithMetadata = JSON.parse(data);
      
      // Remove internal fields
      const { ...cleanData } = parsedData;
      console.log(`Successfully loaded data for user: ${userId}`);
      return cleanData;
    } catch (error) {
      console.log(`No existing data found for user ${userId}, using defaults:`, error);
      // Return default data if file doesn't exist
      return {
        sessions: [],
        projects: [
          { name: "General", color: "#3B82F6" },
          { name: "Development", color: "#10B981" },
          { name: "Meeting", color: "#F59E0B" },
        ],
        currentSession: undefined,
      };
    }
  }

  async saveUserData(userId: string, data: TimeTrackerData, clientId: string, expectedVersion?: number): Promise<{ success: boolean; version: number; conflict?: boolean }> {
    const acquired = await this.waitForLock();
    if (!acquired) {
      console.error(`Failed to acquire lock for user ${userId}`);
      return { success: false, version: 0, conflict: true };
    }

    try {
      const filePath = this.USER_DATA_FILE(userId);
      console.log(`Saving user data to: ${filePath}`);
      
      // Load current data to check version
      let currentData: DataWithMetadata;
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        currentData = JSON.parse(fileContent);
      } catch {
        console.log(`Creating new data file for user ${userId}`);
        currentData = { 
          _version: 0, 
          _lastModified: new Date().toISOString(), 
          _userId: userId,
          _clients: [],
          ...data 
        };
      }

      // Check for conflicts
      if (expectedVersion !== undefined && currentData._version !== expectedVersion) {
        console.log(`Version conflict for user ${userId}: expected ${expectedVersion}, got ${currentData._version}`);
        await this.releaseLock();
        return { success: false, version: currentData._version, conflict: true };
      }

      // Update data with new version and client tracking
      const now = new Date();
      const updatedData: DataWithMetadata = {
        ...data,
        _version: currentData._version + 1,
        _lastModified: now.toISOString(),
        _userId: userId,
        _clients: this.updateClientList(currentData._clients, clientId, now),
      };

      // Save to file
      await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));
      console.log(`Successfully saved data for user ${userId}, version ${updatedData._version}`);
      
      await this.releaseLock();
      return { success: true, version: updatedData._version };
    } catch (error) {
      await this.releaseLock();
      console.error(`Error saving data for user ${userId}:`, error);
      return { success: false, version: 0 };
    }
  }

  private updateClientList(clients: string[], clientId: string, now: Date): string[] {
    const timeout = now.getTime() - this.CLIENT_TIMEOUT;
    
    // Remove stale clients and add current one
    const activeClients = clients.filter(client => {
      try {
        const [, timestamp] = client.split(':');
        return new Date(timestamp).getTime() > timeout;
      } catch {
        return false;
      }
    });
    
    // Add current client
    activeClients.push(`${clientId}:${now.toISOString()}`);
    
    // Remove duplicates
    return [...new Set(activeClients)];
  }

  async getActiveClients(userId: string): Promise<string[]> {
    try {
      const filePath = this.USER_DATA_FILE(userId);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsedData: DataWithMetadata = JSON.parse(data);
      
      const now = new Date();
      const timeout = now.getTime() - this.CLIENT_TIMEOUT;
      
      return parsedData._clients
        .filter(client => {
          try {
            const [, timestamp] = client.split(':');
            return new Date(timestamp).getTime() > timeout;
          } catch {
            return false;
          }
        })
        .map(client => client.split(':')[0]);
    } catch {
      return [];
    }
  }

  async getDataVersion(userId: string): Promise<number> {
    try {
      const filePath = this.USER_DATA_FILE(userId);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsedData: DataWithMetadata = JSON.parse(data);
      return parsedData._version || 0;
    } catch {
      return 0;
    }
  }

  async cleanupStaleData(): Promise<void> {
    try {
      const files = await fs.readdir(this.DATA_DIR);
      
      for (const file of files) {
        if (file.startsWith('user_') && file.endsWith('.json')) {
          const filePath = path.join(this.DATA_DIR, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const parsedData: DataWithMetadata = JSON.parse(data);
          
          const now = new Date();
          const lastModified = new Date(parsedData._lastModified);
          
          // Remove files older than 30 days
          if (now.getTime() - lastModified.getTime() > 30 * 24 * 60 * 60 * 1000) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up stale data:', error);
    }
  }
}

export const dataStore = DataStore.getInstance();
