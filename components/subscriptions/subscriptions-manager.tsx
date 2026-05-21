"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  active: boolean | null;
};

type Plan = {
  id: string;
  name: string;
  class_count: number;
  duration_days: number;
  price: number | null;
  active: boolean | null;
};

type Subscription = {
  id: string;
  coach_id: string;
  student_id: string;
  plan_id: string | null;
  total_classes: number;
  used_classes: number | null;
  start_date: string;
  end_date: string;
  paid_status: string | null;
  status: string | null;
  created_at: string | null;
};

type SubscriptionForm = {
  student_id: string;
  plan_id: string;
  total_classes: string;
  used_classes: string;
  start_date: string;
  end_date: string;
  paid_status: string;
  status: string;
};

const emptyForm: SubscriptionForm = {
  student_id: "",
  plan_id: "",
  total_classes: "",
  used_classes: "0",
  start_date: todayDateInput(),
  end_date: "",
  paid_status: "pending",
  status: "active",
};

export function SubscriptionsManager({ coachId }: { coachId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [form, setForm] = useState<SubscriptionForm>(emptyForm);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const [studentsResult, plansResult, subscriptionsResult] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, active")
        .eq("coach_id", coachId)
        .order("full_name", { ascending: true }),
      supabase
        .from("plans")
        .select("id, name, class_count, duration_days, price, active")
        .eq("coach_id", coachId)
        .order("active", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("student_subscriptions")
        .select(
          "id, coach_id, student_id, plan_id, total_classes, used_classes, start_date, end_date, paid_status, status, created_at",
        )
        .eq("coach_id", coachId)
        .order("end_date", { ascending: true }),
    ]);

    const firstError =
      studentsResult.error ?? plansResult.error ?? subscriptionsResult.error;

    if (firstError) {
      setError(
        isMissingStatusColumnError(firstError.message)
          ? "Falta aplicar el patch supabase/patches/add_subscription_status.sql para gestionar estados de abonos."
          : firstError.message,
      );
      setStudents([]);
      setPlans([]);
      setSubscriptions([]);
    } else {
      setStudents((studentsResult.data ?? []) as Student[]);
      setPlans((plansResult.data ?? []) as Plan[]);
      setSubscriptions((subscriptionsResult.data ?? []) as Subscription[]);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  function openModal() {
    const firstPlan = plans.find((plan) => plan.active !== false);
    const nextForm = {
      ...emptyForm,
      student_id: students.find((student) => student.active !== false)?.id ?? "",
      plan_id: firstPlan?.id ?? "",
      total_classes: firstPlan ? String(firstPlan.class_count) : "",
      used_classes: "0",
      end_date: firstPlan
        ? addDays(todayDateInput(), firstPlan.duration_days)
        : "",
    };

    setEditingSubscription(null);
    setForm(nextForm);
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(subscription: Subscription) {
    setEditingSubscription(subscription);
    setForm({
      student_id: subscription.student_id,
      plan_id: subscription.plan_id ?? "",
      total_classes: String(subscription.total_classes),
      used_classes: String(subscription.used_classes ?? 0),
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      paid_status: subscription.paid_status ?? "pending",
      status: normalizeSubscriptionBaseStatus(subscription.status),
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setModalError(null);
    setEditingSubscription(null);
    setForm(emptyForm);
  }

  function selectPlan(planId: string) {
    const selectedPlan = plans.find((plan) => plan.id === planId);

    setForm((current) => ({
      ...current,
      plan_id: planId,
      total_classes: selectedPlan
        ? String(selectedPlan.class_count)
        : current.total_classes,
      end_date: selectedPlan
        ? addDays(current.start_date || todayDateInput(), selectedPlan.duration_days)
        : current.end_date,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError(null);

    const totalClasses = Number(form.total_classes);
    const usedClasses = Number(form.used_classes);

    if (!form.student_id) {
      setModalError("Selecciona un alumno.");
      return;
    }

    if (!Number.isInteger(totalClasses) || totalClasses <= 0) {
      setModalError("El total de clases debe ser un numero entero mayor a cero.");
      return;
    }

    if (
      !Number.isInteger(usedClasses) ||
      usedClasses < 0 ||
      usedClasses > totalClasses
    ) {
      setModalError("Las clases usadas deben estar entre 0 y el total.");
      return;
    }

    if (!form.start_date || !form.end_date) {
      setModalError("Define fecha de inicio y vencimiento.");
      return;
    }

    setIsSaving(true);

    const payload = {
      coach_id: coachId,
      student_id: form.student_id,
      plan_id: form.plan_id || null,
      total_classes: totalClasses,
      used_classes: usedClasses,
      start_date: form.start_date,
      end_date: form.end_date,
      paid_status: form.paid_status,
      status: form.status,
    };

    const result = editingSubscription
      ? await supabase
          .from("student_subscriptions")
          .update(payload)
          .eq("id", editingSubscription.id)
          .eq("coach_id", coachId)
      : await supabase.from("student_subscriptions").insert(payload);

    if (result.error) {
      setModalError(
        isMissingStatusColumnError(result.error.message)
          ? "Falta aplicar el patch supabase/patches/add_subscription_status.sql."
          : result.error.message,
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    closeModal();
    await loadData();
  }

  async function deleteOrCancelSubscription(subscription: Subscription) {
    const usedClasses = subscription.used_classes ?? 0;
    const shouldCancel = usedClasses > 0;
    const message = shouldCancel
      ? "Este abono ya tiene clases usadas. Se marcara como cancelado para conservar el historial. Continuar?"
      : "Eliminar este abono? Esta accion no se puede deshacer.";

    if (!window.confirm(message)) {
      return;
    }

    setError(null);

    const result = shouldCancel
      ? await supabase
          .from("student_subscriptions")
          .update({ status: "cancelled" })
          .eq("id", subscription.id)
          .eq("coach_id", coachId)
      : await supabase
          .from("student_subscriptions")
          .delete()
          .eq("id", subscription.id)
          .eq("coach_id", coachId);

    if (result.error) {
      setError(
        isMissingStatusColumnError(result.error.message)
          ? "Falta aplicar el patch supabase/patches/add_subscription_status.sql para cancelar abonos con historial."
          : result.error.message,
      );
      return;
    }

    await loadData();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
            <WalletCards size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-accent-dark">Abonos</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              Abonos activos
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
              Crea abonos por alumno, revisa vencimientos y controla el consumo
              de clases conectado a la agenda.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-accent-dark"
        >
          <Plus size={17} />
          Nuevo abono
        </button>
      </header>

      <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink-muted shadow-sm">
          {subscriptions.length} abonos registrados
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold shadow-sm transition hover:border-foreground/20"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </section>

      {isLoading ? <LoadingList /> : null}

      {!isLoading && error ? (
        <StateCard
          title="No pudimos cargar los abonos"
          text={error}
          actionLabel="Reintentar"
          onAction={() => void loadData()}
        />
      ) : null}

      {!isLoading && !error && subscriptions.length === 0 ? (
        <StateCard
          title="Todavia no hay abonos"
          text="Crea el primer abono para empezar a descontar clases completadas."
          actionLabel="Crear abono"
          onAction={openModal}
        />
      ) : null}

      {!isLoading && !error && subscriptions.length > 0 ? (
        <div className="mt-6 grid gap-3">
          {subscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              studentName={studentName(subscription.student_id, students)}
              planName={planName(subscription.plan_id, plans)}
              onEdit={() => openEditModal(subscription)}
              onDelete={() => void deleteOrCancelSubscription(subscription)}
            />
          ))}
        </div>
      ) : null}

      {isModalOpen ? (
        <SubscriptionModal
          form={form}
          setForm={setForm}
          students={students}
          plans={plans}
          isSaving={isSaving}
          error={modalError}
          isEditing={Boolean(editingSubscription)}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onSelectPlan={selectPlan}
        />
      ) : null}
    </div>
  );
}

function SubscriptionCard({
  subscription,
  studentName,
  planName,
  onEdit,
  onDelete,
}: {
  subscription: Subscription;
  studentName: string;
  planName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const usedClasses = subscription.used_classes ?? 0;
  const remainingClasses = Math.max(
    subscription.total_classes - usedClasses,
    0,
  );
  const progress =
    subscription.total_classes > 0
      ? Math.min(100, Math.round((usedClasses / subscription.total_classes) * 100))
      : 0;
  const status = subscriptionStatus(subscription);

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{studentName}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-2 text-sm text-ink-muted">{planName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold transition hover:border-foreground/20"
          >
            <Pencil size={15} />
            Editar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            <Trash2 size={15} />
            Eliminar
          </button>
          <div className="rounded-2xl bg-background px-4 py-3 text-sm font-semibold">
            {remainingClasses} restantes
          </div>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent-dark"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-ink-muted sm:grid-cols-3">
        <span>{usedClasses} usadas</span>
        <span>{subscription.total_classes} totales</span>
        <span>Vence {formatDate(subscription.end_date)}</span>
      </div>
    </article>
  );
}

function SubscriptionModal({
  form,
  setForm,
  students,
  plans,
  isSaving,
  error,
  isEditing,
  onClose,
  onSubmit,
  onSelectPlan,
}: {
  form: SubscriptionForm;
  setForm: React.Dispatch<React.SetStateAction<SubscriptionForm>>;
  students: Student[];
  plans: Plan[];
  isSaving: boolean;
  error: string | null;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectPlan: (planId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <div className="w-full max-w-xl rounded-t-[2rem] border border-line bg-background p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent-dark">
              {isEditing ? "Editar abono" : "Nuevo abono"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isEditing ? "Actualizar abono" : "Asignar a alumno"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full border border-line bg-surface"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <Field label="Alumno">
            <select
              value={form.student_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  student_id: event.target.value,
                }))
              }
              disabled={isSaving}
              className="input-shell"
            >
              <option value="">Seleccionar alumno</option>
              {students
                .filter((student) => student.active !== false)
                .map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Plan">
            <select
              value={form.plan_id}
              onChange={(event) => onSelectPlan(event.target.value)}
              disabled={isSaving}
              className="input-shell"
            >
              <option value="">Sin plan guardado</option>
              {plans
                .filter((plan) => plan.active !== false)
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.class_count} clases
                  </option>
                ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Clases">
              <input
                type="number"
                min="1"
                value={form.total_classes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    total_classes: event.target.value,
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
            <Field label="Usadas">
              <input
                type="number"
                min="0"
                value={form.used_classes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    used_classes: event.target.value,
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              >
                <option value="active">Activo</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inicio">
              <input
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start_date: event.target.value,
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
            <Field label="Vence">
              <input
                type="date"
                value={form.end_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end_date: event.target.value,
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
          </div>

          <Field label="Pago">
            <select
              value={form.paid_status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paid_status: event.target.value,
                }))
              }
              disabled={isSaving}
              className="input-shell"
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
            </select>
          </Field>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-12 rounded-full border border-line bg-surface px-5 text-sm font-semibold transition hover:border-foreground/20 disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-accent-dark disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar abono"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

type SubscriptionVisualStatus = "activo" | "cancelado" | "vencido" | "agotado";

function StatusBadge({ status }: { status: SubscriptionVisualStatus }) {
  const className =
    status === "activo"
      ? "bg-accent/15 text-accent-dark"
      : status === "agotado"
        ? "bg-[#e9edf7] text-[#334155]"
        : status === "cancelado"
          ? "bg-surface-muted text-ink-muted"
          : "bg-red-50 text-red-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

function LoadingList() {
  return (
    <div className="mt-6 grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-3xl border border-line bg-surface p-5 shadow-sm"
        >
          <div className="h-5 w-44 animate-pulse rounded-full bg-surface-muted" />
          <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

function StateCard({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
        {text}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function subscriptionStatus(subscription: Subscription) {
  const usedClasses = subscription.used_classes ?? 0;

  if (subscription.status === "cancelled") {
    return "cancelado";
  }

  if (usedClasses >= subscription.total_classes) {
    return "agotado";
  }

  if (subscription.end_date < todayDateInput()) {
    return "vencido";
  }

  return "activo";
}

function normalizeSubscriptionBaseStatus(status: string | null) {
  return status === "cancelled" ? "cancelled" : "active";
}

function isMissingStatusColumnError(message?: string | null) {
  return Boolean(
    message?.includes("status") && message?.includes("does not exist"),
  );
}

function studentName(studentId: string, students: Student[]) {
  return (
    students.find((student) => student.id === studentId)?.full_name ??
    "Alumno eliminado"
  );
}

function planName(planId: string | null, plans: Plan[]) {
  if (!planId) {
    return "Abono personalizado";
  }

  return plans.find((plan) => plan.id === planId)?.name ?? "Plan eliminado";
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
