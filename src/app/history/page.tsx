"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Session } from "@/types";
import { formatDuration, formatTime, formatDate } from "@/lib/api-storage";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Calendar,
  Dollar,
  ChevronLeft,
  ChevronRight,
  Trash,
} from "@mynaui/icons-react";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { useTimeTracker } from "@/lib/context";

export default function History() {
  const { data, setData, isLoading } = useTimeTracker();

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [showCashOutPopup, setShowCashOutPopup] = useState(false);
  const [cashOutDate, setCashOutDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    project: "",
    description: "",
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 pb-28 sm:pb-32">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
        <FloatingNavbar currentRoute="history" />
      </div>
    );
  }

  const getTotalTimeForProject = (projectName: string) => {
    return data.sessions
      .filter((s) => s.project === projectName && s.end)
      .reduce((total, session) => {
        const duration =
          new Date(session.end!).getTime() - new Date(session.start).getTime();
        return total + duration;
      }, 0);
  };

  const getTotalTimeAll = () => {
    return data.sessions
      .filter((s) => s.end)
      .reduce((total, session) => {
        const duration =
          new Date(session.end!).getTime() - new Date(session.start).getTime();
        return total + duration;
      }, 0);
  };

  const getTotalTimeForFilteredSessions = () => {
    const filteredSessions =
      selectedProject === "all"
        ? data.sessions
        : data.sessions.filter((s) => s.project === selectedProject);

    return filteredSessions
      .filter((s) => s.end)
      .reduce((total, session) => {
        const duration =
          new Date(session.end!).getTime() - new Date(session.start).getTime();
        return total + duration;
      }, 0);
  };

  // Filter sessions by selected month and project
  const filteredSessions = data.sessions.filter((session) => {
    const date = new Date(session.start);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    const matchesMonth = monthKey === currentMonth;
    const matchesProject =
      selectedProject === "all" || session.project === selectedProject;
    return matchesMonth && matchesProject;
  });

  // Group sessions by date within the selected month
  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = new Date(session.start);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, Session[]>);

  const sortedDates = Object.keys(groupedSessions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

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

  const cashOutSessions = (upToDate: string) => {
    console.log("Cash out function called with date:", upToDate);
    // Create a date object with the selected date and current time (end of day)
    const cashOutDate = new Date(upToDate);
    cashOutDate.setHours(23, 59, 59, 999); // Set to end of the selected day
    console.log("Cash out date object (end of day):", cashOutDate);

    const sessionsToCashOut = data.sessions.filter((session) => {
      const sessionDate = new Date(session.start);
      // Ensure cashedOut property exists, default to false if undefined
      const isCashedOut = session.cashedOut || false;
      const shouldCashOut = sessionDate <= cashOutDate && !isCashedOut;
      console.log(
        `Session ${session.id}: date=${sessionDate}, cashedOut=${isCashedOut}, shouldCashOut=${shouldCashOut}`
      );
      return shouldCashOut;
    });

    console.log("Sessions to cash out:", sessionsToCashOut);

    if (sessionsToCashOut.length === 0) {
      console.log("No sessions to cash out");
      return;
    }

    if (
      confirm(
        `This will mark ${
          sessionsToCashOut.length
        } sessions as cashed out up to ${cashOutDate.toLocaleDateString()}. Continue?`
      )
    ) {
      console.log("User confirmed, updating sessions...");
      setData((prev) => {
        const updatedSessions = prev.sessions.map((session) => {
          const sessionDate = new Date(session.start);
          if (sessionDate <= cashOutDate) {
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
    }
  };

  const startEditing = (session: Session) => {
    const startDate = new Date(session.start);
    const endDate = session.end ? new Date(session.end) : new Date();

    setEditForm({
      startTime: startDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      endTime: endDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      project: session.project,
      description: session.description || "",
    });
    setEditingSession(session.id);
  };

  const saveEdit = (sessionId: string) => {
    const session = data.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const startDate = new Date(session.start);
    const endDate = session.end ? new Date(session.end) : new Date();

    // Parse times and update dates
    const [startHour, startMinute] = editForm.startTime.split(":").map(Number);
    const [endHour, endMinute] = editForm.endTime.split(":").map(Number);

    const newStartDate = new Date(startDate);
    newStartDate.setHours(startHour, startMinute, 0, 0);

    const newEndDate = new Date(endDate);
    newEndDate.setHours(endHour, endMinute, 0, 0);

    const updatedSession: Session = {
      ...session,
      start: newStartDate.toISOString(),
      end: newEndDate.toISOString(),
      project: editForm.project,
      description: editForm.description,
    };

    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === sessionId ? updatedSession : s
      ),
    }));

    setEditingSession(null);
  };

  const cancelEdit = () => {
    setEditingSession(null);
  };

  const deleteSession = (sessionId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this session? This action cannot be undone."
      )
    ) {
      setData((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((s) => s.id !== sessionId),
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 pb-28 sm:pb-32">
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
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setShowCashOutPopup(true)}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <Dollar className="w-4 h-4" />
            <span className="hidden sm:inline">Cash Out</span>
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
                  {formatDate(new Date(date))} -{" "}
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                  })}
                </h3>
                <div className="text-lg font-semibold text-primary">
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
                                <div className="space-y-6">
                                  {/* Project Selection */}
                                  <div className="w-full">
                                    <Select
                                      value={editForm.project}
                                      onValueChange={(value) =>
                                        setEditForm((prev) => ({
                                          ...prev,
                                          project: value,
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {data.projects.map((project) => (
                                          <SelectItem
                                            key={project}
                                            value={project}
                                          >
                                            {project}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Date and Time Pickers */}
                                  <div className="space-y-6">
                                    <DateTimePicker
                                      date={new Date(session.start)}
                                      onDateTimeChange={(date) => {
                                        setEditForm((prev) => ({
                                          ...prev,
                                          startTime: date.toLocaleTimeString(
                                            "en-US",
                                            {
                                              hour12: false,
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            }
                                          ),
                                        }));
                                      }}
                                      dateLabel="Start Date"
                                      timeLabel="Start Time"
                                      className="w-full"
                                    />
                                    <DateTimePicker
                                      date={
                                        session.end
                                          ? new Date(session.end)
                                          : new Date()
                                      }
                                      onDateTimeChange={(date) => {
                                        setEditForm((prev) => ({
                                          ...prev,
                                          endTime: date.toLocaleTimeString(
                                            "en-US",
                                            {
                                              hour12: false,
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            }
                                          ),
                                        }));
                                      }}
                                      dateLabel="End Date"
                                      timeLabel="End Time"
                                      className="w-full"
                                    />
                                  </div>

                                  {/* Description */}
                                  <div className="w-full">
                                    <Input
                                      value={editForm.description}
                                      onChange={(e) =>
                                        setEditForm((prev) => ({
                                          ...prev,
                                          description: e.target.value,
                                        }))
                                      }
                                      placeholder="What did you work on?"
                                      className="w-full"
                                    />
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-3 pt-2 w-full">
                                    <Button
                                      onClick={() => saveEdit(session.id)}
                                      className="flex-1"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      onClick={cancelEdit}
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Date and Duration */}
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-muted-foreground">
                                      {new Date(
                                        session.start
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        weekday: "short",
                                      })}
                                    </div>
                                    <div className="text-primary font-bold text-base">
                                      {formatDuration(duration)}
                                    </div>
                                  </div>

                                  {/* Project and Cashed Out Badge */}
                                  <div className="flex items-center gap-2">
                                    <div className="text-base font-semibold text-primary">
                                      {session.project}
                                    </div>
                                    {(session.cashedOut || false) && (
                                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                        Cashed Out
                                      </span>
                                    )}
                                  </div>

                                  {/* Time Range and Action Buttons */}
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm text-foreground font-medium">
                                      {formatTime(new Date(session.start))} -{" "}
                                      {formatTime(new Date(session.end!))}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => startEditing(session)}
                                        variant="outline"
                                        size="sm"
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          deleteSession(session.id)
                                        }
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  {session.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {session.description}
                                    </div>
                                  )}
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
                                    <div className="space-y-6">
                                      {/* Project Selection */}
                                      <div className="w-full">
                                        <Select
                                          value={editForm.project}
                                          onValueChange={(value) =>
                                            setEditForm((prev) => ({
                                              ...prev,
                                              project: value,
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {data.projects.map((project) => (
                                              <SelectItem
                                                key={project}
                                                value={project}
                                              >
                                                {project}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Date and Time Pickers */}
                                      <div className="space-y-6">
                                        <DateTimePicker
                                          date={new Date(session.start)}
                                          onDateTimeChange={(date) => {
                                            setEditForm((prev) => ({
                                              ...prev,
                                              startTime:
                                                date.toLocaleTimeString(
                                                  "en-US",
                                                  {
                                                    hour12: false,
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  }
                                                ),
                                            }));
                                          }}
                                          dateLabel="Start Date"
                                          timeLabel="Start Time"
                                          className="w-full"
                                        />
                                        <DateTimePicker
                                          date={
                                            session.end
                                              ? new Date(session.end)
                                              : new Date()
                                          }
                                          onDateTimeChange={(date) => {
                                            setEditForm((prev) => ({
                                              ...prev,
                                              endTime: date.toLocaleTimeString(
                                                "en-US",
                                                {
                                                  hour12: false,
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                }
                                              ),
                                            }));
                                          }}
                                          dateLabel="End Date"
                                          timeLabel="End Time"
                                          className="w-full"
                                        />
                                      </div>

                                      {/* Description */}
                                      <div className="w-full">
                                        <Input
                                          value={editForm.description}
                                          onChange={(e) =>
                                            setEditForm((prev) => ({
                                              ...prev,
                                              description: e.target.value,
                                            }))
                                          }
                                          placeholder="What did you work on?"
                                          className="w-full"
                                        />
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex gap-3 pt-2 w-full">
                                        <Button
                                          onClick={() => saveEdit(session.id)}
                                          className="flex-1"
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          onClick={cancelEdit}
                                          variant="outline"
                                          className="flex-1"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {/* Date and Duration */}
                                      <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-muted-foreground">
                                          {new Date(
                                            session.start
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            weekday: "short",
                                          })}
                                        </div>
                                        <div className="text-primary font-bold text-base">
                                          {formatDuration(duration)}
                                        </div>
                                      </div>

                                      {/* Project and Cashed Out Badge */}
                                      <div className="flex items-center gap-2">
                                        <div className="text-base font-semibold text-primary">
                                          {session.project}
                                        </div>
                                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                          Cashed Out
                                        </span>
                                      </div>

                                      {/* Time Range and Action Buttons */}
                                      <div className="flex items-center justify-between">
                                        <div className="text-sm text-foreground font-medium">
                                          {formatTime(new Date(session.start))}{" "}
                                          - {formatTime(new Date(session.end!))}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() =>
                                              startEditing(session)
                                            }
                                            variant="outline"
                                            size="sm"
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              deleteSession(session.id)
                                            }
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                          >
                                            <Trash className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Description */}
                                      {session.description && (
                                        <div className="text-sm text-muted-foreground">
                                          {session.description}
                                        </div>
                                      )}
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

        {/* Cash Out Popup */}
        {showCashOutPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Cash Out Sessions</h3>
              <div className="space-y-4">
                <div>
                  <DatePicker
                    date={new Date(cashOutDate)}
                    onDateChange={(date) =>
                      setCashOutDate(date.toISOString().split("T")[0])
                    }
                    label="Mark sessions as cashed out up to:"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  This will mark all sessions up to the selected date as cashed
                  out. Cashed out sessions will remain visible but marked as
                  paid.
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      cashOutSessions(cashOutDate);
                      setShowCashOutPopup(false);
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    Cash Out
                  </Button>
                  <Button
                    onClick={() => setShowCashOutPopup(false)}
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
