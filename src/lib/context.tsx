"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { TimeTrackerData, CurrentSession, Session } from "@/types";
import { syncService } from "@/lib/sync-service";
import { usePathname } from "next/navigation";

interface TimeTrackerContextType {
  data: TimeTrackerData;
  setData: React.Dispatch<React.SetStateAction<TimeTrackerData>>;
  currentSession: CurrentSession | null;
  setCurrentSession: React.Dispatch<React.SetStateAction<CurrentSession | null>>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  syncStatus: 'synced' | 'syncing' | 'error' | 'conflict';
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
  const pathname = usePathname();
  const [data, setData] = useState<TimeTrackerData>({
    sessions: [],
    projects: [
      { name: "General", color: "#3B82F6" },
      { name: "Development", color: "#10B981" },
      { name: "Meeting", color: "#F59E0B" },
    ],
  });
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'conflict'>('synced');
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Timer state management
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  
  // Refresh data from server
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncStatus('syncing');
      
      const result = await syncService.loadData();
      if (result.success && result.data) {
        setData(result.data);
        syncService.setCurrentVersion(result.version || 0);
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error("Failed to refresh data:", error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount and pathname change
  useEffect(() => {
    console.log("Context: useEffect triggered, pathname:", pathname, "hasLoadedData:", hasLoadedData);

    // Only load data once, not on every page change
    if (hasLoadedData) {
      console.log("Context: Data already loaded, skipping");
      return;
    }

    const loadDataAsync = async () => {
      try {
        console.log("Context: Starting to load data...");
        setIsLoading(true);
        setSyncStatus('syncing');
        
        // Don't load data if we're on the login page
        if (pathname === '/login') {
          console.log("Context: On login page, skipping data load");
          setIsLoading(false);
          return;
        }
        
        // First check if user is authenticated
        const authCheck = await fetch('/api/data', { method: 'HEAD' });
        if (!authCheck.ok) {
          console.log("Context: User not authenticated, redirecting to login");
          // User is not authenticated, redirect to login
          window.location.href = '/login';
          return;
        }
        
        // Load data from server
        const result = await syncService.loadData();
        if (result.success && result.data) {
          console.log("Context: Data loaded successfully from server:", result.data);
          setData(result.data);
          syncService.setCurrentVersion(result.version || 0);
          setHasLoadedData(true);

          // Restore current session from server if it exists
          if (result.data.currentSession) {
            const session = result.data.currentSession;
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
              console.log("Context: Restored current session from server:", restoredSession);
              setCurrentSession(restoredSession);
              
              // Restore timer state from server
              if ((session as Session & { _timerState?: { isPaused: boolean; pauseStartTime?: string; totalPausedTime: number } })._timerState) {
                const timerState = (session as Session & { _timerState: { isPaused: boolean; pauseStartTime?: string; totalPausedTime: number } })._timerState;
                setIsPaused(timerState.isPaused || false);
                setPauseStartTime(timerState.pauseStartTime ? new Date(timerState.pauseStartTime) : null);
                setTotalPausedTime(timerState.totalPausedTime || 0);
                console.log("Context: Restored timer state from server:", timerState);
              } else {
                // No timer state on server, assume running
                setIsPaused(false);
                setPauseStartTime(null);
                setTotalPausedTime(0);
                console.log("Context: No timer state on server, assuming running");
              }
            } else {
              // Session is too old, clear it from server
              console.log("Context: Session too old, clearing from server");
              await syncService.clearCurrentSession();
            }
          }
          
          setSyncStatus('synced');
          setIsInitialLoad(false);
          
        } else {
          console.error("Failed to load data from server:", result.error);
          setSyncStatus('error');
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setSyncStatus('error');
      } finally {
        console.log("Context: Setting loading to false");
        setIsLoading(false);
      }
    };

    loadDataAsync();
  }, [pathname, hasLoadedData]);

  // Set up data change callback for real-time sync
  useEffect(() => {
    syncService.setOnDataChange((newData: TimeTrackerData) => {
      console.log("Context: Received data update from server:", newData);
      setData(newData);
      setSyncStatus('synced');
    });

    // Start polling for real-time updates
    syncService.startPolling();

    return () => {
      syncService.stopPolling();
    };
  }, []);

  // TEMPORARILY DISABLED - AGGRESSIVE conflict prevention - only save when absolutely necessary
  // This useEffect was causing infinite re-render loops (React Error #418)
  /*
  useEffect(() => {
    // STOP ALL SAVES if we've detected a conflict
    if (conflictDetectedRef.current) {
      console.log("Context: Conflict detected, blocking all saves");
      return;
    }
    
    // Skip if we're currently syncing, loading, or if this is initial data load
    if (syncStatus === 'syncing' || isLoading || !hasLoadedData || isInitialLoad) return;
    
    // Skip if we're already saving
    if (isSavingRef.current) {
      console.log("Context: Already saving, skipping duplicate save");
      return;
    }

    // Clear any existing debounce
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    // Use debounce to prevent excessive effect firing
    saveDebounceRef.current = setTimeout(() => {
      // Intelligent change detection - only save if there are actual meaningful changes
      const currentDataHash = JSON.stringify({
        sessions: data.sessions,
        projects: data.projects
      });
      const currentSessionHash = JSON.stringify(currentSession);
      
      const hasDataChanges = currentDataHash !== lastSavedDataRef.current;
      const hasSessionChanges = currentSessionHash !== lastSavedSessionRef.current;
      
      if (!hasDataChanges && !hasSessionChanges) {
        console.log("Context: No meaningful changes detected, skipping save");
        return;
      }
      
      console.log("Context: Changes detected, scheduling save", {
        hasDataChanges,
        hasSessionChanges,
        dataHash: currentDataHash.substring(0, 50) + '...',
        sessionHash: currentSessionHash.substring(0, 50) + '...'
      });
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Process changes after a delay with state lock
      // Use longer delays to reduce unnecessary saves
      // const delay = currentSession ? 5000 : 10000; // 5s for active timer, 10s for other changes
      
      // saveTimeoutRef.current = setTimeout(async () => {
      //   await processStateChanges();
      // }, delay);
    }, 1000); // 1 second debounce to prevent excessive effect firing
    
    // Cleanup debounce on unmount
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data.sessions.length, data.projects.length, currentSession?.start?.getTime(), currentSession?.project, currentSession?.description, syncStatus, isLoading, hasLoadedData, isInitialLoad]);
  */

  // TEMPORARILY DISABLED - Single function to handle all state changes with proper locking
  // This function was causing React Hook errors and is no longer needed
  /*
  const processStateChanges = async () => {
    // Prevent multiple simultaneous saves
    if (isSavingRef.current) {
      console.log("Context: Save already in progress, skipping");
      return;
    }
    
    // Set saving flag
    isSavingRef.current = true;
    
    // Acquire global state lock to prevent race conditions
    const releaseLock = await acquireStateLock();
    
    try {
      console.log("Context: Processing state changes with lock...");
      setSyncStatus('syncing');
      
      let hasChanges = false;
      
      // Process data changes first (if any)
      if (data.sessions.length > 0 || data.projects.length > 0) {
        console.log("Context: Saving data changes...");
        const result = await syncService.saveData(data);
        
        if (result.conflict) {
          console.warn("🚨 CONFLICT DETECTED - STOPPING ALL OPERATIONS PERMANENTLY");
          setSyncStatus('conflict');
          
          // SET THE CONFLICT FLAG - NO MORE SAVES EVER
          conflictDetectedRef.current = true;
          
          // Fetch latest data to update UI
          const latestResult = await syncService.loadData();
          if (latestResult.success && latestResult.data) {
            console.log("Context: Updating with latest server data...");
            setData(latestResult.data);
          }
          
          // Release lock and return - NEVER RETRY
          releaseLock();
          return;
        } else if (result.success) {
          console.log("Context: Data saved successfully");
          hasChanges = true;
        } else {
          console.error("Context: Failed to save data:", result.error);
          setSyncStatus('error');
          releaseLock();
          return;
        }
      }
      
      // Then process session changes (if any) - only if there are actual changes
      if (currentSession !== undefined) {
        if (currentSession) {
          console.log("Context: Saving current session...");
          const sessionData: Session = {
            id: 'current',
            start: currentSession.start.toISOString(),
            end: undefined,
            project: currentSession.project,
            description: currentSession.description,
          };
          const success = await syncService.saveCurrentSession(sessionData);
          if (success) {
            console.log("Context: Current session saved successfully");
            hasChanges = true;
          } else {
            console.error("Context: Failed to save current session");
          }
        } else {
          console.log("Context: Clearing current session...");
          const success = await syncService.clearCurrentSession();
          if (success) {
            console.log("Context: Current session cleared successfully");
            hasChanges = true;
          } else {
            console.error("Context: Failed to clear current session");
          }
        }
      }
      
      // Only update sync status if we actually made changes
      if (hasChanges) {
        setSyncStatus('synced');
        console.log("Context: All changes saved successfully");
        
        // Update last saved hashes to prevent unnecessary future saves
        const currentDataHash = JSON.stringify({
          sessions: data.sessions,
          projects: data.projects
        });
        const currentSessionHash = JSON.stringify(currentSession);
        
        lastSavedDataRef.current = currentDataHash;
        lastSavedSessionRef.current = currentSessionHash;
        
        console.log("Context: Updated last saved hashes");
      } else {
        setSyncStatus('synced');
        console.log("Context: No changes to save");
      }
      
    } catch (error) {
      console.error("Context: Error during state change operation:", error);
      setSyncStatus('error');
    } finally {
      // Always release the lock and reset saving flag
      releaseLock();
      isSavingRef.current = false;
    }
  };
  */

  // Save data changes to server for real-time sync
  useEffect(() => {
    if (!hasLoadedData || isInitialLoad) return;
    
    const saveData = async () => {
      try {
        const result = await syncService.saveData(data);
        if (result.success) {
          console.log("Data saved to server for real-time sync");
          setSyncStatus('synced');
        } else {
          console.error("Failed to save data to server:", result.error);
          setSyncStatus('error');
        }
      } catch (error) {
        console.error("Failed to save data to server:", error);
        setSyncStatus('error');
      }
    };

    // Debounce data saves to avoid excessive server calls
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [data, hasLoadedData, isInitialLoad]);

  // Save timer state changes to server
  useEffect(() => {
    if (!hasLoadedData || isInitialLoad) return;
    
    const saveTimerState = async () => {
      try {
        if (currentSession) {
          // Save current session with timer state to server
          const sessionData: Session = {
            id: 'current',
            start: currentSession.start.toISOString(),
            end: undefined,
            project: currentSession.project,
            description: currentSession.description,
            _timerState: {
              isPaused,
              pauseStartTime: pauseStartTime?.toISOString(),
              totalPausedTime
            }
          };
          
          // Save to server for real-time sync
          const success = await syncService.saveCurrentSession(sessionData);
          if (success) {
            console.log("Timer state saved to server for real-time sync");
          } else {
            console.error("Failed to save timer state to server");
          }
        } else {
          // Clear current session from server
          await syncService.clearCurrentSession();
          console.log("Cleared current session from server");
        }
      } catch (error) {
        console.error("Failed to save timer state:", error);
      }
    };

    // Debounce timer state saves to avoid excessive server calls
    const timeoutId = setTimeout(saveTimerState, 1000);
    return () => clearTimeout(timeoutId);
  }, [currentSession, isPaused, pauseStartTime, totalPausedTime, hasLoadedData, isInitialLoad]);

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
    isLoading,
    refreshData,
    syncStatus,
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
    isLoading,
    refreshData,
    syncStatus,
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
