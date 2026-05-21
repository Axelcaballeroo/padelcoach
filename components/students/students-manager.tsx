"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserMinus,
  Users,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  coach_id: string;
  full_name: string;
  phone: string | null;
  level: string | null;
  notes: string | null;
  active: boolean | null;
  created_at: string | null;
};

type StudentForm = {
  full_name: string;
  phone: string;
  level: string;
  notes: string;
  active: boolean;
};

const emptyForm: StudentForm = {
  full_name: "",
  phone: "",
  level: "",
  notes: "",
  active: true,
};

type StudentsManagerProps = {
  coachId: string;
};

export function StudentsManager({ coachId }: StudentsManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  async function loadStudents() {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("students")
      .select("id, coach_id, full_name, phone, level, notes, active, created_at")
      .eq("coach_id", coachId)
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setStudents([]);
    } else {
      setStudents((data ?? []) as Student[]);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStudents();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const filteredStudents = students.filter((student) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return [
      student.full_name,
      student.phone ?? "",
      student.level ?? "",
      student.notes ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  function openCreateModal() {
    setEditingStudent(null);
    setForm(emptyForm);
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setForm({
      full_name: student.full_name,
      phone: student.phone ?? "",
      level: student.level ?? "",
      notes: student.notes ?? "",
      active: student.active ?? true,
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingStudent(null);
    setForm(emptyForm);
    setModalError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError(null);

    const fullName = form.full_name.trim();

    if (!fullName) {
      setModalError("El nombre completo es obligatorio.");
      return;
    }

    setIsSaving(true);

    const payload = {
      coach_id: coachId,
      full_name: fullName,
      phone: normalizeText(form.phone),
      level: normalizeText(form.level),
      notes: normalizeText(form.notes),
      active: form.active,
    };

    const result = editingStudent
      ? await supabase
          .from("students")
          .update(payload)
          .eq("id", editingStudent.id)
          .eq("coach_id", coachId)
      : await supabase.from("students").insert(payload);

    if (result.error) {
      setModalError(result.error.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    closeModal();
    await loadStudents();
  }

  async function deactivateStudent(student: Student) {
    setError(null);

    const { error: updateError } = await supabase
      .from("students")
      .update({ active: false })
      .eq("id", student.id)
      .eq("coach_id", coachId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStudents((currentStudents) =>
      currentStudents.map((currentStudent) =>
        currentStudent.id === student.id
          ? { ...currentStudent, active: false }
          : currentStudent,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
            <Users size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-accent-dark">Alumnos</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              Base de alumnos
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
              Gestiona fichas reales, contacto, nivel, notas y estado activo de
              cada alumno.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-accent-dark"
        >
          <Plus size={17} />
          Nuevo alumno
        </button>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="flex h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-sm">
          <Search size={18} className="text-ink-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, telefono, nivel o notas"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted/70"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadStudents()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold shadow-sm transition hover:border-foreground/20"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </section>

      {isLoading ? <StudentsLoading /> : null}

      {!isLoading && error ? (
        <StateCard
          title="No pudimos cargar los alumnos"
          text={error}
          actionLabel="Reintentar"
          onAction={() => void loadStudents()}
        />
      ) : null}

      {!isLoading && !error && students.length === 0 ? (
        <StateCard
          title="Todavia no hay alumnos"
          text="Crea el primer alumno para empezar a organizar clases, abonos y pagos."
          actionLabel="Crear alumno"
          onAction={openCreateModal}
        />
      ) : null}

      {!isLoading && !error && students.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student, index) => (
              <article
                key={student.id}
                className={`grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{student.full_name}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        student.active
                          ? "bg-accent/15 text-accent-dark"
                          : "bg-surface-muted text-ink-muted"
                      }`}
                    >
                      {student.active ? "Activo" : "Inactivo"}
                    </span>
                    {student.level ? (
                      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
                        {student.level}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-ink-muted sm:flex-row sm:gap-4">
                    <span>{student.phone || "Sin telefono"}</span>
                    <span>{formatDate(student.created_at)}</span>
                  </div>
                  {student.notes ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-muted">
                      {student.notes}
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => openEditModal(student)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold transition hover:border-foreground/20"
                  >
                    <Pencil size={15} />
                    Editar
                  </button>
                  {student.active ? (
                    <button
                      type="button"
                      onClick={() => void deactivateStudent(student)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink-muted transition hover:border-foreground/20 hover:text-foreground"
                    >
                      <UserMinus size={15} />
                      Desactivar
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="font-semibold">Sin resultados</p>
              <p className="mt-2 text-sm text-ink-muted">
                Ajusta la busqueda para ver otros alumnos.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {isModalOpen ? (
        <StudentModal
          form={form}
          setForm={setForm}
          isSaving={isSaving}
          error={modalError}
          isEditing={Boolean(editingStudent)}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function StudentModal({
  form,
  setForm,
  isSaving,
  error,
  isEditing,
  onClose,
  onSubmit,
}: {
  form: StudentForm;
  setForm: React.Dispatch<React.SetStateAction<StudentForm>>;
  isSaving: boolean;
  error: string | null;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <div className="w-full max-w-xl rounded-t-[2rem] border border-line bg-background p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent-dark">
              {isEditing ? "Editar alumno" : "Nuevo alumno"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isEditing ? "Actualizar ficha" : "Crear ficha"}
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
          <Field label="Nombre completo">
            <input
              value={form.full_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  full_name: event.target.value,
                }))
              }
              required
              disabled={isSaving}
              className="input-shell"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefono">
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
            <Field label="Nivel">
              <input
                value={form.level}
                onChange={(event) =>
                  setForm((current) => ({ ...current, level: event.target.value }))
                }
                placeholder="Inicial, intermedio, avanzado"
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
          </div>

          <Field label="Notas">
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={4}
              disabled={isSaving}
              className="input-shell min-h-28 resize-none py-3"
            />
          </Field>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold">
            Alumno activo
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
              disabled={isSaving}
              className="size-5 accent-[var(--accent-dark)]"
            />
          </label>

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
                "Guardar alumno"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function StudentsLoading() {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className={`p-5 ${item > 0 ? "border-t border-line" : ""}`}
        >
          <div className="h-5 w-44 animate-pulse rounded-full bg-surface-muted" />
          <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded-full bg-surface-muted" />
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

function normalizeText(value: string) {
  const cleanValue = value.trim();
  return cleanValue.length > 0 ? cleanValue : null;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
