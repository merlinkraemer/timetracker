"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Session, CurrentSession } from "@/types";
import { formatDuration, generateId } from "@/lib/api-storage";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { useTimeTracker } from "@/lib/context";
import { useSwipeNavigation } from "@/lib/use-swipe-navigation";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import {
  Play,
  Square,
  Plus,
  AlertTriangle,
  Pause,
  X,
  Save,
  Edit,
  Trash,
  LogOut,
  Users,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { 
    data, 
    setData, 
    currentSession, 
    setCurrentSession, 
    isLoading, 
    syncStatus,
    isPaused,
    setIsPaused,
    pauseStartTime,
    setPauseStartTime,
    totalPausedTime,
    setTotalPausedTime,
    clearTimerState,
    restoreTimerStateFromLocalStorage
  } = useTimeTracker();
  
  // Local state for immediate UI updates
  const [localProjects, setLocalProjects] = useState(data.projects);
  const [localSessions, setLocalSessions] = useState(data.sessions);
  
  // Sync local state with context data
  useEffect(() => {
    setLocalProjects(data.projects);
    setLocalSessions(data.sessions);
  }, [data.projects, data.sessions]);
  
  // Swipe navigation for mobile
  const { elementRef } = useSwipeNavigation({
    onSwipeLeft: () => router.push("/history"),
    onSwipeRight: () => router.push("/"),
  });

  const [newProject, setNewProject] = useState({ name: "", color: "#3B82F6" });
  const [showNewProject, setShowNewProject] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string | null>(
    null
  );
  const [editMode, setEditMode] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: "",
    color: "#3B82F6",
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeClients, setActiveClients] = useState(0);
  const isTransitioningRef = useRef(false);

  // Update current time every second for smooth timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync timer state with context when page loads
  useEffect(() => {
    if (currentSession) {
      // If we have a current session, ensure timer state is properly set
      // The context should already have the correct state
      console.log("Timer state synced from context:", {
        isPaused,
        pauseStartTime,
        totalPausedTime,
        currentSession: {
          project: currentSession.project,
          start: currentSession.start,
          elapsed: currentSession.elapsed
        }
      });
    }
  }, [currentSession, isPaused, pauseStartTime, totalPausedTime]);

  // Debug timer state changes
  useEffect(() => {
    console.log("Timer state changed:", {
      isPaused,
      pauseStartTime: pauseStartTime?.toISOString(),
      totalPausedTime,
      hasCurrentSession: !!currentSession
    });
  }, [isPaused, pauseStartTime, totalPausedTime, currentSession]);

  // Check for active clients - reduced frequency to improve performance
  useEffect(() => {
    const checkActiveClients = async () => {
      try {
        const response = await fetch('/api/data', { method: 'HEAD' });
        if (response.ok) {
          const clientCount = response.headers.get('X-Active-Clients');
          if (clientCount) {
            setActiveClients(parseInt(clientCount, 10));
          }
        }
      } catch (error) {
        console.error('Failed to check active clients:', error);
      }
    };

    checkActiveClients();
    const interval = setInterval(checkActiveClients, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Debug useEffect to monitor editing state changes
  useEffect(() => {
    console.log("Editing state changed:", {
      editingSession: editingSession?.id,
      editingProjectName,
      hasEditingSession: !!editingSession,
      hasEditingProjectName: !!editingProjectName
    });
  }, [editingSession, editingProjectName]);

  // Define edit functions before they're used in projectButtons
  const saveEdit = () => {
    if (!editingSession) return;

    const updatedSession: Session = {
      ...editingSession,
      start: editingSession.start,
      end: editingSession.end,
      project: editingSession.project,
      description: editingSession.description,
    };

    // Update local state immediately for instant UI feedback
    const updatedSessions = localSessions.map((s) =>
      s.id === editingSession.id ? updatedSession : s
    );

    setLocalSessions(updatedSessions);
    
    // Also update context state to ensure persistence
    setData((prev) => ({
      ...prev,
      sessions: updatedSessions,
    }));

    setEditingSession(null);
    setEditingProjectName(null);
    
    // Save to server using the updated values
    const saveEditToServer = async () => {
      try {
        const { syncService } = await import('@/lib/sync-service');
        
        const updatedData = {
          projects: localProjects,
          sessions: updatedSessions,
        };
        
        const result = await syncService.saveData(updatedData);
        if (result.success) {
          console.log("Session edit saved to server successfully");
          
          // Ensure context state is fully updated before navigation
          setData((prev) => ({
            ...prev,
            sessions: updatedSessions,
          }));
          
          // Small delay to ensure state updates have propagated
          setTimeout(() => {
            router.push("/history");
          }, 100);
        } else {
          console.error("Failed to save session edit to server:", result.error);
        }
      } catch (error) {
        console.error("Error saving session edit to server:", error);
      }
    };

    saveEditToServer();
  };

  const cancelEdit = () => {
    setEditingSession(null);
    setEditingProjectName(null);
  };



  // Validate currentSession - if the project doesn't exist anymore, clear it
  useEffect(() => {
    if (
      currentSession &&
      !localProjects.some((p) => p.name === currentSession.project)
    ) {
      console.log(
        "Clearing invalid currentSession - project no longer exists:",
        currentSession.project
      );
      setCurrentSession(null);
      setIsPaused(false);
      setPauseStartTime(null);
      setTotalPausedTime(0);
    }
  }, [currentSession, localProjects, setCurrentSession, setIsPaused, setPauseStartTime, setTotalPausedTime]);

  const startTimer = async (projectName: string) => {
    if (currentSession) return; // Only one timer can run at a time

    const session: CurrentSession = {
      start: new Date(),
      project: projectName,
      description: "",
      elapsed: 0,
    };

    isTransitioningRef.current = true;
    setCurrentSession(session);
    setIsPaused(false);
    setPauseStartTime(null);
    setTotalPausedTime(0);
    isTransitioningRef.current = false;

    // Let the context handle saving - no need for immediate save
    console.log("Timer started, context will handle saving");
  };

  // Debug function to check localStorage timer state
  const checkLocalStorageTimerState = useCallback(() => {
    try {
      const timerStateKey = `currentTimerState`;
      const localStorageData = localStorage.getItem(timerStateKey);
      if (localStorageData) {
        const timerState = JSON.parse(localStorageData);
        console.log("LocalStorage timer state:", timerState);
      } else {
        console.log("No timer state found in localStorage");
      }
    } catch (error) {
      console.error("Error checking localStorage timer state:", error);
    }
  }, []);

  // Debug function to test timer state restoration
  const testTimerStateRestoration = useCallback(async () => {
    console.log("Testing timer state restoration...");
    const success = await restoreTimerStateFromLocalStorage();
    if (success) {
      console.log("Timer state restoration successful");
    } else {
      console.log("Timer state restoration failed");
    }
  }, [restoreTimerStateFromLocalStorage]);

  // Debug function to reset stuck timer state
  const resetTimerState = useCallback(() => {
    console.log("Resetting timer state...");
    setCurrentSession(null);
    setIsPaused(false);
    setPauseStartTime(null);
    setTotalPausedTime(0);
    setEditingSession(null);
    setEditingProjectName(null);
    clearTimerState();
  }, [setCurrentSession, setIsPaused, setPauseStartTime, setTotalPausedTime, clearTimerState]);

  // Expose reset function globally for debugging
  useEffect(() => {
    (window as unknown as Record<string, unknown>).resetTimerState = resetTimerState;
    (window as unknown as Record<string, unknown>).checkLocalStorageTimerState = checkLocalStorageTimerState;
    return () => {
      delete (window as unknown as Record<string, unknown>).resetTimerState;
      delete (window as unknown as Record<string, unknown>).checkLocalStorageTimerState;
    };
  }, [resetTimerState, checkLocalStorageTimerState]);

  const pauseTimer = async () => {
    if (!currentSession || isPaused) return;

    setIsPaused(true);
    setPauseStartTime(new Date());
  };

  const resumeTimer = async () => {
    if (!currentSession || !isPaused) return;

    if (pauseStartTime) {
      const pauseDuration = new Date().getTime() - pauseStartTime.getTime();
      setTotalPausedTime(totalPausedTime + pauseDuration);
    }

    setIsPaused(false);
    setPauseStartTime(null);
  };

  const stopTimer = async () => {
    if (!currentSession) return;

    const endTime = new Date();
    const newSession: Session = {
      id: generateId(),
      start: currentSession.start.toISOString(),
      end: endTime.toISOString(),
      project: currentSession.project,
      description: "",
    };

    console.log("stopTimer called with session:", currentSession);
    console.log("Creating new session:", newSession);

    // Clear current session first
    setCurrentSession(null);
    setIsPaused(false);
    setPauseStartTime(null);
    setTotalPausedTime(0);
    
    // Clear timer state from localStorage
    clearTimerState();

    // Add to sessions and set editing state
    setLocalSessions((prev) => {
      console.log("Updating local sessions with new session");
      const updatedSessions = [newSession, ...prev];
      
      // Also update context state to ensure persistence
      setData((prevData) => {
        console.log("Updating context with new session");
        return {
          ...prevData,
          sessions: updatedSessions,
        };
      });
      
      return updatedSessions;
    });

    // Set editing state - this should trigger the edit field to open
    console.log("Setting editing session to:", newSession);
    
    // Small delay to ensure state updates have propagated
    setTimeout(() => {
      setEditingSession(newSession);
      setEditingProjectName(newSession.project);
      
      console.log("Editing state set after delay:", {
        newSession,
        editingSession: newSession,
        editingProjectName: newSession.project
      });
    }, 100);

    // Save the new session to server using the updated values
    const saveNewSession = async () => {
      try {
        const { syncService } = await import('@/lib/sync-service');
        
        const updatedData = {
          projects: localProjects,
          sessions: [newSession, ...localSessions],
        };
        
        const result = await syncService.saveData(updatedData);
        if (result.success) {
          console.log("New session saved to server successfully");
        } else {
          console.error("Failed to save new session to server:", result.error);
        }
      } catch (error) {
        console.error("Error saving new session to server:", error);
      }
    };

    saveNewSession();
  };

  const addProject = () => {
    if (!newProject.name.trim()) return;

    // Check if project already exists
    if (localProjects.some((p) => p.name === newProject.name.trim())) {
      setShowDuplicateWarning(true);
      return;
    }

    const newProjectData = { name: newProject.name.trim(), color: newProject.color };

    // Update local state immediately for instant UI feedback
    const updatedProjects = [...localProjects, newProjectData];
    
    setLocalProjects(updatedProjects);
    
    // Also update context state to ensure persistence
    setData((prev) => ({
      ...prev,
      projects: updatedProjects,
    }));

    setNewProject({ name: "", color: "#3B82F6" });
    setShowNewProject(false);
    setShowDuplicateWarning(false);
    // Clear any editing session so new projects can be clicked
    setEditingSession(null);
    setEditingProjectName(null);

    // Save the new project to server
    const saveNewProjectToServer = async () => {
      try {
        const { syncService } = await import('@/lib/sync-service');
        
        const updatedData = {
          projects: updatedProjects,
          sessions: localSessions,
        };
        
        const result = await syncService.saveData(updatedData);
        if (result.success) {
          console.log("New project saved to server successfully");
        } else {
          console.error("Failed to save new project to server:", result.error);
        }
      } catch (error) {
        console.error("Error saving new project to server:", error);
      }
    };

    saveNewProjectToServer();
  };

  const startEditingProject = (projectName: string) => {
    setEditingProject(projectName);
    const project = localProjects.find((p) => p.name === projectName);
    setEditProjectForm({
      name: projectName,
      color: project?.color || "#3B82F6",
    });
  };

  const saveProjectEdit = () => {
    if (!editingProject || !editProjectForm.name.trim()) return;

    // Check if new name conflicts with existing projects
    if (
      editProjectForm.name !== editingProject &&
      localProjects.some((p) => p.name === editProjectForm.name.trim())
    ) {
      setShowDuplicateWarning(true);
      return;
    }

    const updatedProjectData = {
      name: editProjectForm.name.trim(),
      color: editProjectForm.color,
    };

    // Update local state immediately for instant UI feedback
    const updatedProjects = localProjects.map((p) =>
      p.name === editingProject ? updatedProjectData : p
    );
    
    const updatedSessions = localSessions.map((session) =>
      session.project === editingProject
        ? { ...session, project: editProjectForm.name.trim() }
        : session
    );

    setLocalProjects(updatedProjects);
    setLocalSessions(updatedSessions);
    
    // Also update context state to ensure persistence
    setData({
      ...data,
      projects: updatedProjects,
      sessions: updatedSessions,
    });

    setEditingProject(null);
    setEditProjectForm({ name: "", color: "#3B82F6" });
    setShowDuplicateWarning(false);

    // Save the project edit to server using the updated values
    const saveProjectEditToServer = async () => {
      try {
        const { syncService } = await import('@/lib/sync-service');
        
        const updatedData = {
          projects: updatedProjects,
          sessions: updatedSessions,
        };
        
        const result = await syncService.saveData(updatedData);
        if (result.success) {
          console.log("Project edit saved to server successfully");
        } else {
          console.error("Failed to save project edit to server:", result.error);
        }
      } catch (error) {
        console.error("Error saving project edit to server:", error);
      }
    };

    saveProjectEditToServer();
  };

  const deleteProject = (projectName: string) => {
    // Count sessions that reference this project
    const sessionCount = localSessions.filter(
      (s) => s.project === projectName
    ).length;

    if (sessionCount > 0) {
      if (
        !confirm(
          `Project "${projectName}" is used in ${sessionCount} session${
            sessionCount !== 1 ? "s" : ""
          }. Delete anyway?`
        )
      ) {
        return;
      }
    }

    if (confirm(`Are you sure you want to delete project "${projectName}"?`)) {
      // Update local state immediately for instant UI feedback
      const updatedProjects = localProjects.filter((p) => p.name !== projectName);
      const updatedSessions = localSessions.filter(
        (session) => session.project !== projectName
      );

      setLocalProjects(updatedProjects);
      setLocalSessions(updatedSessions);
      
      // Also update context state to ensure persistence
      setData((prev) => ({
        ...prev,
        projects: updatedProjects,
        sessions: updatedSessions,
      }));

      // Save the project deletion to server
      const saveProjectDeletionToServer = async () => {
        try {
          const { syncService } = await import('@/lib/sync-service');
          
          const updatedData = {
            projects: updatedProjects,
            sessions: updatedSessions,
          };
          
          const result = await syncService.saveData(updatedData);
          if (result.success) {
            console.log("Project deletion saved to server successfully");
          } else {
            console.error("Failed to save project deletion to server:", result.error);
          }
        } catch (error) {
          console.error("Error saving project deletion to server:", error);
        }
      };

      saveProjectDeletionToServer();
    }
  };

  const cancelProjectEdit = () => {
    setEditingProject(null);
    setEditProjectForm({ name: "", color: "#3B82F6" });
    setShowDuplicateWarning(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div
        ref={elementRef}
        className="h-screen bg-background text-foreground px-2 sm:px-4 flex flex-col swipe-container"
      >
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
          {/* Simple loading indicator */}
          <div className="text-center">
            <div className="text-lg text-muted-foreground mb-4">Loading...</div>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={() => {}}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled
          >
            Edit
          </Button>
        </div>
        <FloatingNavbar currentRoute="home" />
      </div>
    );
  }

  // Main render function for project cards
  const renderProjectCards = () => {
    if (localProjects.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No projects yet. Add your first project to get started.</p>
        </div>
      );
    }

    return (
      <>
        {localProjects.map((project) => {
          const isRunning = currentSession?.project === project.name;
          const isCurrentTimer = Boolean(currentSession && isRunning);
          const isEditing = editingProject === project.name;

          return (
            <Card
              key={project.name}
              className={`transition-colors duration-200 ${
                editMode ||
                (editingSession && editingProjectName === project.name)
                  ? "cursor-default"
                  : "cursor-pointer"
              } ${
                editingSession && editingProjectName === project.name
                  ? "bg-muted/30 border-muted-foreground/20"
                  : isCurrentTimer
                  ? isPaused
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                    : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : ""
              }`}
              onClick={() => {
                console.log("Card clicked:", {
                  project,
                  editMode,
                  editingSession: !!editingSession,
                  editingProjectName,
                  currentSession: !!currentSession,
                  isCurrentTimer,
                  isRunning,
                });

                if (editMode) {
                  console.log("Blocked: edit mode");
                  return;
                }

                if (editingSession && editingProjectName === project.name) {
                  console.log("Blocked: editing this specific project");
                  return;
                }

                if (isCurrentTimer) {
                  console.log("Handling current timer");
                  // If timer is running, pause it; if paused, resume it
                  if (isPaused) {
                    resumeTimer();
                  } else {
                    pauseTimer();
                  }
                } else if (!currentSession) {
                  console.log("Starting new timer");
                  // Start new timer if no other timer is running
                  startTimer(project.name);
                } else {
                  console.log(
                    "Blocked: another timer is running on project:",
                    currentSession?.project
                  );
                }
              }}
            >
              <CardContent className="px-3 sm:px-4 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  {/* Left: Timer and Project Name */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    {/* Timer Display */}
                    <div
                      className={`text-2xl sm:text-3xl font-bold ${
                        editingSession && editingProjectName === project.name
                          ? "text-muted-foreground/60"
                          : isCurrentTimer
                          ? isPaused
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-green-700 dark:text-green-300"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isCurrentTimer && currentSession
                        ? formatDuration(
                            Math.max(
                              0,
                              currentTime.getTime() -
                                currentSession.start.getTime() -
                                totalPausedTime -
                                (isPaused && pauseStartTime
                                  ? currentTime.getTime() -
                                    pauseStartTime.getTime()
                                  : 0)
                            )
                          )
                        : editingSession && editingProjectName === project.name
                        ? formatDuration(
                            Math.max(
                              0,
                              new Date(editingSession.end!).getTime() -
                                new Date(editingSession.start).getTime()
                            )
                          )
                        : "00:00"}
                    </div>

                    {/* Project Name or Edit Input */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Color Picker */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 sm:h-9 px-3 sm:px-4 flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: editProjectForm.color,
                                  }}
                                />
                                <span className="hidden sm:inline">Color</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48">
                              <DropdownMenuLabel>
                                Choose Project Color
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {[
                                { value: "#3B82F6", label: "Blue" },
                                { value: "#EF4444", label: "Red" },
                                { value: "#10B981", label: "Green" },
                                { value: "#F59E0B", label: "Yellow" },
                                { value: "#8B5CF6", label: "Purple" },
                                { value: "#EC4899", label: "Pink" },
                                { value: "#06B6D4", label: "Cyan" },
                                { value: "#84CC16", label: "Lime" },
                              ].map((colorOption) => (
                                <DropdownMenuItem
                                  key={colorOption.value}
                                  onClick={() =>
                                    setEditProjectForm((prev) => ({
                                      ...prev,
                                      color: colorOption.value,
                                    }))
                                  }
                                  className="flex items-center gap-3"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{
                                      backgroundColor: colorOption.value,
                                    }}
                                  />
                                  {colorOption.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Project Name Input */}
                          <Input
                            value={editProjectForm.name}
                            onChange={(e) =>
                              setEditProjectForm({
                                ...editProjectForm,
                                name: e.target.value,
                              })
                            }
                            placeholder="Project name"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveProjectEdit();
                              if (e.key === "Escape") cancelProjectEdit();
                            }}
                            autoFocus
                            className="w-full text-sm sm:text-base font-medium min-w-0"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Color Dot */}
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                localProjects.find(
                                  (p) => p.name === project.name
                                )?.color || "#3B82F6",
                            }}
                          />
                          <h3
                            className={`text-sm sm:text-base font-medium text-muted-foreground truncate ${
                              isCurrentTimer
                                ? isPaused
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-green-700 dark:text-green-300"
                                : ""
                            }`}
                          >
                            {project.name}
                          </h3>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Icons and Edit Actions */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {/* Timer Control Icons - Hidden in Edit Mode */}
                    {!editMode && (
                      <>
                        {isCurrentTimer ? (
                          <>
                            <div
                              className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full text-white flex items-center justify-center ${
                                isPaused ? "bg-blue-600" : "bg-green-600"
                              }`}
                            >
                              {isPaused ? (
                                <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                              ) : (
                                <Pause className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                              )}
                            </div>
                            {isPaused && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  stopTimer();
                                }}
                                variant="destructive"
                                size="lg"
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full text-white"
                                disabled={
                                  editMode ||
                                  !!(
                                    editingSession &&
                                    editingProjectName === project.name
                                  )
                                }
                              >
                                <Square className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                              </Button>
                            )}
                          </>
                        ) : (editingSession &&
                          editingProjectName === project.name) ? (
                          <>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              variant="outline"
                              size="lg"
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                            >
                              <X className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit();
                              }}
                              type="submit"
                              size="lg"
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-600 text-white hover:bg-green-600"
                            >
                              <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </>
                        ) : (
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-600 flex items-center justify-center">
                            <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current text-white" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Edit Mode Actions */}
                    {editMode && (
                      <div className="flex gap-1 sm:gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              onClick={cancelProjectEdit}
                              variant="outline"
                              size="lg"
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                            >
                              <X className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <Button
                              onClick={saveProjectEdit}
                              type="submit"
                              size="lg"
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-600 text-white hover:bg-green-600"
                            >
                              <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => startEditingProject(project.name)}
                              variant="outline"
                              size="lg"
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                            >
                              <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                            <Button
                              onClick={() => deleteProject(project.name)}
                              variant="outline"
                              size="lg"
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full text-destructive hover:text-destructive"
                            >
                              <Trash className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Edit Section for Sessions */}
                {editingSession && editingProjectName === project.name && (
                  <div className="mt-4 pt-4 pb-4 border-t border-border">
                    <div className="space-y-6">
                      {/* Project Selection */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Project</label>
                        <Select
                          value={editingSession.project}
                          onValueChange={(value: string) =>
                            setEditingSession({
                              ...editingSession,
                              project: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {localProjects.map((projectName) => (
                              <SelectItem
                                key={projectName.name}
                                value={projectName.name}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor: projectName.color,
                                    }}
                                  />
                                  {projectName.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Start Date and Time */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">
                          Start Date & Time
                        </label>
                        <DateTimePicker
                          date={new Date(editingSession.start)}
                          onDateTimeChange={(date) => {
                            setEditingSession({
                              ...editingSession,
                              start: date.toISOString(),
                            });
                          }}
                          dateLabel=""
                          timeLabel=""
                          className="w-full"
                        />
                      </div>

                      {/* End Date and Time */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">
                          End Date & Time
                        </label>
                        <DateTimePicker
                          date={new Date(editingSession.end!)}
                          onDateTimeChange={(date) => {
                            setEditingSession({
                              ...editingSession,
                              end: date.toISOString(),
                            });
                          }}
                          dateLabel=""
                          timeLabel=""
                          className="w-full"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">
                          Description
                        </label>
                        <Input
                          value={editingSession.description}
                          onChange={(e) =>
                            setEditingSession({
                              ...editingSession,
                              description: e.target.value,
                            })
                          }
                          placeholder="What did you work on?"
                          className="w-full"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={cancelEdit}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={saveEdit}
                          className="flex-1"
                        >
                          Save Session
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </>
    );
  };

  const renderAddProjectSection = () => (
    <>
      {showNewProject ? (
        <Card className={`transition-colors duration-200 cursor-default`}>
          <CardContent className="px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Color Picker and Project Name Input */}
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                {/* Color Picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-9 px-2 sm:px-4 flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: newProject.color }}
                      />
                      <span className="hidden sm:inline">Color</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    <DropdownMenuLabel>Choose Project Color</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[
                      { value: "#3B82F6", label: "Blue" },
                      { value: "#EF4444", label: "Red" },
                      { value: "#10B981", label: "Green" },
                      { value: "#F59E0B", label: "Yellow" },
                      { value: "#8B5CF6", label: "Purple" },
                      { value: "#EC4899", label: "Pink" },
                      { value: "#06B6D4", label: "Cyan" },
                      { value: "#84CC16", label: "Lime" },
                    ].map((colorOption) => (
                      <DropdownMenuItem
                        key={colorOption.value}
                        onClick={() =>
                          setNewProject((prev) => ({
                            ...prev,
                            color: colorOption.value,
                          }))
                        }
                        className="flex items-center gap-3"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: colorOption.value }}
                        />
                        {colorOption.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Project Name Input */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={newProject.name}
                    onChange={(e) => {
                      setNewProject((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                      setShowDuplicateWarning(false);
                    }}
                    placeholder="Project name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addProject();
                      if (e.key === "Escape") {
                        setShowNewProject(false);
                        setEditingSession(null);
                        setEditingProjectName(null);
                      }
                    }}
                    autoFocus
                    className="w-full text-sm sm:text-base font-medium text-muted-foreground focus:text-foreground"
                  />
                </div>
              </div>

              {/* Right: Action Buttons - Same layout as save/cancel */}
              <div className="flex gap-1 sm:gap-2">
                <Button
                  onClick={() => {
                    setShowNewProject(false);
                    setShowDuplicateWarning(false);
                    setEditingSession(null);
                    setEditingProjectName(null);
                  }}
                  variant="outline"
                  size="lg"
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  type="submit"
                  onClick={addProject}
                  size="lg"
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white text-gray-600"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Duplicate Warning Alert */}
            {showDuplicateWarning && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Project already exists!</AlertTitle>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="text-center">
          <Button
            onClick={() => {
              setShowNewProject(true);
              // Clear any editing session so new projects can be interacted with
              setEditingSession(null);
              setEditingProjectName(null);
            }}
            variant="link"
            className="text-sm"
          >
            <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center mr-1">
              <Plus className="w-3 h-3" />
            </div>
            Add project
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div
      ref={elementRef}
      className="h-screen bg-background text-foreground px-2 sm:px-4 flex flex-col swipe-container"
    >
      {/* Top Controls - Fixed at top right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{activeClients} active</span>
        </div>
        <SyncIndicator status={syncStatus} />
        
        {/* Debug buttons - only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex items-center gap-1">
            <Button
              onClick={checkLocalStorageTimerState}
              variant="outline"
              size="sm"
              className="text-xs"
              title="Check localStorage timer state"
            >
              Check
            </Button>
            <Button
              onClick={testTimerStateRestoration}
              variant="outline"
              size="sm"
              className="text-xs"
              title="Test timer state restoration"
            >
              Restore
            </Button>
            <Button
              onClick={resetTimerState}
              variant="outline"
              size="sm"
              className="text-xs"
              title="Reset timer state"
            >
              Reset
            </Button>
          </div>
        )}
        
        <Button
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
          disabled={!!currentSession} // Disable edit mode when timer is running
        >
          {editMode ? "Done" : "Edit"}
        </Button>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* Main Content - Centered vertically in viewport */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-0">
        <div className="max-w-2xl mx-auto w-full space-y-4 sm:space-y-6 lg:space-y-8 py-0">
          {/* Current Time and Date Display */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">
              {currentTime.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="text-sm sm:text-base lg:text-lg font-medium text-muted-foreground">
              {currentTime.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>

          {/* Timer State Indicator */}
          {currentSession && (
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-primary">
                {currentSession.project} Timer
              </div>
              <div className="text-sm text-muted-foreground">
                Started: {currentSession.start.toLocaleTimeString()}
              </div>
              {isPaused && (
                <div className="text-sm text-amber-600 font-medium">
                  ⏸️ Paused
                </div>
              )}
              {totalPausedTime > 0 && (
                <div className="text-xs text-muted-foreground">
                  Total paused: {Math.round(totalPausedTime / 1000)}s
                </div>
              )}
            </div>
          )}

          {/* Project Buttons */}
          <div className="w-full space-y-2 sm:space-y-3 lg:space-y-4">
            {renderProjectCards()}

            {/* Add Project Section - Only show when not editing */}
            {!editingSession && renderAddProjectSection()}
          </div>
        </div>
      </div>

      {/* Floating Navigation Bar */}
      <FloatingNavbar currentRoute="home" />
    </div>
  );
}
