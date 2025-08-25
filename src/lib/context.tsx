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
  
  // Memoize the refresh function to prevent unnecessary re-renders
  const refreshData = useCallback(async () => {
    console.log("Context: Refreshing data from localStorage...");
    setHasLoadedData(false);
    setIsInitialLoad(true);
  }, []);

  // Load data on mount and pathname change
  useEffect(() => {
    console.log("Context: useEffect triggered, pathname:", pathname, "hasLoadedData:", hasLoadedData);

    // Only load data once, not on every page change
    if (hasLoadedData) {
      console.log("Context: Data already loaded, skipping");
      return;
    }

    // Don't load data if we're on the login page
    if (pathname === '/login') {
      console.log("Context: On login page, skipping data load");
      setIsLoading(false);
      return;
    }

    const loadDataAsync = async () => {
      try {
        console.log("Context: Starting to load data...");
        setIsLoading(true);
        setSyncStatus('syncing');
        
        // Simple localStorage-based data loading
        try {
          // Load main data
          const dataKey = 'timeTrackerData';
          const dataString = localStorage.getItem(dataKey);
          if (dataString) {
            const savedData = JSON.parse(dataString);
            console.log("Context: Loaded data from localStorage:", savedData);
            setData(savedData);
          } else {
            // Set default data if nothing saved
            const defaultData = {
              sessions: [],
              projects: [
                { name: "General", color: "#3B82F6" },
                { name: "Development", color: "#10B981" },
                { name: "Meeting", color: "#F59E0B" },
              ],
            };
            setData(defaultData);
            localStorage.setItem(dataKey, JSON.stringify(defaultData));
            console.log("Context: Set default data");
          }

          // Load current session and timer state
          const sessionKey = 'currentSession';
          const sessionString = localStorage.getItem(sessionKey);
          if (sessionString) {
            const savedSession = JSON.parse(sessionString);
            const sessionStart = new Date(savedSession.start);
            const now = new Date();
            
            // Check if session is recent (within last 24 hours)
            if (now.getTime() - sessionStart.getTime() < 24 * 60 * 60 * 1000) {
              const restoredSession: CurrentSession = {
                start: sessionStart,
                project: savedSession.project,
                description: savedSession.description || "",
                elapsed: now.getTime() - sessionStart.getTime(),
              };
              
              setCurrentSession(restoredSession);
              setIsPaused(savedSession.isPaused || false);
              setPauseStartTime(savedSession.pauseStartTime ? new Date(savedSession.pauseStartTime) : null);
              setTotalPausedTime(savedSession.totalPausedTime || 0);
              
              console.log("Context: Restored session and timer state:", restoredSession);
            } else {
              // Clear old session
              localStorage.removeItem(sessionKey);
              console.log("Context: Cleared old session");
            }
          }
          
          setHasLoadedData(true);
          setSyncStatus('synced');
          setIsInitialLoad(false);
          
        } catch (localStorageError) {
          console.warn("Failed to load from localStorage:", localStorageError);
          // Set default data on error
          setData({
            sessions: [],
            projects: [
              { name: "General", color: "#3B82F6" },
              { name: "Development", color: "#10B981" },
              { name: "Meeting", color: "#F59E0B" },
            ],
          });
          setHasLoadedData(true);
          setSyncStatus('synced');
          setIsInitialLoad(false);
        }
        
      } catch (error) {
        console.error("Failed to load data:", error);
        setSyncStatus('error');
        // Set default data on error
        setData({
          sessions: [],
          projects: [
            { name: "General", color: "#3B82F6" },
            { name: "Development", color: "#10B981" },
            { name: "Meeting", color: "#F59E0B" },
          ],
        });
        setHasLoadedData(true);
        setSyncStatus('error');
        setIsInitialLoad(false);
      } finally {
        console.log("Context: Setting loading to false");
        setIsLoading(false);
      }
    };

    loadDataAsync();
  }, [pathname, hasLoadedData]);

  // Set up data change callback for real-time sync
  useEffect(() => {
    // Disable server-side sync for now, using localStorage only
    console.log("Context: Using localStorage-only approach, server sync disabled");
    
    return () => {
      // Cleanup if needed
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

  // Save data changes to localStorage
  useEffect(() => {
    if (!hasLoadedData || isInitialLoad) return;
    
    const saveData = () => {
      try {
        localStorage.setItem('timeTrackerData', JSON.stringify(data));
        console.log("Data saved to localStorage:", data);
      } catch (error) {
        console.error("Failed to save data to localStorage:", error);
      }
    };

    // Debounce data saves to avoid excessive localStorage writes
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [data, hasLoadedData, isInitialLoad]);

  // Save timer state changes to localStorage
  useEffect(() => {
    if (!hasLoadedData || isInitialLoad) return;
    
    const saveTimerState = () => {
      try {
        if (currentSession) {
          // Save current session with timer state to localStorage
          const sessionData = {
            start: currentSession.start.toISOString(),
            project: currentSession.project,
            description: currentSession.description,
            isPaused,
            pauseStartTime: pauseStartTime?.toISOString(),
            totalPausedTime,
            timestamp: Date.now()
          };
          
          localStorage.setItem('currentSession', JSON.stringify(sessionData));
          console.log("Timer state saved to localStorage:", sessionData);
        } else {
          // Clear current session from localStorage
          localStorage.removeItem('currentSession');
          console.log("Cleared current session from localStorage");
        }
      } catch (error) {
        console.error("Failed to save timer state:", error);
      }
    };

    // Debounce timer state saves to avoid excessive localStorage writes
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
