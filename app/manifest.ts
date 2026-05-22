import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PadelCoach",
    short_name: "PadelCoach",
    description: "Agenda inteligente para profesores de padel",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen", "minimal-ui"],
    background_color: "#F7F8F4",
    theme_color: "#16A34A",
    orientation: "portrait",
    categories: ["productivity", "sports", "business"],
    icons: [
      {
        src: "/icons/padelcoach-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/padelcoach-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/padelcoach-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Agenda",
        short_name: "Agenda",
        description: "Abrir agenda de clases",
        url: "/dashboard/agenda",
        icons: [{ src: "/icons/padelcoach-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Alumnos",
        short_name: "Alumnos",
        description: "Abrir alumnos",
        url: "/dashboard/alumnos",
        icons: [{ src: "/icons/padelcoach-icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
