import { promises as fs } from 'fs';
import { TimeTrackerData } from '@/types';

class DataStore {
  private static instance: DataStore;
  private readonly DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : process.cwd() + '/data';
  private readonly DATA_FILE = process.env.NODE_ENV === 'production' ? '/app/data/timetracker.json' : process.cwd() + '/data/timetracker.json';

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

  async loadData(): Promise<TimeTrackerData> {
    try {
      console.log(`Loading data from: ${this.DATA_FILE}`);
      const data = await fs.readFile(this.DATA_FILE, 'utf-8');
      const parsedData: TimeTrackerData = JSON.parse(data);
      console.log(`Successfully loaded data`);
      return parsedData;
    } catch (error) {
      console.log(`No existing data found, using defaults:`, error);
      // Return default data if file doesn't exist
      return {
        sessions: [],
        projects: [],
      };
    }
  }

  async saveData(data: TimeTrackerData): Promise<{ success: boolean }> {
    try {
      console.log(`Saving data to: ${this.DATA_FILE}`);
      
      // Save to file with pretty formatting
      await fs.writeFile(this.DATA_FILE, JSON.stringify(data, null, 2));
      console.log(`Successfully saved data`);
      
      return { success: true };
    } catch (error) {
      console.error(`Error saving data:`, error);
      return { success: false };
    }
  }
}

export const dataStore = DataStore.getInstance();
