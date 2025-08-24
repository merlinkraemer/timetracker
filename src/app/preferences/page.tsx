"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash, Edit, Plus, Settings, FolderOpen, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { useTimeTracker } from "@/lib/context";

export default function Preferences() {
  const { data, setData, isLoading } = useTimeTracker();

  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
  });
  const [newProject, setNewProject] = useState({
    name: "",
  });
  const [showNewProject, setShowNewProject] = useState(false);

  // Memoized expensive calculations
  const projectUsageMap = useMemo(() => {
    const usageMap = new Map<string, number>();
    data.sessions.forEach((session) => {
      usageMap.set(session.project, (usageMap.get(session.project) || 0) + 1);
    });
    return usageMap;
  }, [data.sessions]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 flex flex-col pb-28 sm:pb-32">
        <div className="max-w-2xl mx-auto w-full flex-1">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
        <FloatingNavbar currentRoute="preferences" />
      </div>
    );
  }

  const addProject = useCallback(() => {
    if (!newProject.name.trim()) return;

    // Check if project already exists
    if (data.projects.includes(newProject.name.trim())) {
      alert("Project already exists!");
      return;
    }

    setData((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject.name.trim()],
    }));

    setNewProject({ name: "" });
    setShowNewProject(false);
  }, [newProject, data.projects, setData]);

  const startEditing = useCallback((projectName: string) => {
    setEditingProject(projectName);
    setEditForm({
      name: projectName,
    });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingProject || !editForm.name.trim()) return;

    // Check if new name conflicts with existing projects
    if (
      editForm.name !== editingProject &&
      data.projects.includes(editForm.name.trim())
    ) {
      alert("Project name already exists!");
      return;
    }

    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p === editingProject ? editForm.name.trim() : p
      ),
      // Update sessions that reference this project
      sessions: prev.sessions.map((session) =>
        session.project === editingProject
          ? { ...session, project: editForm.name.trim() }
          : session
      ),
    }));

    setEditingProject(null);
    setEditForm({ name: "" });
  }, [editingProject, editForm, data.projects, setData]);

  const deleteProject = useCallback(
    (projectName: string) => {
      // Use memoized usage map for better performance
      const sessionCount = projectUsageMap.get(projectName) || 0;

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

      if (
        confirm(`Are you sure you want to delete project "${projectName}"?`)
      ) {
        setData((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p !== projectName),
          // Remove sessions that reference this project
          sessions: prev.sessions.filter(
            (session) => session.project !== projectName
          ),
        }));
      }
    },
    [projectUsageMap, setData]
  );

  const cancelEdit = useCallback(() => {
    setEditingProject(null);
    setEditForm({ name: "" });
  }, []);

  // Simple project list rendering (like history page approach)
  const renderProjectList = () => {
    if (data.projects.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {data.projects.map((project) => {
          const isEditing = editingProject === project;
          const sessionCount = projectUsageMap.get(project) || 0;
          const projectInUse = sessionCount > 0;

          return (
            <Card key={project}>
              <CardContent className="p-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-${project}`}>Project Name</Label>
                      <Input
                        id={`edit-${project}`}
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter project name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} size="sm">
                        Save
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{project}</h4>
                      {projectInUse && (
                        <p className="text-sm text-muted-foreground">
                          Used in {sessionCount} session
                          {sessionCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startEditing(project)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteProject(project)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 pt-8 sm:pt-12 flex flex-col pb-28 sm:pb-32">
      <div className="max-w-2xl mx-auto w-full flex-1">
        {/* Settings Tabs */}
        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* Add New Project */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowNewProject(!showNewProject)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Project
                      </Button>
                    </div>

                    {showNewProject && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <div className="grid gap-2">
                          <Label htmlFor="new-project-name">Project Name</Label>
                          <Input
                            id="new-project-name"
                            value={newProject.name}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                name: e.target.value,
                              })
                            }
                            placeholder="Enter project name"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addProject();
                              if (e.key === "Escape") setShowNewProject(false);
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={addProject} size="sm">
                            Add Project
                          </Button>
                          <Button
                            onClick={() => setShowNewProject(false)}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Projects List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Current Projects</h3>
                    {renderProjectList()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Account settings coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Navigation Bar */}
      <FloatingNavbar currentRoute="preferences" />
    </div>
  );
}
