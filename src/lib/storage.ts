import { TimeTrackerData } from "@/types";

const STORAGE_KEY = "timetracker-data";

const defaultData: TimeTrackerData = {
  sessions: [],
  projects: [
    { name: "General", color: "#3B82F6" },
    { name: "Development", color: "#10B981" },
    { name: "Meeting", color: "#F59E0B" },
  ],
};

export const loadData = (): TimeTrackerData => {
  if (typeof window === "undefined") return defaultData;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return { ...defaultData, ...data };
    }
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
  }

  return defaultData;
};

export const saveData = (data: TimeTrackerData): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
  }
};

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
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
