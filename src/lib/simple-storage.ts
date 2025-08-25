// Simple storage utilities for local-first time tracker
// Uses localStorage for timer state and provides simple file save/load for history

export interface SimpleStorageData {
  sessions: Array<{
    id: string;
    start: string;
    end?: string;
    project: string;
    description: string;
  }>;
  projects: Array<{
    name: string;
    color: string;
  }>;
}

export interface TimerState {
  start: string;
  project: string;
  description: string;
  isPaused: boolean;
  pauseStartTime?: string;
  totalPausedTime: number;
  timestamp: number;
}

// Timer state management with localStorage
export const timerStorage = {
  // Save current timer state
  saveTimerState: (state: TimerState): void => {
    try {
      localStorage.setItem('currentTimerState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save timer state to localStorage:', error);
    }
  },

  // Load current timer state
  loadTimerState: (): TimerState | null => {
    try {
      const saved = localStorage.getItem('currentTimerState');
      if (!saved) return null;
      
      const state = JSON.parse(saved);
      const now = Date.now();
      
      // Check if timer state is recent (within last 24 hours)
      if (now - state.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('currentTimerState');
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Failed to load timer state from localStorage:', error);
      return null;
    }
  },

  // Clear timer state
  clearTimerState: (): void => {
    try {
      localStorage.removeItem('currentTimerState');
    } catch (error) {
      console.error('Failed to clear timer state from localStorage:', error);
    }
  },

  // Save app data to localStorage
  saveAppData: (data: SimpleStorageData): void => {
    try {
      localStorage.setItem('timetrackerData', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save app data to localStorage:', error);
    }
  },

  // Load app data from localStorage
  loadAppData: (): SimpleStorageData => {
    try {
      const saved = localStorage.getItem('timetrackerData');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load app data from localStorage:', error);
    }
    
    // Return default data if nothing saved
    return {
      sessions: [],
      projects: [],
    };
  },
};

// Simple file export functionality
export const fileExport = {
  // Export data as JSON file
  exportToFile: (data: SimpleStorageData, filename: string = 'timetracker-export.json'): void => {
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = filename;
      link.click();
      
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to export data to file:', error);
    }
  },

  // Import data from JSON file
  importFromFile: (file: File): Promise<SimpleStorageData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate data structure
          if (data.sessions && data.projects) {
            resolve(data);
          } else {
            reject(new Error('Invalid data format'));
          }
        } catch {
          reject(new Error('Failed to parse file content'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
};
