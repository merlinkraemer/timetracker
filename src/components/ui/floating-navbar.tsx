"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Clock, BarChart3 } from "lucide-react";

interface FloatingNavbarProps {
  currentRoute?: string;
  className?: string;
}

export function FloatingNavbar({
  currentRoute = "home",
  className,
}: FloatingNavbarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-50",
        className
      )}
    >
      <div className="bg-background/80 backdrop-blur-md border border-border rounded-full shadow-lg px-2 py-2">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant={currentRoute === "home" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-full h-12 w-12 p-0 transition-all duration-200",
                currentRoute === "home"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Clock className="h-5 w-5" />
            </Button>
          </Link>

          <Link href="/history">
            <Button
              variant={currentRoute === "history" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-full h-12 w-12 p-0 transition-all duration-200",
                currentRoute === "history"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
