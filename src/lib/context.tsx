"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { TimeTrackerData, CurrentSession } from "@/types";
import {
  loadDataFromServer,
  saveDataToServer,
  saveCurrentSessionToServer,
  clearCurrentSessionFromServer,
} from "@/lib/api-storage";

interface TimeTrackerContextType {
  data: TimeTrackerData;
  setData: React.Dispatch<React.SetStateAction<TimeTrackerData>>;
  currentSession: CurrentSession | null;
  setCurrentSession: React.Dispatch<
    React.SetStateAction<CurrentSession | null>
  >;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(
  undefined
);

export function TimeTrackerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TimeTrackerData>({
    sessions: [],
    projects: [],
  });
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load data on provider mount
  useEffect(() => {
    const loadDataAsync = async () => {
      try {
        console.log("Context: Starting to load data...");
        setIsLoading(true);
        const loadedData = await loadDataFromServer();
        console.log("Context: Data loaded successfully:", loadedData);
        setData(loadedData);

        // Restore current session from server if it exists
        if (loadedData.currentSession) {
          const session = loadedData.currentSession;
          // Check if the session is still valid (not older than 24 hours)
          const sessionStart = new Date(session.start);
          const now = new Date();
          if (now.getTime() - sessionStart.getTime() < 24 * 60 * 60 * 1000) {
            // Convert start back to Date object for proper functionality
            const restoredSession: CurrentSession = {
              start: sessionStart,
              project: session.project,
              description: session.description || "",
              elapsed: now.getTime() - sessionStart.getTime(),
            };
            console.log("Context: Restored current session:", restoredSession);
            setCurrentSession(restoredSession);
          } else {
            // Session is too old, clear it from server
            console.log("Context: Session too old, clearing from server");
            await clearCurrentSessionFromServer();
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        // Set default data on error
        setData({
          sessions: [],
          projects: [],
        });
      } finally {
        console.log("Context: Setting loading to false");
        setIsLoading(false);
      }
    };

    loadDataAsync();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (data.sessions.length > 0 || data.projects.length > 0) {
      saveDataToServer(data);
    }
  }, [data]);

  // Save current session whenever it changes
  useEffect(() => {
    if (currentSession) {
      saveCurrentSessionToServer(currentSession);
    } else {
      clearCurrentSessionFromServer();
    }
  }, [currentSession]);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const loadedData = await loadDataFromServer();
      setData(loadedData);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: TimeTrackerContextType = {
    data,
    setData,
    currentSession,
    setCurrentSession,
    isLoading,
    refreshData,
  };

  return (
    <TimeTrackerContext.Provider value={value}>
      {children}
    </TimeTrackerContext.Provider>
  );
}

export function useTimeTracker() {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) {
    throw new Error("useTimeTracker must be used within a TimeTrackerProvider");
  }
  return context;
}
