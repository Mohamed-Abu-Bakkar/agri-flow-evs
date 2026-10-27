import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { FarmAIChat } from "@/components/shared/FarmAIChat";
import { LocationPermissionModal } from "@/components/shared/LocationPermissionModal";

export const metadata: Metadata = {
  title: "AgriFlow",
  description: "Seed logging, weather capture, and AI fertilizer & irrigation recommendations.",
  applicationName: "AgriFlow",
  appleWebApp: {
    capable: true,
    title: "AgriFlow",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16a34a",
};

export const html = {
  language: "en",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-screen antialiased max-w-md mx-auto bg-background text-foreground">
        <ConvexClientProvider>
          {children}
          <FarmAIChat />
          <LocationPermissionModal />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
