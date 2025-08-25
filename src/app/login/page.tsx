"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/data", { method: "HEAD" });
        if (response.ok) {
          // User is authenticated, redirect to main page
          router.push("/");
        }
      } catch {
        // User is not authenticated, stay on login page
        console.log("User not authenticated, staying on login page");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    // Only check once when component mounts
    checkAuth();
  }, [router]); // Add router dependency back

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto mb-4"></div>
            <div className="h-6 w-48 bg-muted animate-pulse rounded mx-auto mb-4"></div>
            <div className="h-12 w-full bg-muted animate-pulse rounded"></div>
            <div className="h-12 w-full bg-muted animate-pulse rounded"></div>
            <div className="h-12 w-full bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to main page after successful login
        router.push("/");
      } else {
        // The original code had an 'error' state, but it was removed.
        // For now, we'll just log the error or show a generic message.
        console.error("Login failed:", data.message || "Unknown error");
      }
    } catch (error) {
      console.error("Network error during login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <form onSubmit={handleLogin} className="space-y-4">
          {/* The error message div was removed as per the edit hint. */}
          
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            disabled={isLoading}
            className="h-12 text-center text-lg"
          />
          
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            disabled={isLoading}
            className="h-12 text-center text-lg"
          />
          
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        
        <div className="text-center text-xs text-muted-foreground">
          <p>admin / admin123</p>
        </div>
      </div>
    </div>
  );
}
