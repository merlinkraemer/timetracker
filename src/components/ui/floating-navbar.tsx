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
        "fixed bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-50",
        className
      )}
    >
      <div className="bg-background/80 backdrop-blur-md border border-border rounded-full shadow-lg px-1 sm:px-2 py-1 sm:py-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/">
            <Button
              variant={currentRoute === "home" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-full h-10 w-10 sm:h-12 sm:w-12 p-0 transition-all duration-200",
                currentRoute === "home"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>

          <Link href="/history">
            <Button
              variant={currentRoute === "history" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-full h-10 w-10 sm:h-12 sm:w-12 p-0 transition-all duration-200",
                currentRoute === "history"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
