import { Settings } from "lucide-react";

import { SectionPage } from "@/components/app/section-page";

export default function ConfiguracionPage() {
  return (
    <SectionPage
      eyebrow="Configuración"
      title="Preferencias del coach"
      description="Base para horarios, canchas habituales, precios, moneda y datos de cuenta."
      icon={Settings}
      items={[
        { title: "Club principal", meta: "Padel Center · 4 canchas", status: "Demo" },
        { title: "Duración de clase", meta: "60 minutos por defecto", status: "Activo" },
        { title: "Supabase", meta: "Variables preparadas en .env.example", status: "Pendiente" },
      ]}
    />
  );
}
