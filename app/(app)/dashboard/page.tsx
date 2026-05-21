import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Users,
  WalletCards,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ClassRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string | null;
};

type StudentRow = {
  id: string;
  full_name: string;
  active: boolean | null;
  created_at: string | null;
};

type SubscriptionRow = {
  id: string;
  student_id: string;
  total_classes: number;
  used_classes: number | null;
  end_date: string;
  status: string | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string | null;
  status: string | null;
};

const quickActions = [
  { href: "/dashboard/agenda", label: "Abrir agenda", icon: CalendarDays },
  { href: "/dashboard/alumnos", label: "Gestionar alumnos", icon: Users },
  { href: "/dashboard/abonos", label: "Revisar abonos", icon: WalletCards },
  { href: "/dashboard/pagos", label: "Registrar pagos", icon: CreditCard },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const ranges = dashboardRanges();

  const [
    classesResult,
    studentsResult,
    subscriptionsResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, title, start_time, end_time, location, status")
      .eq("coach_id", user.id)
      .gte("start_time", ranges.lastWeekStartIso)
      .lte("start_time", ranges.nextWeekEndIso)
      .order("start_time", { ascending: true }),
    supabase
      .from("students")
      .select("id, full_name, active, created_at")
      .eq("coach_id", user.id)
      .order("full_name", { ascending: true }),
    fetchSubscriptions(supabase, user.id),
    supabase
      .from("payments")
      .select("id, amount, payment_date, status")
      .eq("coach_id", user.id)
      .gte("payment_date", ranges.lastMonthStartDate)
      .order("payment_date", { ascending: false }),
  ]);

  const error =
    classesResult.error ??
    studentsResult.error ??
    subscriptionsResult.error ??
    paymentsResult.error;

  const classes = ((classesResult.data ?? []) as ClassRow[]).filter(Boolean);
  const students = ((studentsResult.data ?? []) as StudentRow[]).filter(Boolean);
  const subscriptions = subscriptionsResult.data;
  const payments = ((paymentsResult.data ?? []) as PaymentRow[]).filter(Boolean);

  const activeStudents = students.filter((student) => student.active !== false);
  const weekClasses = classes.filter((classItem) =>
    isBetween(classItem.start_time, ranges.weekStart, ranges.weekEnd),
  );
  const lastWeekClasses = classes.filter((classItem) =>
    isBetween(classItem.start_time, ranges.lastWeekStart, ranges.lastWeekEnd),
  );
  const todayClasses = classes.filter((classItem) =>
    isSameDate(classItem.start_time, ranges.todayDate),
  );
  const upcomingClasses = classes
    .filter(
      (classItem) =>
        new Date(classItem.start_time) >= ranges.now &&
        normalizeClassStatus(classItem.status) !== "cancelled",
    )
    .slice(0, 5);
  const pendingCompletion = classes
    .filter((classItem) => {
      const status = normalizeClassStatus(classItem.status);
      return (
        new Date(classItem.end_time) < ranges.now &&
        status !== "completed" &&
        status !== "cancelled"
      );
    })
    .slice(0, 5);
  const activeSubscriptions = subscriptions.filter((subscription) =>
    isActiveSubscription(subscription, ranges.todayDate),
  );
  const expiringSubscriptions = subscriptions
    .filter((subscription) => {
      const status = normalizeSubscriptionStatus(subscription.status);
      const usedClasses = subscription.used_classes ?? 0;
      return (
        status === "active" &&
        subscription.end_date >= ranges.todayDate &&
        subscription.end_date <= ranges.nextSevenDaysDate &&
        usedClasses < subscription.total_classes
      );
    })
    .slice(0, 5);
  const pendingPayments = payments.filter(
    (payment) => normalizePaymentStatus(payment.status) !== "paid",
  );
  const monthIncome = sumPayments(
    payments.filter(
      (payment) =>
        normalizePaymentStatus(payment.status) === "paid" &&
        (payment.payment_date ?? "") >= ranges.monthStartDate,
    ),
  );
  const lastMonthIncome = sumPayments(
    payments.filter(
      (payment) =>
        normalizePaymentStatus(payment.status) === "paid" &&
        (payment.payment_date ?? "") >= ranges.lastMonthStartDate &&
        (payment.payment_date ?? "") < ranges.monthStartDate,
    ),
  );

  const stats = [
    {
      label: "Clases esta semana",
      value: String(weekClasses.length),
      detail: variationLabel(weekClasses.length, lastWeekClasses.length),
      badge: `${todayClasses.length} hoy`,
      icon: CalendarDays,
    },
    {
      label: "Alumnos activos",
      value: String(activeStudents.length),
      detail: `${countCreatedSince(students, ranges.monthStart)} nuevos este mes`,
      badge: "Activos",
      icon: Users,
    },
    {
      label: "Abonos activos",
      value: String(activeSubscriptions.length),
      detail: `${expiringSubscriptions.length} vencen pronto`,
      badge: "Vigentes",
      icon: WalletCards,
    },
    {
      label: "Pagos pendientes",
      value: currency(sumPayments(pendingPayments)),
      detail: `${pendingPayments.length} pagos abiertos`,
      badge: "Pendiente",
      icon: CreditCard,
    },
    {
      label: "Ingresos del mes",
      value: currency(monthIncome),
      detail: variationCurrencyLabel(monthIncome, lastMonthIncome),
      badge: "Pagado",
      icon: CheckCircle2,
    },
    {
      label: "Clases del dia",
      value: String(todayClasses.length),
      detail: nextTodayClassLabel(todayClasses),
      badge: ranges.todayLabel,
      icon: CalendarDays,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:py-10">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-accent-dark">Panel</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            Semana bajo control.
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
            Vista rapida con clases, alumnos, abonos, cobros e ingresos reales.
          </p>
        </div>
        <Link
          href="/dashboard/agenda"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background"
        >
          Abrir agenda
          <ArrowRight size={17} />
        </Link>
      </section>

      {error ? (
        <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          No pudimos cargar algunas metricas: {error.message}
        </div>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <DashboardPanel
          title="Proximas clases"
          emptyText="No hay clases proximas en agenda."
          items={upcomingClasses.map((classItem) => ({
            id: classItem.id,
            title: classItem.title,
            meta: `${formatDateTime(classItem.start_time)} · ${classItem.location || "Sin ubicacion"}`,
            badge: statusLabel(classItem.status),
            href: "/dashboard/agenda",
          }))}
        />
        <DashboardPanel
          title="Abonos por vencer"
          emptyText="No hay abonos por vencer en los proximos 7 dias."
          items={expiringSubscriptions.map((subscription) => ({
            id: subscription.id,
            title: studentName(subscription.student_id, students),
            meta: `${remainingClasses(subscription)} restantes · vence ${formatDate(subscription.end_date)}`,
            badge: "Vence pronto",
            href: "/dashboard/abonos",
          }))}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <DashboardPanel
          title="Pendientes de completar"
          emptyText="No hay clases atrasadas pendientes de completar."
          items={pendingCompletion.map((classItem) => ({
            id: classItem.id,
            title: classItem.title,
            meta: `${formatDateTime(classItem.start_time)} · ${statusLabel(classItem.status)}`,
            badge: "Revisar",
            href: "/dashboard/agenda",
          }))}
        />
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Acciones rapidas</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Atajos para operar desde cancha.
              </p>
            </div>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold">
              SaaS
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between rounded-2xl border border-line bg-background p-4 transition hover:border-foreground/20"
              >
                <span className="flex items-center gap-3 font-semibold">
                  <span className="grid size-10 place-items-center rounded-2xl bg-surface-muted">
                    <action.icon size={18} />
                  </span>
                  {action.label}
                </span>
                <ArrowRight size={17} className="text-ink-muted" />
              </Link>
            ))}
          </div>
        </section>
      </section>

      <section className="mt-5 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Actividad semanal</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Base lista para convertir en graficos.
            </p>
          </div>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold">
            {weekClasses.length} clases
          </span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {weeklyBuckets(weekClasses, ranges.weekStart).map((bucket) => (
            <div key={bucket.date} className="grid gap-2">
              <div className="flex h-28 items-end rounded-2xl bg-background p-2">
                <div
                  className="w-full rounded-xl bg-accent-dark"
                  style={{
                    height: `${Math.max(8, bucket.percent)}%`,
                  }}
                />
              </div>
              <p className="text-center text-xs font-semibold text-ink-muted">
                {bucket.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  badge,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  badge: string;
  icon: typeof CalendarDays;
}) {
  return (
    <article className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted">
          <Icon size={20} />
        </span>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-ink-muted">
          {badge}
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-ink-muted">{detail}</p>
    </article>
  );
}

function DashboardPanel({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{
    id: string;
    title: string;
    meta: string;
    badge: string;
    href: string;
  }>;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold">
          {items.length}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-2xl border border-line bg-background p-4 transition hover:border-foreground/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{item.meta}</p>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold">
                  {item.badge}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-2xl bg-background p-4 text-sm text-ink-muted">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

async function fetchSubscriptions(supabase: Awaited<ReturnType<typeof createClient>>, coachId: string) {
  const result = await supabase
    .from("student_subscriptions")
    .select("id, student_id, total_classes, used_classes, end_date, status")
    .eq("coach_id", coachId)
    .order("end_date", { ascending: true });

  if (!result.error) {
    return { data: (result.data ?? []) as SubscriptionRow[], error: null };
  }

  if (
    result.error.message.includes("status") &&
    result.error.message.includes("does not exist")
  ) {
    const fallback = await supabase
      .from("student_subscriptions")
      .select("id, student_id, total_classes, used_classes, end_date")
      .eq("coach_id", coachId)
      .order("end_date", { ascending: true });

    return {
      data: ((fallback.data ?? []) as Omit<SubscriptionRow, "status">[]).map(
        (subscription) => ({ ...subscription, status: "active" }),
      ),
      error: fallback.error,
    };
  }

  return { data: [] as SubscriptionRow[], error: result.error };
}

function dashboardRanges() {
  const now = new Date();
  const todayDate = dateInput(now);
  const weekStart = startOfWeek(now);
  const weekEnd = addDaysDate(weekStart, 7);
  const lastWeekStart = addDaysDate(weekStart, -7);
  const lastWeekEnd = weekStart;
  const nextWeekEnd = addDaysDate(weekEnd, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    now,
    todayDate,
    todayLabel: new Intl.DateTimeFormat("es-MX", { weekday: "short" }).format(now),
    weekStart,
    weekEnd,
    lastWeekStart,
    lastWeekEnd,
    lastWeekStartIso: lastWeekStart.toISOString(),
    nextWeekEndIso: nextWeekEnd.toISOString(),
    monthStart,
    monthStartDate: dateInput(monthStart),
    lastMonthStartDate: dateInput(lastMonthStart),
    nextSevenDaysDate: dateInput(addDaysDate(now, 7)),
  };
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function addDaysDate(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isBetween(value: string, start: Date, end: Date) {
  const date = new Date(value);
  return date >= start && date < end;
}

function isSameDate(value: string, dateValue: string) {
  return new Date(value).toISOString().slice(0, 10) === dateValue;
}

function normalizeClassStatus(status: string | null) {
  return status ?? "scheduled";
}

function normalizeSubscriptionStatus(status: string | null) {
  return status === "cancelled" ? "cancelled" : "active";
}

function normalizePaymentStatus(status: string | null) {
  return status ?? "pending";
}

function isActiveSubscription(subscription: SubscriptionRow, todayDate: string) {
  const usedClasses = subscription.used_classes ?? 0;
  return (
    normalizeSubscriptionStatus(subscription.status) === "active" &&
    subscription.end_date >= todayDate &&
    usedClasses < subscription.total_classes
  );
}

function sumPayments(payments: PaymentRow[]) {
  return payments.reduce((total, payment) => total + Number(payment.amount ?? 0), 0);
}

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function variationLabel(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) return "Sin cambio vs semana anterior";
  return `${delta > 0 ? "+" : ""}${delta} vs semana anterior`;
}

function variationCurrencyLabel(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) return "Sin cambio vs mes anterior";
  return `${delta > 0 ? "+" : ""}${currency(delta)} vs mes anterior`;
}

function countCreatedSince(students: StudentRow[], since: Date) {
  return students.filter(
    (student) => student.created_at && new Date(student.created_at) >= since,
  ).length;
}

function nextTodayClassLabel(classes: ClassRow[]) {
  if (classes.length === 0) return "Sin clases hoy";
  const upcoming = classes.find((classItem) => new Date(classItem.start_time) >= new Date());
  return upcoming ? `Proxima ${formatTime(upcoming.start_time)}` : "Dia completado";
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
  };
  return labels[status ?? "scheduled"] ?? "Programada";
}

function remainingClasses(subscription: SubscriptionRow) {
  return Math.max(subscription.total_classes - (subscription.used_classes ?? 0), 0);
}

function studentName(studentId: string, students: StudentRow[]) {
  return (
    students.find((student) => student.id === studentId)?.full_name ??
    "Alumno eliminado"
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function weeklyBuckets(classes: ClassRow[], weekStart: Date) {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const counts = labels.map((label, index) => {
    const start = addDaysDate(weekStart, index);
    const end = addDaysDate(start, 1);
    return {
      label,
      date: dateInput(start),
      count: classes.filter((classItem) =>
        isBetween(classItem.start_time, start, end),
      ).length,
    };
  });
  const max = Math.max(...counts.map((bucket) => bucket.count), 1);
  return counts.map((bucket) => ({
    ...bucket,
    percent: Math.round((bucket.count / max) * 100),
  }));
}
