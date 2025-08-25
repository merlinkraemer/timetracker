"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Session } from "@/types";
import { formatDuration, formatTime } from "@/lib/api-storage";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { ChevronLeft, ChevronRight } from "@mynaui/icons-react";
import { Check, X, Edit, Trash, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { useTimeTracker } from "@/lib/context";
import { useSwipeNavigation } from "@/lib/use-swipe-navigation";

export default function History() {
  const router = useRouter();
  const { data, setData, isLoading } = useTimeTracker();
  
  // Local state for immediate UI updates
  const [localSessions, setLocalSessions] = useState(data.sessions);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sync local state with context data, but only when not editing or saving
  useEffect(() => {
    if (!editingSession && !isSaving) {
      setLocalSessions(data.sessions);
    }
  }, [data.sessions, editingSession, isSaving]);
  
  // Also sync when sessions are added/removed from timer operations
  useEffect(() => {
    if (data.sessions.length !== localSessions.length && !editingSession && !isSaving) {
      setLocalSessions(data.sessions);
    }
  }, [data.sessions.length, localSessions.length, data.sessions, editingSession, isSaving]);

  // Swipe navigation for mobile
  const { elementRef } = useSwipeNavigation({
    onSwipeLeft: () => router.push("/"),
    onSwipeRight: () => router.push("/"),
  });

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportDate, setExportDate] = useState(new Date().toISOString());
  const [exportProject, setExportProject] = useState<string>("all");
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    project: "",
    description: "",
  });

  // Memoize filtered sessions to improve performance
  const filteredSessions = useMemo(() => {
    return localSessions.filter((session) => {
      const date = new Date(session.start);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const matchesMonth = monthKey === currentMonth;
      const matchesProject =
        selectedProject === "all" || session.project === selectedProject;
      return matchesMonth && matchesProject;
    });
  }, [localSessions, currentMonth, selectedProject]);

  // Memoize grouped sessions to improve performance
  const groupedSessions = useMemo(() => {
    return filteredSessions.reduce((groups, session) => {
      const date = new Date(session.start);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
      return groups;
    }, {} as Record<string, Session[]>);
  }, [filteredSessions]);

  // Memoize sorted dates to improve performance
  const sortedDates = useMemo(() => {
    return Object.keys(groupedSessions).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [groupedSessions]);

  // Show loading state
  if (isLoading) {
    return (
      <div
        ref={elementRef}
        className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 pb-28 sm:pb-32 swipe-container"
      >
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
        <FloatingNavbar currentRoute="history" />
      </div>
    );
  }

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const [year, month] = currentMonth.split("-").map(Number);
    let newYear = year;
    let newMonth = month;

    if (direction === "prev") {
      if (newMonth === 1) {
        newMonth = 12;
        newYear--;
      } else {
        newMonth--;
      }
    } else {
      if (newMonth === 12) {
        newMonth = 1;
        newYear++;
      } else {
        newMonth++;
      }
    }

    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const exportAndCashOutSessions = (upToDate: string, projectName: string) => {
    console.log(
      "Export and cash out function called with date:",
      upToDate,
      "and project:",
      projectName
    );
    // Create a date object with the selected date and current time (end of day)
    const exportDate = new Date(upToDate);
    exportDate.setHours(23, 59, 59, 999); // Set to end of the selected day
    console.log("Export date object (end of day):", exportDate);

    // Filter sessions for the specific project up to the selected date
    const sessionsToExport = data.sessions.filter((session) => {
      const sessionDate = new Date(session.start);
      const isCashedOut = session.cashedOut || false;
      const matchesProject =
        projectName === "all" || session.project === projectName;
      const shouldExport =
        sessionDate <= exportDate && !isCashedOut && matchesProject;
      console.log(
        `Session ${session.id}: date=${sessionDate}, project=${session.project}, cashedOut=${isCashedOut}, shouldExport=${shouldExport}`
      );
      return shouldExport;
    });

    console.log("Sessions to export:", sessionsToExport);

    if (sessionsToExport.length === 0) {
      console.log("No sessions to export");
      alert("No sessions found for the selected criteria");
      return;
    }

    // Create Excel workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Date", "Start Time", "End Time", "Duration", "Description"],
      ...sessionsToExport.map((session) => {
        const startDate = new Date(session.start);
        const endDate = session.end ? new Date(session.end) : null;
        const duration = endDate ? endDate.getTime() - startDate.getTime() : 0;

        return [
          startDate.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          startDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          endDate
            ? endDate.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Running",
          formatDuration(duration),
          session.description || "",
        ];
      }),
    ]);

    // Set column widths
    worksheet["!cols"] = [
      { width: 12 }, // Date
      { width: 10 }, // Start Time
      { width: 10 }, // End Time
      { width: 12 }, // Duration
      { width: 30 }, // Description
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sessions");

    // Create and download file
    const projectLabel =
      projectName === "all"
        ? "All_Projects"
        : projectName.replace(/[^a-z0-9]/gi, "_");

    // Generate Excel file
    XLSX.writeFile(
      workbook,
      `${projectLabel}_export_${exportDate.toISOString().split("T")[0]}.xlsx`
    );

    // Mark sessions as cashed out automatically
    console.log("Marking sessions as cashed out...");
    setData((prev) => {
      const updatedSessions = prev.sessions.map((session) => {
        const sessionDate = new Date(session.start);
        const matchesProject =
          projectName === "all" || session.project === projectName;
        if (sessionDate <= exportDate && matchesProject) {
          return { ...session, cashedOut: true };
        }
        return session;
      });
      console.log("Updated sessions:", updatedSessions);
      return {
        ...prev,
        sessions: updatedSessions,
      };
    });
  };

  const startEditing = (session: Session) => {
    setEditForm({
      startTime: new Date(session.start).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      endTime: session.end
        ? new Date(session.end).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          }),
      project: session.project,
      description: session.description || "",
    });
    setEditingSession(session.id);
  };

  const saveEdit = () => {
    if (!editingSession) return;

    // Find the actual session object
    const session = data.sessions.find((s) => s.id === editingSession);
    if (!session) return;

    // Parse the time strings (format: "14:30")
    const [startHour, startMinute] = editForm.startTime.split(":").map(Number);
    const [endHour, endMinute] = editForm.endTime.split(":").map(Number);

    // Create new dates using the original session dates but with updated times
    const originalStartDate = new Date(session.start);
    const newStartDate = new Date(originalStartDate);
    newStartDate.setHours(startHour, startMinute, 0, 0);

    const originalEndDate = session.end ? new Date(session.end) : new Date();
    const newEndDate = new Date(originalEndDate);
    newEndDate.setHours(endHour, endMinute, 0, 0);

    const updatedSession: Session = {
      ...session,
      start: newStartDate.toISOString(),
      end: newEndDate.toISOString(),
      project: editForm.project,
      description: editForm.description,
    };

    // Update local state immediately for instant UI feedback
    const updatedSessions = localSessions.map((s) =>
      s.id === editingSession ? updatedSession : s
    );
    
    // Update local state first for immediate UI update
    setLocalSessions(updatedSessions);
    
    // Clear editing state and form immediately for better UX
    setEditingSession(null);
    setEditForm({
      startTime: "",
      endTime: "",
      project: "",
      description: "",
    });

    // Set saving flag to prevent context from overriding our changes
    setIsSaving(true);

    // Save to server in the background
    const saveToServer = async () => {
      try {
        const { syncService } = await import('@/lib/sync-service');
        
        const updatedData = {
          projects: data.projects,
          sessions: updatedSessions,
        };
        
        const result = await syncService.saveData(updatedData);
        if (result.success) {
          console.log("Session edit saved to server successfully");
          
          // Ensure context state is fully updated
          setData((prev) => ({
            ...prev,
            sessions: updatedSessions,
          }));
        } else {
          console.error("Failed to save session edit to server:", result.error);
          // Optionally show error message to user
        }
      } catch (error) {
        console.error("Error saving session edit to server:", error);
        // Optionally show error message to user
      } finally {
        // Clear saving flag after save completes
        setIsSaving(false);
      }
    };

    // Execute the save in the background
    saveToServer();
  };

  const cancelEdit = () => {
    setEditingSession(null);
    setEditForm({
      startTime: "",
      endTime: "",
      project: "",
      description: "",
    });
  };

  const deleteSession = (sessionId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this session? This action cannot be undone."
      )
    ) {
      // Update local state immediately for instant UI feedback
      const updatedSessions = localSessions.filter((s) => s.id !== sessionId);
      
      // Update local state first for immediate UI update
      setLocalSessions(updatedSessions);
      
      // Then update context state
      setData({
        ...data,
        sessions: updatedSessions,
      });

      // Save to server using sync service
      const saveToServer = async () => {
        try {
          const { syncService } = await import('@/lib/sync-service');
          const updatedData = {
            ...data,
            sessions: updatedSessions,
          };
          
          const result = await syncService.saveData(updatedData);
          if (result.success) {
            console.log("Session deletion saved to server successfully");
          } else {
            console.error("Failed to save session deletion to server:", result.error);
          }
        } catch (error) {
          console.error("Error saving session deletion to server:", error);
        }
      };

      saveToServer();
    }
  };

  return (
    <div
      ref={elementRef}
      className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 pb-28 sm:pb-32 swipe-container"
    >
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {data.projects.map((project) => (
                  <SelectItem key={project.name} value={project.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setShowExportPopup(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={() => navigateMonth("prev")}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-semibold">
            {formatMonthYear(currentMonth)}
          </h2>
          <Button
            onClick={() => navigateMonth("next")}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Sessions by Date */}
        <div className="space-y-4 sm:space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex justify-between items-center mb-3 sm:mb-4 px-2 sm:px-0">
                <h3 className="text-lg font-semibold">
                  {new Date(date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                  })}
                </h3>
                <div className="text-lg font-semibold text-primary">
                  Total{" "}
                  {formatDuration(
                    groupedSessions[date].reduce((total, session) => {
                      if (session.end) {
                        return (
                          total +
                          (new Date(session.end).getTime() -
                            new Date(session.start).getTime())
                        );
                      }
                      return total;
                    }, 0)
                  )}
                </div>
              </div>

              {/* Sessions List */}
              <div className="space-y-3 sm:space-y-4">
                {(() => {
                  const sessions = groupedSessions[date].sort(
                    (a, b) =>
                      new Date(b.start).getTime() - new Date(a.start).getTime()
                  );

                  const normalSessions = sessions.filter(
                    (s) => !(s.cashedOut || false)
                  );
                  const cashedOutSessions = sessions.filter(
                    (s) => s.cashedOut || false
                  );

                  return (
                    <>
                      {/* Normal Sessions */}
                      {normalSessions.map((session) => {
                        const duration = session.end
                          ? new Date(session.end).getTime() -
                            new Date(session.start).getTime()
                          : 0;

                        const isEditing = editingSession === session.id;

                        return (
                          <Card
                            key={session.id}
                            className={
                              session.cashedOut || false ? "opacity-60" : ""
                            }
                          >
                            <CardContent
                              className={`p-4 ${
                                session.cashedOut || false
                                  ? "bg-muted/5 text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {isEditing ? (
                                <div className="flex flex-col gap-4">
                                  {/* Top Row: Time and Duration */}
                                  <div className="flex items-center justify-between">
                                    {/* Left: Start/Stop Time - Editable */}
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={
                                          editForm.startTime ||
                                          formatTime(new Date(session.start))
                                        }
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            startTime: e.target.value,
                                          }))
                                        }
                                        className="text-2xl font-bold text-primary w-20 text-center border-none p-0 bg-transparent"
                                        placeholder="HH:MM"
                                      />
                                      <span className="text-2xl font-bold text-primary">
                                        -
                                      </span>
                                      <Input
                                        value={
                                          editForm.endTime ||
                                          formatTime(new Date(session.end!))
                                        }
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            endTime: e.target.value,
                                          }))
                                        }
                                        className="text-2xl font-bold text-primary w-20 text-center border-none p-0 bg-transparent"
                                        placeholder="HH:MM"
                                      />
                                    </div>

                                    {/* Right: Duration - Calculated */}
                                    <div className="text-2xl font-bold text-primary">
                                      {formatDuration(duration)}
                                    </div>
                                  </div>

                                  {/* Separator between Time and Project */}
                                  <div className="h-px bg-border w-full"></div>

                                  {/* Project and Description Group */}
                                  <div className="space-y-3">
                                    {/* Project Name with Color Tag - Editable */}
                                    <div className="flex items-center gap-3">
                                      <Select
                                        value={
                                          editForm.project || session.project
                                        }
                                        onValueChange={(value: string) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            project: value,
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="border-none p-0 bg-transparent text-base font-medium text-foreground px-3">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {data.projects.map((project) => (
                                            <SelectItem
                                              key={project.name}
                                              value={project.name}
                                            >
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className="w-3 h-3 rounded-full"
                                                  style={{
                                                    backgroundColor:
                                                      project.color,
                                                  }}
                                                />
                                                {project.name}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {(session.cashedOut || false) && (
                                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                          Cashed Out
                                        </span>
                                      )}
                                    </div>

                                    {/* Description - Editable */}
                                    <div>
                                      <Input
                                        value={
                                          editForm.description ||
                                          session.description ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                          }))
                                        }
                                        placeholder="Add description..."
                                        className="text-sm text-muted-foreground max-w-md border-none px-2 bg-transparent"
                                      />
                                    </div>
                                  </div>

                                  {/* Bottom: Action Buttons */}
                                  <div className="flex justify-end">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={cancelEdit}
                                        variant="outline"
                                        size="lg"
                                        className="h-12 w-12 rounded-full"
                                      >
                                        <X className="h-5 w-5" />
                                      </Button>
                                      <Button
                                        onClick={() => saveEdit()}
                                        size="lg"
                                        className="h-12 w-12 rounded-full"
                                      >
                                        <Check className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-4">
                                  {/* Top Row: Time and Duration */}
                                  <div className="flex items-center justify-between">
                                    {/* Left: Start/Stop Time */}
                                    <div className="text-2xl font-bold text-primary">
                                      {formatTime(new Date(session.start))} -{" "}
                                      {formatTime(new Date(session.end!))}
                                    </div>

                                    {/* Right: Duration */}
                                    <div className="text-2xl font-bold text-primary">
                                      {formatDuration(duration)}
                                    </div>
                                  </div>

                                  {/* Separator between Time and Project */}
                                  <div className="h-px bg-border w-full"></div>

                                  {/* Project and Description Group */}
                                  <div className="space-y-2">
                                    {/* Project Name with Color Tag - Heading */}
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                          backgroundColor:
                                            data.projects.find(
                                              (p) => p.name === session.project
                                            )?.color || "#3B82F6",
                                        }}
                                      />
                                      <div className="text-base font-medium text-foreground">
                                        {session.project}
                                      </div>
                                      {(session.cashedOut || false) && (
                                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                          Cashed Out
                                        </span>
                                      )}
                                    </div>

                                    {/* Description - Body Text */}
                                    {session.description && (
                                      <div className="text-sm text-muted-foreground max-w-xs">
                                        {session.description}
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom: Action Buttons */}
                                  <div className="flex justify-end">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={() => startEditing(session)}
                                        variant="outline"
                                        size="lg"
                                        className="h-12 w-12 rounded-full"
                                      >
                                        <Edit className="h-5 w-5" />
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          deleteSession(session.id)
                                        }
                                        variant="outline"
                                        size="lg"
                                        className="h-12 w-12 rounded-full text-destructive hover:text-destructive"
                                      >
                                        <Trash className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}

                      {/* Separator and Cashed Out Sessions */}
                      {cashedOutSessions.length > 0 && (
                        <>
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border"></div>
                            <span className="text-xs text-muted-foreground px-2">
                              Cashed Out
                            </span>
                            <Button
                              onClick={() => {
                                if (
                                  confirm(
                                    "Remove all cashed out sessions from this date? This cannot be undone."
                                  )
                                ) {
                                  setData((prev) => ({
                                    ...prev,
                                    sessions: prev.sessions.filter((s) => {
                                      const sessionDate = new Date(
                                        s.start
                                      ).toDateString();
                                      return (
                                        sessionDate !== date || !s.cashedOut
                                      );
                                    }),
                                  }));
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive px-2 py-1 h-auto"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                            <div className="flex-1 h-px bg-border"></div>
                          </div>

                          {cashedOutSessions.map((session) => {
                            const duration = session.end
                              ? new Date(session.end).getTime() -
                                new Date(session.start).getTime()
                              : 0;

                            const isEditing = editingSession === session.id;

                            return (
                              <Card key={session.id} className="opacity-60">
                                <CardContent className="p-4 bg-muted/5 text-muted-foreground">
                                  {isEditing ? (
                                    <div className="flex flex-col gap-4">
                                      {/* Top Row: Time and Duration */}
                                      <div className="flex items-center justify-between">
                                        {/* Left: Start/Stop Time - Editable */}
                                        <div className="flex items-center gap-2">
                                          <Input
                                            value={
                                              editForm.startTime ||
                                              formatTime(
                                                new Date(session.start)
                                              )
                                            }
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                startTime: e.target.value,
                                              }))
                                            }
                                            className="text-2xl font-bold text-primary w-20 text-center border-none p-0 bg-transparent"
                                            placeholder="HH:MM"
                                          />
                                          <span className="text-2xl font-bold text-primary">
                                            -
                                          </span>
                                          <Input
                                            value={
                                              editForm.endTime ||
                                              formatTime(new Date(session.end!))
                                            }
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                endTime: e.target.value,
                                              }))
                                            }
                                            className="text-2xl font-bold text-primary w-20 text-center border-none p-0 bg-transparent"
                                            placeholder="HH:MM"
                                          />
                                        </div>

                                        {/* Right: Duration - Calculated */}
                                        <div className="text-2xl font-bold text-primary">
                                          {formatDuration(duration)}
                                        </div>
                                      </div>

                                      {/* Separator between Time and Project */}
                                      <div className="h-px bg-border w-full"></div>

                                      {/* Project and Description Group */}
                                      <div className="space-y-3">
                                        {/* Project Name with Color Tag - Editable */}
                                        <div className="flex items-center gap-3">
                                          <Select
                                            value={
                                              editForm.project ||
                                              session.project
                                            }
                                            onValueChange={(value: string) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                project: value,
                                              }))
                                            }
                                          >
                                            <SelectTrigger className="border-none p-0 bg-transparent text-base font-medium text-foreground px-3">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {data.projects.map((project) => (
                                                <SelectItem
                                                  key={project.name}
                                                  value={project.name}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div
                                                      className="w-3 h-3 rounded-full"
                                                      style={{
                                                        backgroundColor:
                                                          project.color,
                                                      }}
                                                    />
                                                    {project.name}
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                            Cashed Out
                                          </span>
                                        </div>

                                        {/* Description - Editable */}
                                        <div>
                                          <Input
                                            value={
                                              editForm.description ||
                                              session.description ||
                                              ""
                                            }
                                            placeholder="Add description..."
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                              }))
                                            }
                                            className="text-sm text-muted-foreground max-w-md border-none px-2 bg-transparent"
                                          />
                                        </div>
                                      </div>

                                      {/* Bottom: Action Buttons */}
                                      <div className="flex justify-end">
                                        <div className="flex items-center gap-2">
                                          <Button
                                            onClick={cancelEdit}
                                            variant="outline"
                                            size="lg"
                                            className="h-12 w-12 rounded-full"
                                          >
                                            <X className="h-5 w-5" />
                                          </Button>
                                          <Button
                                            onClick={() => saveEdit()}
                                            size="lg"
                                            className="h-12 w-12 rounded-full"
                                          >
                                            <Check className="h-5 w-5" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-4">
                                      {/* Top Row: Time and Duration */}
                                      <div className="flex items-center justify-between">
                                        {/* Left: Start/Stop Time */}
                                        <div className="text-2xl font-bold text-primary">
                                          {formatTime(new Date(session.start))}{" "}
                                          - {formatTime(new Date(session.end!))}
                                        </div>

                                        {/* Right: Duration */}
                                        <div className="text-2xl font-bold text-primary">
                                          {formatDuration(duration)}
                                        </div>
                                      </div>

                                      {/* Separator between Time and Project */}
                                      <div className="h-px bg-border w-full"></div>

                                      {/* Project and Description Group */}
                                      <div className="space-y-2">
                                        {/* Project Name with Color Tag - Heading */}
                                        <div className="flex items-center gap-3">
                                          <div
                                            className="w-3 h-3 rounded-full"
                                            style={{
                                              backgroundColor:
                                                data.projects.find(
                                                  (p) =>
                                                    p.name === session.project
                                                )?.color || "#3B82F6",
                                            }}
                                          />
                                          <div className="text-base font-medium text-foreground">
                                            {session.project}
                                          </div>
                                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                            Cashed Out
                                          </span>
                                        </div>

                                        {/* Description - Body Text */}
                                        {session.description && (
                                          <div className="text-sm text-muted-foreground max-w-xs">
                                            {session.description}
                                          </div>
                                        )}
                                      </div>

                                      {/* Bottom: Action Buttons */}
                                      <div className="flex justify-end">
                                        <div className="flex items-center gap-2">
                                          <Button
                                            onClick={() =>
                                              startEditing(session)
                                            }
                                            variant="outline"
                                            size="lg"
                                            className="h-12 w-12 rounded-full"
                                          >
                                            <Edit className="h-5 w-5" />
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              deleteSession(session.id)
                                            }
                                            variant="outline"
                                            size="lg"
                                            className="h-12 w-12 rounded-full text-destructive hover:text-destructive"
                                          >
                                            <Trash className="h-5 w-5" />
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
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(groupedSessions).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {selectedProject === "all"
                  ? `No sessions found for ${formatMonthYear(currentMonth)}.`
                  : `No sessions found for ${selectedProject} in ${formatMonthYear(
                      currentMonth
                    )}.`}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export and Cash Out Popup */}
        {showExportPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Export Sessions</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Project to export:
                  </label>
                  <Select
                    value={exportProject}
                    onValueChange={setExportProject}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {data.projects.map((project) => (
                        <SelectItem key={project.name} value={project.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <DateTimePicker
                    date={new Date(exportDate)}
                    onDateTimeChange={(date) =>
                      setExportDate(date.toISOString())
                    }
                    dateLabel="Export sessions up to:"
                  />
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  This will export all sessions up to the selected date for the
                  selected project as an Excel file.
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => {
                      exportAndCashOutSessions(exportDate, exportProject);
                      setShowExportPopup(false);
                    }}
                    variant="default"
                    className="flex-1"
                  >
                    Export
                  </Button>
                  <Button
                    onClick={() => setShowExportPopup(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Navigation Bar */}
      <FloatingNavbar currentRoute="history" />
    </div>
  );
}
