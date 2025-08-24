import { TimeTrackerData, CurrentSession } from "@/types";

const API_BASE = "/api/data";

export const loadDataFromServer = async (): Promise<TimeTrackerData> => {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error("Failed to load data");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading data from server:", error);
    // Return default data if server fails
    return {
      sessions: [],
      projects: [],
      currentSession: undefined,
    };
  }
};

export const saveDataToServer = async (
  data: TimeTrackerData
): Promise<boolean> => {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Error saving data to server:", error);
    return false;
  }
};

export const saveCurrentSessionToServer = async (
  session: CurrentSession
): Promise<boolean> => {
  try {
    // First load current data
    const currentData = await loadDataFromServer();

    // Update with current session (convert Date to string for storage)
    const updatedData: TimeTrackerData = {
      ...currentData,
      currentSession: {
        id: "current",
        start: session.start.toISOString(),
        end: undefined,
        project: session.project,
        description: session.description,
      },
    };

    return await saveDataToServer(updatedData);
  } catch (error) {
    console.error("Error saving current session:", error);
    return false;
  }
};

export const clearCurrentSessionFromServer = async (): Promise<boolean> => {
  try {
    // Load current data
    const currentData = await loadDataFromServer();

    // Remove current session
    const updatedData: TimeTrackerData = {
      ...currentData,
      currentSession: undefined,
    };

    return await saveDataToServer(updatedData);
  } catch (error) {
    console.error("Error clearing current session:", error);
    return false;
  }
};

// Keep the original localStorage functions as fallback
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
