import type { Metadata } from "next";
import "./globals.css";
import { TimeTrackerProvider } from "@/lib/context";
import { AuthWrapper } from "@/components/auth-wrapper";

export const metadata: Metadata = {
  title: "Timetracker",
  description: "Simple, terminal-style timetracker for developers",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    minimumScale: 1,
  },
  themeColor: "#0a0a0a",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Timetracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className="antialiased">
        <AuthWrapper>
          <TimeTrackerProvider>{children}</TimeTrackerProvider>
        </AuthWrapper>
      </body>
    </html>
  );
}
