import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.9fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <div className="mb-5 grid size-12 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
              <LockKeyhole size={21} />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">
              Entrar a PadelCoach
            </h1>
            <p className="mt-3 leading-7 text-ink-muted">
              Inicia sesion con tu cuenta de profesor. El acceso ya esta
              conectado con Supabase Auth.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 text-sm text-ink-muted">
            Volver a marketing{" "}
            <Link href="/" className="font-semibold text-foreground">
              Ir al inicio
            </Link>
          </p>
        </div>
      </section>

      <aside className="hidden border-l border-line bg-[#11140f] p-8 text-white lg:block">
        <div className="flex h-full flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <div>
            <p className="text-sm font-medium text-accent">Auth protegido</p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight">
              Todo lo operativo del profesor en una pantalla limpia.
            </h2>
          </div>
          <div className="grid gap-3">
            {["Agenda semanal", "Alumnos y abonos", "Pagos pendientes"].map(
              (item) => (
                <div key={item} className="rounded-2xl bg-white/[0.07] p-4">
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
