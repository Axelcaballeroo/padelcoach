"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  active: boolean | null;
};

type Subscription = {
  id: string;
  student_id: string;
  total_classes: number;
  used_classes: number | null;
  end_date: string;
  paid_status: string | null;
  status: string | null;
};

type Payment = {
  id: string;
  coach_id: string;
  student_id: string | null;
  subscription_id: string | null;
  amount: number;
  payment_date: string | null;
  method: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
};

type PaymentForm = {
  student_id: string;
  subscription_id: string;
  amount: string;
  payment_date: string;
  method: string;
  status: "paid" | "pending" | "cancelled";
  notes: string;
};

const emptyForm: PaymentForm = {
  student_id: "",
  subscription_id: "",
  amount: "",
  payment_date: todayDateInput(),
  method: "",
  status: "paid",
  notes: "",
};

export function PaymentsManager({ coachId }: { coachId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [students, setStudents] = useState<Student[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const [studentsResult, subscriptionsResult, paymentsResult] =
      await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, active")
          .eq("coach_id", coachId)
          .order("active", { ascending: false })
          .order("full_name", { ascending: true }),
        fetchSubscriptions(supabase, coachId),
        supabase
          .from("payments")
          .select(
            "id, coach_id, student_id, subscription_id, amount, payment_date, method, status, notes, created_at",
          )
          .eq("coach_id", coachId)
          .order("payment_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

    const firstError =
      studentsResult.error ?? subscriptionsResult.error ?? paymentsResult.error;

    if (firstError) {
      setError(firstError.message);
      setStudents([]);
      setSubscriptions([]);
      setPayments([]);
    } else {
      setStudents((studentsResult.data ?? []) as Student[]);
      setSubscriptions(subscriptionsResult.data);
      setPayments((paymentsResult.data ?? []) as Payment[]);
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

  const selectedStudentSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.student_id === form.student_id &&
      normalizeSubscriptionStatus(subscription.status) === "active" &&
      (subscription.used_classes ?? 0) < subscription.total_classes,
  );

  function openCreateModal() {
    const firstStudent = students.find((student) => student.active !== false);

    setEditingPayment(null);
    setForm({
      ...emptyForm,
      student_id: firstStudent?.id ?? "",
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(payment: Payment) {
    setEditingPayment(payment);
    setForm({
      student_id: payment.student_id ?? "",
      subscription_id: payment.subscription_id ?? "",
      amount: String(payment.amount ?? ""),
      payment_date: payment.payment_date ?? todayDateInput(),
      method: payment.method ?? "",
      status: normalizePaymentStatus(payment.status),
      notes: payment.notes ?? "",
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingPayment(null);
    setForm(emptyForm);
    setModalError(null);
  }

  function selectStudent(studentId: string) {
    setForm((current) => ({
      ...current,
      student_id: studentId,
      subscription_id:
        subscriptions.find(
          (subscription) =>
            subscription.student_id === studentId &&
            normalizeSubscriptionStatus(subscription.status) === "active" &&
            (subscription.used_classes ?? 0) < subscription.total_classes,
        )?.id ?? "",
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError(null);

    const amount = Number(form.amount);

    if (!form.student_id) {
      setModalError("Selecciona un alumno.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setModalError("El monto debe ser mayor a cero.");
      return;
    }

    if (!form.payment_date) {
      setModalError("Selecciona una fecha de pago.");
      return;
    }

    setIsSaving(true);

    const payload = {
      coach_id: coachId,
      student_id: form.student_id,
      subscription_id: form.subscription_id || null,
      amount,
      payment_date: form.payment_date,
      method: normalizeText(form.method),
      status: form.status,
      notes: normalizeText(form.notes),
    };

    const result = editingPayment
      ? await supabase
          .from("payments")
          .update(payload)
          .eq("id", editingPayment.id)
          .eq("coach_id", coachId)
      : await supabase.from("payments").insert(payload);

    if (result.error) {
      setModalError(result.error.message);
      setIsSaving(false);
      return;
    }

    if (form.subscription_id && form.status === "paid") {
      const { error: subscriptionError } = await supabase
        .from("student_subscriptions")
        .update({ paid_status: "paid" })
        .eq("id", form.subscription_id)
        .eq("coach_id", coachId);

      if (subscriptionError) {
        setModalError(subscriptionError.message);
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    closeModal();
    await loadData();
  }

  async function deletePayment(payment: Payment) {
    if (!window.confirm("Eliminar este pago? Esta accion no se puede deshacer.")) {
      return;
    }

    setError(null);

    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("id", payment.id)
      .eq("coach_id", coachId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
            <CreditCard size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-accent-dark">Pagos</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              Cobros y pendientes
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
              Registra pagos reales, vincula abonos y controla estados de cobro.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-accent-dark"
        >
          <Plus size={17} />
          Nuevo pago
        </button>
      </header>

      <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink-muted shadow-sm">
          {payments.length} pagos registrados
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
          title="No pudimos cargar los pagos"
          text={error}
          actionLabel="Reintentar"
          onAction={() => void loadData()}
        />
      ) : null}

      {!isLoading && !error && payments.length === 0 ? (
        <StateCard
          title="Todavia no hay pagos"
          text="Registra el primer pago para mantener tus cobros al dia."
          actionLabel="Registrar pago"
          onAction={openCreateModal}
        />
      ) : null}

      {!isLoading && !error && payments.length > 0 ? (
        <div className="mt-6 grid gap-3">
          {payments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              studentName={studentName(payment.student_id, students)}
              subscriptionLabel={subscriptionLabel(
                payment.subscription_id,
                subscriptions,
              )}
              onEdit={() => openEditModal(payment)}
              onDelete={() => void deletePayment(payment)}
            />
          ))}
        </div>
      ) : null}

      {isModalOpen ? (
        <PaymentModal
          form={form}
          setForm={setForm}
          students={students}
          subscriptions={selectedStudentSubscriptions}
          isSaving={isSaving}
          isEditing={Boolean(editingPayment)}
          error={modalError}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onSelectStudent={selectStudent}
        />
      ) : null}
    </div>
  );
}

function PaymentCard({
  payment,
  studentName,
  subscriptionLabel,
  onEdit,
  onDelete,
}: {
  payment: Payment;
  studentName: string;
  subscriptionLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = normalizePaymentStatus(payment.status);

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{currency(payment.amount)}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-2 font-medium">{studentName}</p>
          <p className="mt-1 text-sm text-ink-muted">{subscriptionLabel}</p>
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
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-ink-muted sm:grid-cols-3">
        <span>{formatDate(payment.payment_date)}</span>
        <span>{payment.method || "Sin metodo"}</span>
        <span>{payment.notes || "Sin notas"}</span>
      </div>
    </article>
  );
}

function PaymentModal({
  form,
  setForm,
  students,
  subscriptions,
  isSaving,
  isEditing,
  error,
  onClose,
  onSubmit,
  onSelectStudent,
}: {
  form: PaymentForm;
  setForm: React.Dispatch<React.SetStateAction<PaymentForm>>;
  students: Student[];
  subscriptions: Subscription[];
  isSaving: boolean;
  isEditing: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectStudent: (studentId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <div className="w-full max-w-xl rounded-t-[2rem] border border-line bg-background p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent-dark">
              {isEditing ? "Editar pago" : "Nuevo pago"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isEditing ? "Actualizar cobro" : "Registrar cobro"}
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
              onChange={(event) => onSelectStudent(event.target.value)}
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

          <Field label="Abono relacionado">
            <select
              value={form.subscription_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subscription_id: event.target.value,
                }))
              }
              disabled={isSaving}
              className="input-shell"
            >
              <option value="">Sin vincular</option>
              {subscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>
                  {subscriptionOptionLabel(subscription)}
                </option>
              ))}
            </select>
          </Field>

          {form.student_id && subscriptions.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
              Este alumno no tiene abonos activos disponibles.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monto">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                value={form.payment_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    payment_date: event.target.value,
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Metodo">
              <input
                value={form.method}
                onChange={(event) =>
                  setForm((current) => ({ ...current, method: event.target.value }))
                }
                placeholder="Transferencia, efectivo, tarjeta"
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
                    status: event.target.value as PaymentForm["status"],
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              >
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </Field>
          </div>

          <Field label="Notas">
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              disabled={isSaving}
              className="input-shell min-h-24 resize-none py-3"
            />
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
                "Guardar pago"
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

function StatusBadge({ status }: { status: PaymentForm["status"] }) {
  const className =
    status === "paid"
      ? "bg-accent/15 text-accent-dark"
      : status === "cancelled"
        ? "bg-surface-muted text-ink-muted"
        : "bg-red-50 text-red-700";
  const label =
    status === "paid"
      ? "Pagado"
      : status === "cancelled"
        ? "Cancelado"
        : "Pendiente";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
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
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-surface-muted" />
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

async function fetchSubscriptions(
  supabase: ReturnType<typeof createClient>,
  coachId: string,
) {
  const result = await supabase
    .from("student_subscriptions")
    .select("id, student_id, total_classes, used_classes, end_date, paid_status, status")
    .eq("coach_id", coachId)
    .order("end_date", { ascending: true });

  if (!result.error) {
    return { data: (result.data ?? []) as Subscription[], error: null };
  }

  if (
    result.error.message.includes("status") &&
    result.error.message.includes("does not exist")
  ) {
    const fallback = await supabase
      .from("student_subscriptions")
      .select("id, student_id, total_classes, used_classes, end_date, paid_status")
      .eq("coach_id", coachId)
      .order("end_date", { ascending: true });

    return {
      data: ((fallback.data ?? []) as Omit<Subscription, "status">[]).map(
        (subscription) => ({ ...subscription, status: "active" }),
      ),
      error: fallback.error,
    };
  }

  return { data: [] as Subscription[], error: result.error };
}

function normalizeText(value: string) {
  const cleanValue = value.trim();
  return cleanValue.length > 0 ? cleanValue : null;
}

function normalizePaymentStatus(status: string | null): PaymentForm["status"] {
  if (status === "paid" || status === "pending" || status === "cancelled") {
    return status;
  }

  return "pending";
}

function normalizeSubscriptionStatus(status: string | null) {
  return status === "cancelled" ? "cancelled" : "active";
}

function studentName(studentId: string | null, students: Student[]) {
  if (!studentId) {
    return "Sin alumno";
  }

  return (
    students.find((student) => student.id === studentId)?.full_name ??
    "Alumno eliminado"
  );
}

function subscriptionLabel(
  subscriptionId: string | null,
  subscriptions: Subscription[],
) {
  if (!subscriptionId) {
    return "Sin abono vinculado";
  }

  const subscription = subscriptions.find(
    (currentSubscription) => currentSubscription.id === subscriptionId,
  );

  return subscription ? subscriptionOptionLabel(subscription) : "Abono eliminado";
}

function subscriptionOptionLabel(subscription: Subscription) {
  const usedClasses = subscription.used_classes ?? 0;
  const remaining = Math.max(subscription.total_classes - usedClasses, 0);
  const paymentStatus =
    subscription.paid_status === "paid" ? "pagado" : "pendiente";

  return `${remaining}/${subscription.total_classes} restantes - vence ${formatDate(
    subscription.end_date,
  )} - ${paymentStatus}`;
}

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
