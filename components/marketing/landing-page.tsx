import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda semanal",
    text: "Vista rápida por día, cancha, horario y estado de cada clase.",
  },
  {
    icon: Users,
    title: "Alumnos ordenados",
    text: "Historial, nivel, contacto y notas de progreso en un solo lugar.",
  },
  {
    icon: WalletCards,
    title: "Abonos claros",
    text: "Control de clases disponibles, vencimientos y renovaciones.",
  },
  {
    icon: CreditCard,
    title: "Pagos al día",
    text: "Registra cobros pendientes y confirmados sin hojas sueltas.",
  },
];

const weeklyClasses = [
  ["Lun", "07:00", "Grupo iniciación", "4 alumnos"],
  ["Mar", "18:30", "Clase privada", "Sofía R."],
  ["Jue", "20:00", "Americano técnico", "6 alumnos"],
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-muted sm:flex">
          <a href="#producto" className="hover:text-foreground">
            Producto
          </a>
          <a href="#flujo" className="hover:text-foreground">
            Flujo
          </a>
          <a href="#precio" className="hover:text-foreground">
            Precio
          </a>
        </nav>
        <Link
          href="/login"
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-foreground/20"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pb-24 lg:pt-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted shadow-sm">
            <Sparkles size={16} className="text-accent-dark" />
            Hecho para profesores de pádel independientes
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            PadelCoach
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink-muted sm:text-xl">
            Una cabina de control mobile-first para organizar clases, alumnos,
            abonos, pagos y agenda semanal desde la cancha, entre una clase y
            la siguiente.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-accent-dark"
            >
              Probar demo
              <ArrowRight size={17} />
            </Link>
            <a
              href="#producto"
              className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-surface px-6 text-sm font-semibold shadow-sm transition hover:border-foreground/20"
            >
              Ver estructura
            </a>
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-line bg-surface p-3 shadow-2xl shadow-foreground/10">
          <div className="rounded-[1.45rem] bg-[#11140f] p-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Hoy
                </p>
                <h2 className="mt-1 text-2xl font-semibold">Agenda activa</h2>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-[#06160c]">
                8 clases
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {weeklyClasses.map(([day, time, title, detail]) => (
                <div
                  key={`${day}-${time}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-accent">{day}</p>
                      <h3 className="mt-1 font-semibold">{title}</h3>
                    </div>
                    <p className="font-mono text-sm text-white/70">{time}</p>
                  </div>
                  <p className="mt-3 text-sm text-white/55">{detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {["$12.4k", "31", "6"].map((value, index) => (
                <div key={value} className="rounded-2xl bg-white/[0.07] p-3">
                  <p className="text-lg font-semibold">{value}</p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {["cobrado", "alumnos", "abonos"][index]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="producto" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl p-4">
              <feature.icon className="mb-5 text-accent-dark" size={24} />
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="flujo"
        className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1fr]"
      >
        <div>
          <p className="text-sm font-semibold text-accent-dark">Flujo diario</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            Diseñado para tomar decisiones rápidas.
          </h2>
        </div>
        <div className="grid gap-3">
          {[
            "Revisar la semana antes de llegar al club.",
            "Abrir ficha del alumno y ajustar notas de clase.",
            "Registrar pago o descontar una clase del abono.",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm"
            >
              <CheckCircle2 size={20} className="shrink-0 text-accent-dark" />
              <p className="font-medium">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        id="precio"
        className="mx-auto flex max-w-6xl flex-col gap-4 px-5 pb-10 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8"
      >
        <p>PadelCoach prepara la base para Supabase, sin backend real todavía.</p>
        <Link href="/login" className="font-semibold text-foreground">
          Abrir demo
        </Link>
      </footer>
    </main>
  );
}
