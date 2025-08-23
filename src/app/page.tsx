"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TimeTrackerData, Session, CurrentSession } from "@/types";
import {
  loadDataFromServer,
  saveDataToServer,
  saveCurrentSessionToServer,
  clearCurrentSessionFromServer,
  formatDuration,
  generateId,
} from "@/lib/api-storage";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FloatingNavbar } from "@/components/ui/floating-navbar";

type Screen = "clock-in" | "timer" | "edit";

export default function Home() {
  const [data, setData] = useState<TimeTrackerData>({
    sessions: [],
    projects: [],
  });
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(
    null
  );
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [newProject, setNewProject] = useState<string>("");
  const [showNewProject, setShowNewProject] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("clock-in");

  // Load data on component mount
  useEffect(() => {
    const loadDataAsync = async () => {
      const loadedData = await loadDataFromServer();
      setData(loadedData);
      if (loadedData.projects.length > 0) {
        setSelectedProject(loadedData.projects[0]);
      }

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
            description: session.description,
            elapsed: now.getTime() - sessionStart.getTime(),
          };
          setCurrentSession(restoredSession);
          setCurrentScreen("timer");
        } else {
          // Session is too old, clear it from server
          await clearCurrentSessionFromServer();
        }
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

  // Update current time every second for live timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startTimer = async () => {
    if (!selectedProject) return;

    const session: CurrentSession = {
      start: new Date(),
      project: selectedProject,
      description: "",
      elapsed: 0,
    };

    setCurrentSession(session);
    setCurrentScreen("timer");
    // Save session to server for persistence
    await saveCurrentSessionToServer(session);
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
    setEditingSession(newSession);
    setCurrentScreen("edit");
    // Clear current session from server
    await clearCurrentSessionFromServer();
  };

  const addProject = () => {
    if (!newProject.trim()) return;

    setData((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject.trim()],
    }));

    setSelectedProject(newProject.trim());
    setNewProject("");
    setShowNewProject(false);
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
    // Navigate to history page after saving
    window.location.href = "/history";
  };

  const backToClockIn = async () => {
    setCurrentScreen("clock-in");
    setCurrentSession(null);
    // Clear any stored session from server
    await clearCurrentSessionFromServer();
  };

  const renderClockInScreen = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Project Selection and Add Button */}
          <div className="flex gap-2 w-full">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {data.projects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowNewProject(true)}
              variant="outline"
              className="px-3"
            >
              +
            </Button>
          </div>

          {/* New Project Input - Only visible when adding */}
          {showNewProject && (
            <>
              <Input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="New project name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addProject();
                  if (e.key === "Escape") setShowNewProject(false);
                }}
                autoFocus
                className="w-full"
              />
              <div className="flex gap-3">
                <Button onClick={addProject} size="sm" className="flex-1">
                  Add Project
                </Button>
                <Button
                  onClick={() => setShowNewProject(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* Clock In Button */}
          <Button
            onClick={startTimer}
            disabled={!selectedProject}
            className="w-full h-16 text-xl font-semibold bg-green-600 hover:bg-green-700"
          >
            Clock In
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimerScreen = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4 text-center">
          <div>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {formatDuration(
                Math.max(
                  0,
                  currentTime.getTime() - currentSession!.start.getTime()
                )
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Working on:{" "}
              <span className="font-medium">{currentSession!.project}</span>
            </div>
          </div>

          {/* Clock Out Button */}
          <Button
            onClick={stopTimer}
            variant="destructive"
            className="w-full h-16 text-xl font-semibold"
          >
            Clock Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderEditScreen = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Project Selection */}
          <div className="w-full">
            <Select
              value={editingSession!.project}
              onValueChange={(value) =>
                setEditingSession({ ...editingSession!, project: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.projects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time Pickers */}
          <div className="space-y-6">
            <DateTimePicker
              date={new Date(editingSession!.start)}
              onDateTimeChange={(date) => {
                setEditingSession({
                  ...editingSession!,
                  start: date.toISOString(),
                });
              }}
              dateLabel="Start Date"
              timeLabel="Start Time"
              className="w-full"
            />
            <DateTimePicker
              date={new Date(editingSession!.end!)}
              onDateTimeChange={(date) => {
                setEditingSession({
                  ...editingSession!,
                  end: date.toISOString(),
                });
              }}
              dateLabel="End Date"
              timeLabel="End Time"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="w-full">
            <Input
              value={editingSession!.description}
              onChange={(e) =>
                setEditingSession({
                  ...editingSession!,
                  description: e.target.value,
                })
              }
              placeholder="What did you work on?"
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 w-full">
            <Button onClick={saveEdit} className="flex-1">
              Save
            </Button>
            <Button
              onClick={backToClockIn}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col pb-28 sm:pb-32">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Screen Content */}
        <div className="space-y-6">
          {currentScreen === "clock-in" && renderClockInScreen()}
          {currentScreen === "timer" && renderTimerScreen()}
          {currentScreen === "edit" && renderEditScreen()}
        </div>
      </div>

      {/* Floating Navigation Bar */}
      <FloatingNavbar currentRoute="home" />
    </div>
  );
}
