"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { TimeTrackerData, CurrentSession } from "@/types";

interface TimeTrackerContextType {
  data: TimeTrackerData;
  setData: React.Dispatch<React.SetStateAction<TimeTrackerData>>;
  currentSession: CurrentSession | null;
  setCurrentSession: React.Dispatch<React.SetStateAction<CurrentSession | null>>;
  // Add timer state management
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  pauseStartTime: Date | null;
  setPauseStartTime: (time: Date | null) => void;
  totalPausedTime: number;
  setTotalPausedTime: (time: number) => void;
  clearTimerState: () => void;
  restoreTimerStateFromLocalStorage: () => Promise<boolean>;
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
  
  // Timer state management
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  
  // Flag to prevent premature localStorage clearing during restoration
  const [isRestoring, setIsRestoring] = useState(true);

  // Load data from server and localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("🔄 Starting data load process...");
        
        // First try to load from server
        const response = await fetch('/api/data');
        if (response.ok) {
          const serverData = await response.json();
          console.log("✅ Loaded data from server:", serverData);
          setData(serverData);
        } else {
          console.log("⚠️ No server data available, using localStorage fallback");
          // Fallback to localStorage if server fails
          const savedData = localStorage.getItem('timetrackerData');
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            console.log("📱 Loaded data from localStorage:", parsedData);
            setData(parsedData);
          }
        }
      } catch (error) {
        console.error("❌ Failed to load data from server, using localStorage fallback:", error);
        // Fallback to localStorage if server fails
        const savedData = localStorage.getItem('timetrackerData');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log("📱 Loaded data from localStorage fallback:", parsedData);
          setData(parsedData);
        }
      }
      
      // Restore current session from localStorage if it exists
      const savedSession = localStorage.getItem('currentSession');
      if (savedSession) {
        try {
          console.log("🔍 Found saved timer session in localStorage:", savedSession);
          const session = JSON.parse(savedSession);
          const sessionStart = new Date(session.start);
          const now = new Date();
          
          console.log("📊 Timer validation:", {
            sessionStart: sessionStart.toISOString(),
            now: now.toISOString(),
            age: now.getTime() - sessionStart.getTime(),
            maxAge: 24 * 60 * 60 * 1000,
            isValid: now.getTime() - sessionStart.getTime() < 24 * 60 * 60 * 1000
          });
          
          // Check if the session is still valid (not older than 24 hours)
          if (now.getTime() - sessionStart.getTime() < 24 * 60 * 60 * 1000) {
            // For a running timer, elapsed should be 0 (it will be calculated in real-time)
            const restoredSession: CurrentSession = {
              start: sessionStart,
              project: session.project,
              description: session.description || "",
              elapsed: 0, // Will be calculated in real-time
            };
            
            console.log("🔄 Restoring timer session:", restoredSession);
            setCurrentSession(restoredSession);
            
            // Restore timer state
            console.log("🔄 Restoring timer state:", {
              isPaused: session.isPaused || false,
              pauseStartTime: session.pauseStartTime ? new Date(session.pauseStartTime) : null,
              totalPausedTime: session.totalPausedTime || 0
            });
            
            setIsPaused(session.isPaused || false);
            setPauseStartTime(session.pauseStartTime ? new Date(session.pauseStartTime) : null);
            setTotalPausedTime(session.totalPausedTime || 0);
            
            console.log("✅ Timer restored successfully:", {
              project: session.project,
              start: sessionStart,
              isPaused: session.isPaused,
              totalPausedTime: session.totalPausedTime
            });
          } else {
            // Session is too old, clear it
            console.log("⏰ Session too old, clearing from localStorage");
            localStorage.removeItem('currentSession');
          }
        } catch (error) {
          console.error("❌ Failed to restore timer state:", error);
          localStorage.removeItem('currentSession');
        }
      } else {
        console.log("📱 No saved timer session found in localStorage");
      }
      
      // Mark restoration as complete
      setIsRestoring(false);
    };

    loadData();
  }, []);

  // Save data to localStorage and server whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        // Save to localStorage for immediate access
        localStorage.setItem('timetrackerData', JSON.stringify(data));
        
        // Also save to server for persistence
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });
        
        if (response.ok) {
          console.log("Data saved to server successfully");
        } else {
          console.error("Failed to save data to server");
        }
      } catch (error) {
        console.error("Failed to save data:", error);
      }
    };

    // Only save if we have actual data (not empty initial state)
    if (data.sessions.length > 0 || data.projects.length > 0) {
      saveData();
    }
  }, [data]);

  // Save current session and timer state to localStorage whenever they change
  useEffect(() => {
    // Don't clear localStorage while we're still restoring timer state
    if (isRestoring) {
      return;
    }
    
    if (currentSession) {
      try {
        const sessionData = {
          ...currentSession,
          start: currentSession.start.toISOString(),
          isPaused,
          pauseStartTime: pauseStartTime?.toISOString(),
          totalPausedTime,
          timestamp: Date.now()
        };
        localStorage.setItem('currentSession', JSON.stringify(sessionData));
        console.log("Timer state saved to localStorage:", sessionData);
      } catch (error) {
        console.error("Failed to save current session to localStorage:", error);
      }
    } else {
      try {
        localStorage.removeItem('currentSession');
        console.log("Current session cleared from localStorage");
      } catch (error) {
        console.error("Failed to remove current session from localStorage", error);
      }
    }
  }, [currentSession, isPaused, pauseStartTime, totalPausedTime, isRestoring]);

  // Function to clear timer state from localStorage
  const clearTimerState = useCallback(() => {
    try {
      localStorage.removeItem('currentSession');
      console.log("Context: Cleared timer state from localStorage");
    } catch (error) {
      console.warn("Failed to clear timer state from localStorage:", error);
    }
  }, []);

  // Function to manually restore timer state from localStorage
  const restoreTimerStateFromLocalStorage = useCallback(async () => {
    try {
      const sessionString = localStorage.getItem('currentSession');
      
      if (!sessionString) {
        console.log("Context: No current session found in localStorage");
        return false;
      }
      
      const savedSession = JSON.parse(sessionString);
      const storedTimestamp = savedSession.timestamp || 0;
      const now = Date.now();
      
      // Check if session is recent (within last 24 hours)
      if (now - storedTimestamp > 24 * 60 * 60 * 1000) {
        console.log("Context: Session in localStorage is too old, clearing it");
        localStorage.removeItem('currentSession');
        return false;
      }
      
      // Restore the session and timer state
      const sessionStart = new Date(savedSession.start);
      const restoredSession: CurrentSession = {
        start: sessionStart,
        project: savedSession.project,
        description: savedSession.description || "",
        elapsed: now - sessionStart.getTime(),
      };
      
      setCurrentSession(restoredSession);
      setIsPaused(savedSession.isPaused || false);
      setPauseStartTime(savedSession.pauseStartTime ? new Date(savedSession.pauseStartTime) : null);
      setTotalPausedTime(savedSession.totalPausedTime || 0);
      
      console.log("Context: Manually restored session and timer state from localStorage:", {
        session: restoredSession,
        savedSession
      });
      
      return true;
    } catch (error) {
      console.error("Context: Failed to restore timer state from localStorage:", error);
      return false;
    }
  }, [setCurrentSession, setIsPaused, setPauseStartTime, setTotalPausedTime]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    data,
    setData,
    currentSession,
    setCurrentSession,
    clearTimerState,
    restoreTimerStateFromLocalStorage,
    isPaused,
    setIsPaused,
    pauseStartTime,
    setPauseStartTime,
    totalPausedTime,
    setTotalPausedTime,
  }), [
    data,
    currentSession,
    clearTimerState,
    restoreTimerStateFromLocalStorage,
    isPaused,
    pauseStartTime,
    totalPausedTime,
  ]);

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
