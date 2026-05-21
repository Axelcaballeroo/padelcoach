import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PadelCoach",
    short_name: "PadelCoach",
    description:
      "Agenda, alumnos, abonos y pagos para profesores de padel.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen", "minimal-ui"],
    background_color: "#f7f8f4",
    theme_color: "#f7f8f4",
    orientation: "portrait",
    categories: ["productivity", "sports", "business"],
    icons: [
      {
        src: "/icons/padelcoach-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/padelcoach-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Agenda",
        short_name: "Agenda",
        description: "Abrir agenda de clases",
        url: "/dashboard/agenda",
        icons: [{ src: "/icons/padelcoach-icon.svg", sizes: "any" }],
      },
      {
        name: "Alumnos",
        short_name: "Alumnos",
        description: "Abrir alumnos",
        url: "/dashboard/alumnos",
        icons: [{ src: "/icons/padelcoach-icon.svg", sizes: "any" }],
      },
    ],
  };
}
