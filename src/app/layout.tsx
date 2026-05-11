import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

// Application metadata for SEO and PWA
export const metadata: Metadata = {
  title: "LCPS ERP — Latex Compounding Production Scheduling",
  description:
    "Industrial ERP system for latex compounding production scheduling, batch tracking, timeline visualization, and real-time planning.",
  keywords: [
    "latex compounding",
    "production scheduling",
    "ERP",
    "batch planning",
    "industrial",
    "manufacturing",
    "glove production",
  ],
  authors: [{ name: "LCPS Team" }],
  creator: "LCPS ERP",
  publisher: "LCPS ERP",
  applicationName: "LCPS ERP",
  generator: "Next.js",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://lcps-erp.vercel.app",
    siteName: "LCPS ERP",
    title: "LCPS ERP — Latex Compounding Production Scheduling",
    description:
      "Industrial ERP system for latex compounding production scheduling and batch tracking.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LCPS ERP — Latex Compounding Production Scheduling",
    description:
      "Industrial ERP system for latex compounding production scheduling and batch tracking.",
  },
};

// Viewport configuration for responsive design
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d1117",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* iOS PWA config */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LCPS ERP" />
      </head>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
