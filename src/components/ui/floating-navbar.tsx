"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Settings } from "lucide-react";

interface FloatingNavbarProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  className?: string;
}

export function FloatingNavbar({
  currentRoute = "home",
  onNavigate,
  className,
}: FloatingNavbarProps) {
  const handleNavigation = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      // Default navigation behavior
      if (route === "history") {
        window.location.href = "/history";
      } else if (route === "home") {
        window.location.href = "/";
      }
      // Preferences route will be handled later
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-50",
        className
      )}
    >
      <div className="bg-background/80 backdrop-blur-md border border-border rounded-full shadow-lg px-2 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant={currentRoute === "home" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("home")}
            className={cn(
              "rounded-full h-10 w-10 p-0 transition-all duration-200",
              currentRoute === "home"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Home className="h-5 w-5" />
          </Button>

          <Button
            variant={currentRoute === "history" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("history")}
            className={cn(
              "rounded-full h-10 w-10 p-0 transition-all duration-200",
              currentRoute === "history"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Calendar className="h-5 w-5" />
          </Button>

          <Button
            variant={currentRoute === "preferences" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("preferences")}
            className={cn(
              "rounded-full h-10 w-10 p-0 transition-all duration-200",
              currentRoute === "preferences"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
