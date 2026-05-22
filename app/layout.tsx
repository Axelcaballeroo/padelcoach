import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegistration } from "@/components/pwa/pwa-registration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://padelcoach.app"),
  title: "PadelCoach",
  description: "Agenda inteligente para profesores de pádel",
  applicationName: "PadelCoach",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PadelCoach",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "PadelCoach",
    description: "Agenda inteligente para profesores de pádel",
    url: "/",
    siteName: "PadelCoach",
    type: "website",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "PadelCoach",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PadelCoach",
    description: "Agenda inteligente para profesores de pádel",
    images: ["/og"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/icons/padelcoach-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/padelcoach-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#16A34A",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
