"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data, setData, currentSession, setCurrentSession, isLoading } =
    useTimeTracker();

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
  const [isPaused, setIsPaused] = useState(false); // New state for pause
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null); // Track when pause started
  const [totalPausedTime, setTotalPausedTime] = useState(0); // Track total paused time
  const isTransitioningRef = useRef(false);

  // Update current time every second for live timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Validate currentSession - if the project doesn't exist anymore, clear it
  useEffect(() => {
    if (
      currentSession &&
      !data.projects.some((p) => p.name === currentSession.project)
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
  }, [currentSession, data.projects, setCurrentSession]);

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
  };

  // Debug function to reset stuck timer state
  const resetTimerState = () => {
    console.log("Resetting timer state...");
    setCurrentSession(null);
    setIsPaused(false);
    setPauseStartTime(null);
    setTotalPausedTime(0);
    setEditingSession(null);
    setEditingProjectName(null);
  };

  // Expose reset function globally for debugging
  useEffect(() => {
    (window as unknown as Record<string, unknown>).resetTimerState =
      resetTimerState;
    return () => {
      delete (window as unknown as Record<string, unknown>).resetTimerState;
    };
  }, [resetTimerState]);

  const pauseTimer = async () => {
    if (!currentSession || isPaused) return;

    setIsPaused(true);
    setPauseStartTime(new Date());
  };

  const resumeTimer = async () => {
    if (!currentSession || !isPaused) return;

    if (pauseStartTime) {
      const pauseDuration = new Date().getTime() - pauseStartTime.getTime();
      setTotalPausedTime((prev) => prev + pauseDuration);
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

    setData((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
    }));

    setCurrentSession(null);
    setIsPaused(false);
    setPauseStartTime(null);
    setTotalPausedTime(0);
    setEditingSession(newSession);
    setEditingProjectName(currentSession.project);
  };

  const addProject = () => {
    if (!newProject.name.trim()) return;

    // Check if project already exists
    if (data.projects.some((p) => p.name === newProject.name.trim())) {
      setShowDuplicateWarning(true);
      return;
    }

    setData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { name: newProject.name.trim(), color: newProject.color },
      ],
    }));

    setNewProject({ name: "", color: "#3B82F6" });
    setShowNewProject(false);
    setShowDuplicateWarning(false);
    // Clear any editing session so new projects can be clicked
    setEditingSession(null);
    setEditingProjectName(null);
  };

  const saveEdit = () => {
    if (!editingSession) return;

    const updatedSession: Session = {
      ...editingSession,
      start: editingSession.start,
      end: editingSession.end,
      project: editingSession.project,
      description: editingSession.description,
    };

    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === editingSession.id ? updatedSession : s
      ),
    }));

    setEditingSession(null);
    setEditingProjectName(null);
    // Navigate to history page after saving
    router.push("/history");
  };

  const cancelEdit = () => {
    setEditingSession(null);
    setEditingProjectName(null);
  };

  const startEditingProject = (projectName: string) => {
    setEditingProject(projectName);
    const project = data.projects.find((p) => p.name === projectName);
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
      data.projects.some((p) => p.name === editProjectForm.name.trim())
    ) {
      setShowDuplicateWarning(true);
      return;
    }

    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.name === editingProject
          ? {
              ...p,
              name: editProjectForm.name.trim(),
              color: editProjectForm.color,
            }
          : p
      ),
      // Update sessions that reference this project
      sessions: prev.sessions.map((session) =>
        session.project === editingProject
          ? { ...session, project: editProjectForm.name.trim() }
          : session
      ),
    }));

    setEditingProject(null);
    setEditProjectForm({ name: "", color: "#3B82F6" });
    setShowDuplicateWarning(false);
  };

  const deleteProject = (projectName: string) => {
    // Count sessions that reference this project
    const sessionCount = data.sessions.filter(
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
      setData((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.name !== projectName),
        // Remove sessions that reference this project
        sessions: prev.sessions.filter(
          (session) => session.project !== projectName
        ),
      }));
    }
  };

  const cancelProjectEdit = () => {
    setEditingProject(null);
    setEditProjectForm({ name: "", color: "#3B82F6" });
    setShowDuplicateWarning(false);
  };

  // Show loading state
  console.log("Page: isLoading =", isLoading, "data =", data);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 flex flex-col pb-28 sm:pb-32">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
        <FloatingNavbar currentRoute="home" />
      </div>
    );
  }

  const renderProjectButtons = () => {
    if (data.projects.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No projects yet. Add your first project to get started.</p>
        </div>
      );
    }

    return (
      <>
        {data.projects.map((project) => {
          const isRunning = currentSession?.project === project.name;
          const isCurrentTimer = currentSession && isRunning;
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
              <CardContent className="pl-4 pr-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Left: Timer and Project Name */}
                  <div className="flex flex-col gap-1">
                    {/* Timer Display */}
                    <div
                      className={`text-3xl font-bold ${
                        editingSession && editingProjectName === project.name
                          ? "text-muted-foreground/60"
                          : isCurrentTimer
                          ? isPaused
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-green-700 dark:text-green-300"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isCurrentTimer
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
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-3">
                          {/* Color Picker */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 flex items-center gap-2 whitespace-nowrap"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: editProjectForm.color,
                                  }}
                                />
                                Color
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
                            className="w-full text-base font-medium"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Color Dot */}
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                data.projects.find(
                                  (p) => p.name === project.name
                                )?.color || "#3B82F6",
                            }}
                          />
                          <h3
                            className={`text-base font-medium text-muted-foreground ${
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
                  <div className="flex items-center gap-2">
                    {/* Timer Control Icons - Hidden in Edit Mode */}
                    {!editMode && (
                      <>
                        {isCurrentTimer ? (
                          <>
                            <div
                              className={`h-12 w-12 rounded-full text-white flex items-center justify-center ${
                                isPaused ? "bg-blue-600" : "bg-green-600"
                              }`}
                            >
                              {isPaused ? (
                                <Play className="h-5 w-5 fill-current" />
                              ) : (
                                <Pause className="h-5 w-5 fill-current" />
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
                                className="h-12 w-12 rounded-full text-white"
                                disabled={
                                  editMode ||
                                  !!(
                                    editingSession &&
                                    editingProjectName === project.name
                                  )
                                }
                              >
                                <Square className="h-5 w-5 fill-current" />
                              </Button>
                            )}
                          </>
                        ) : editingSession &&
                          editingProjectName === project.name ? (
                          <>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              variant="outline"
                              size="lg"
                              className="h-12 w-12 rounded-full"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit();
                              }}
                              type="submit"
                              size="lg"
                              className="h-12 w-12 rounded-full bg-green-600 text-white hover:bg-green-600"
                            >
                              <Save className="h-5 w-5" />
                            </Button>
                          </>
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
                            <Play className="h-5 w-5 fill-current text-white" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Edit Mode Actions */}
                    {editMode && (
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              onClick={cancelProjectEdit}
                              variant="outline"
                              size="lg"
                              className="h-12 w-12 rounded-full"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                            <Button
                              type="submit"
                              size="lg"
                              className="h-12 w-12 rounded-full bg-green-600 text-white hover:bg-green-600"
                            >
                              <Save className="h-5 w-5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => startEditingProject(project.name)}
                              variant="outline"
                              size="lg"
                              className="h-12 w-12 rounded-full"
                            >
                              <Edit className="h-5 w-5" />
                            </Button>
                            <Button
                              onClick={() => deleteProject(project.name)}
                              variant="outline"
                              size="lg"
                              className="h-12 w-12 rounded-full text-destructive hover:text-destructive"
                            >
                              <Trash className="h-5 w-5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Edit Section */}
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
                            {data.projects.map((projectName) => (
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
          <CardContent className="pl-6 pr-8 py-6">
            <div className="flex items-center justify-between">
              {/* Left: Timer Display */}
              <div className="flex flex-col gap-2">
                {/* Timer Display - Show 00:00 to match project cards */}
                <div className="text-3xl font-bold text-muted-foreground">
                  00:00
                </div>
              </div>

              {/* Center: Color Picker and Project Name Input */}
              <div className="flex items-center gap-4 flex-1 mx-6">
                {/* Color Picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 flex items-center gap-2 whitespace-nowrap"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: newProject.color }}
                      />
                      Color
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
                <div className="flex-1">
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
                    className="w-full text-base font-medium text-muted-foreground focus:text-foreground"
                  />
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setShowNewProject(false);
                    setShowDuplicateWarning(false);
                    setEditingSession(null);
                    setEditingProjectName(null);
                  }}
                  variant="outline"
                  size="lg"
                  className="h-12 w-12 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
                <Button
                  type="submit"
                  onClick={addProject}
                  size="lg"
                  className="h-12 w-12 rounded-full bg-white text-gray-600"
                >
                  <Plus className="h-5 w-5" />
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
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 flex flex-col pb-28 sm:pb-32">
      {/* Edit Button - Fixed at top right */}
      <div className="max-w-2xl mx-auto w-full flex justify-end mb-4">
        <Button
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
          disabled={!!currentSession} // Disable edit mode when timer is running
        >
          {editMode ? "Done" : "Edit"}
        </Button>
      </div>

      {/* Main Content - Centered vertically */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full space-y-6 sm:space-y-8">
          {/* Current Time and Date Display */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-base sm:text-lg font-semibold">
              {currentTime.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="text-base sm:text-lg font-semibold text-muted-foreground">
              {currentTime.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>

          {/* Project Buttons */}
          <div className="w-full space-y-3 sm:space-y-4">
            {renderProjectButtons()}

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
