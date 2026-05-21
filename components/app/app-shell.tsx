"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  Home,
  LogOut,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";

import { logout } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/alumnos", label: "Alumnos", icon: Users },
  { href: "/dashboard/abonos", label: "Abonos", icon: WalletCards },
  { href: "/dashboard/pagos", label: "Pagos", icon: CreditCard },
  { href: "/dashboard/configuracion", label: "Ajustes", icon: Settings },
];

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
  };
};

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-surface px-5 py-5 lg:flex lg:flex-col">
        <Logo href="/dashboard" />
        <nav className="mt-9 grid gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-ink-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-line bg-background p-4">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-ink-muted">{user.email}</p>
          <form action={logout} className="mt-4">
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold transition hover:border-foreground/20"
            >
              <LogOut size={16} />
              Salir
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line bg-background/90 px-5 py-4 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Logo href="/dashboard" compact />
          <form action={logout}>
            <button
              type="submit"
              className="grid size-10 place-items-center rounded-full border border-line bg-surface"
              aria-label="Cerrar sesion"
              title="Cerrar sesion"
            >
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </header>

      <main className="lg:pl-72">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pb-2 pt-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(1).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`grid h-14 place-items-center rounded-2xl text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-ink-muted hover:bg-surface-muted"
                }`}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
