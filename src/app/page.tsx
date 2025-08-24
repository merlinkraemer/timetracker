"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { Session, CurrentSession } from "@/types";
import { formatDuration, generateId } from "@/lib/api-storage";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { useTimeTracker } from "@/lib/context";

type Screen = "clock-in" | "timer" | "edit";

export default function Home() {
  const router = useRouter();
  const { data, setData, currentSession, setCurrentSession, isLoading } =
    useTimeTracker();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [newProject, setNewProject] = useState<string>("");
  const [showNewProject, setShowNewProject] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("clock-in");
  const isTransitioningRef = useRef(false);

  // Set selected project when data loads
  useEffect(() => {
    if (data.projects.length > 0 && !selectedProject) {
      setSelectedProject(data.projects[0]);
    }
  }, [data.projects, selectedProject]);

  // Set screen based on current session only when starting a new session
  useEffect(() => {
    if (
      currentSession &&
      currentScreen !== "timer" &&
      !isTransitioningRef.current
    ) {
      console.log("Auto-switching to timer screen");
      setCurrentScreen("timer");
    }
  }, [currentSession, currentScreen]);

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

    isTransitioningRef.current = true;
    setCurrentSession(session);
    setCurrentScreen("timer");
    isTransitioningRef.current = false;
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

    // Set the editing session first, then clear current session
    isTransitioningRef.current = true;
    console.log("Stopping timer, setting screen to edit");
    setEditingSession(newSession);
    setCurrentScreen("edit");
    setCurrentSession(null);
    isTransitioningRef.current = false;
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
    router.push("/history");
  };

  const backToClockIn = async () => {
    isTransitioningRef.current = true;
    setCurrentScreen("clock-in");
    setCurrentSession(null);
    setEditingSession(null);
    isTransitioningRef.current = false;
  };

  // Show loading state
  console.log("Page: isLoading =", isLoading, "data =", data);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 flex flex-col pb-28 sm:pb-32">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
        <FloatingNavbar currentRoute="home" />
      </div>
    );
  }

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

  const renderEditScreen = () => {
    if (!editingSession) {
      return (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Loading session data...
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Project Selection */}
            <div className="w-full">
              <Select
                value={editingSession.project}
                onValueChange={(value) =>
                  setEditingSession({ ...editingSession, project: value })
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
                date={new Date(editingSession.start)}
                onDateTimeChange={(date) => {
                  setEditingSession({
                    ...editingSession,
                    start: date.toISOString(),
                  });
                }}
                dateLabel="Start Date"
                timeLabel="Start Time"
                className="w-full"
              />
              <DateTimePicker
                date={new Date(editingSession.end!)}
                onDateTimeChange={(date) => {
                  setEditingSession({
                    ...editingSession,
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
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 flex flex-col pb-28 sm:pb-32">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Screen Content */}
        <div className="space-y-6">
          {currentScreen === "clock-in" && renderClockInScreen()}
          {currentScreen === "timer" && renderTimerScreen()}
          {currentScreen === "edit" && editingSession && renderEditScreen()}
        </div>
      </div>

      {/* Floating Navigation Bar */}
      <FloatingNavbar currentRoute="home" />
    </div>
  );
}
