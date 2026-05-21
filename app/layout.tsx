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
  title: {
    default: "PadelCoach",
    template: "%s | PadelCoach",
  },
  description:
    "Gestiona clases, alumnos, abonos, pagos y agenda semanal desde la cancha.",
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
    description:
      "La app mobile-first para profesores de padel: agenda, alumnos, abonos y pagos.",
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
    description:
      "Agenda, alumnos, abonos y pagos para profesores de padel.",
    images: ["/og"],
  },
  icons: {
    icon: [{ url: "/icon", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f8f4",
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
