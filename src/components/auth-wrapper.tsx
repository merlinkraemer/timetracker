"use client";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  // Just render children without any auth logic for now
  return <>{children}</>;
}
