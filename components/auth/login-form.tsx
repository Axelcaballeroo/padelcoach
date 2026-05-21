"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Escribe tu email y contrasena para continuar.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message || "No pudimos iniciar sesion.");
      setIsLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="coach@tuclub.com"
          disabled={isLoading}
          className="h-12 rounded-2xl border border-line bg-surface px-4 outline-none transition placeholder:text-ink-muted/60 focus:border-accent-dark focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Contrasena
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={isLoading}
          className="h-12 rounded-2xl border border-line bg-surface px-4 outline-none transition focus:border-accent-dark focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-75"
      >
        {isLoading ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            Entrar al dashboard
            <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  );
}
