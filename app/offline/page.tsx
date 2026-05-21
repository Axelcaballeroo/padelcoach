import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-foreground text-lg font-black text-background">
          PC
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Estas sin conexion</h1>
        <p className="mt-3 leading-7 text-ink-muted">
          PadelCoach no pudo cargar datos nuevos. Revisa tu conexion y vuelve a
          intentar.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background"
        >
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
}
