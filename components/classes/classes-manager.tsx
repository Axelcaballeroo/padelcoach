"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Repeat2,
  X,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ClassStatus = "scheduled" | "confirmed" | "cancelled" | "completed";

type ClassRow = {
  id: string;
  coach_id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  class_type: string | null;
  status: string | null;
  notes: string | null;
  recurrence_group_id: string | null;
  created_at: string | null;
};

type Student = {
  id: string;
  full_name: string;
  phone: string | null;
  level: string | null;
  active: boolean | null;
};

type ClassStudentRow = {
  class_id: string;
  student_id: string;
};

type Subscription = {
  id: string;
  student_id: string;
  total_classes: number;
  used_classes: number | null;
  end_date: string;
  status: string | null;
};

type ClassForm = {
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  class_type: string;
  status: ClassStatus;
  notes: string;
  student_ids: string[];
  repeat_weekly: boolean;
  repeat_mode: "weeks" | "until";
  repeat_weeks: string;
  repeat_until: string;
  repeat_weekdays: number[];
};

const emptyForm: ClassForm = {
  title: "",
  start_time: "",
  end_time: "",
  location: "",
  class_type: "",
  status: "scheduled",
  notes: "",
  student_ids: [],
  repeat_weekly: false,
  repeat_mode: "weeks",
  repeat_weeks: "4",
  repeat_until: "",
  repeat_weekdays: [],
};

const classSelect =
  "id, coach_id, title, start_time, end_time, location, class_type, status, notes, recurrence_group_id, created_at";

const fallbackClassSelect =
  "id, coach_id, title, start_time, end_time, location, class_type, status, notes, created_at";

const statusConfig: Record<
  ClassStatus,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  scheduled: {
    label: "Programada",
    className: "bg-surface-muted text-foreground",
    icon: Clock3,
  },
  confirmed: {
    label: "Confirmada",
    className: "bg-accent/15 text-accent-dark",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-50 text-red-700",
    icon: XCircle,
  },
  completed: {
    label: "Completada",
    className: "bg-[#e9edf7] text-[#334155]",
    icon: CheckCircle2,
  },
};

type ClassesManagerProps = {
  coachId: string;
};

export function ClassesManager({ coachId }: ClassesManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classStudents, setClassStudents] = useState<Record<string, string[]>>(
    {},
  );
  const [classWarnings, setClassWarnings] = useState<Record<string, string[]>>(
    {},
  );
  const [processingClassId, setProcessingClassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const [selectedDate, setSelectedDate] = useState(todayDateInput());

  async function loadClasses() {
    setIsLoading(true);
    setError(null);

    const classQuery = await supabase
      .from("classes")
      .select(classSelect)
      .eq("coach_id", coachId)
      .order("start_time", { ascending: true });

    const classesResult = isMissingRecurrenceColumnError(classQuery.error?.message)
      ? await supabase
          .from("classes")
          .select(fallbackClassSelect)
          .eq("coach_id", coachId)
          .order("start_time", { ascending: true })
      : classQuery;

    const { data: classesData, error: classesError } = classesResult;
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, full_name, phone, level, active")
      .eq("coach_id", coachId)
      .eq("active", true)
      .order("active", { ascending: false })
      .order("full_name", { ascending: true });

    if (classesError || studentsError) {
      setError(
        classesError?.message ??
          studentsError?.message ??
          null,
      );
      setClasses([]);
      setStudents([]);
      setClassStudents({});
    } else {
      const loadedClasses = ((classesData ?? []) as Partial<ClassRow>[]).map(
        (classItem) => ({
          ...classItem,
          recurrence_group_id: classItem.recurrence_group_id ?? null,
        }),
      ) as ClassRow[];
      setClasses(loadedClasses);
      setStudents((studentsData ?? []) as Student[]);

      if (loadedClasses.length > 0) {
        const { data: relationsData, error: relationsError } = await supabase
          .from("class_students")
          .select("class_id, student_id")
          .in(
            "class_id",
            loadedClasses.map((classItem) => classItem.id),
          );

        if (relationsError) {
          setError(relationsError.message);
          setClassStudents({});
        } else {
          setClassStudents(groupClassStudents(relationsData ?? []));
        }
      } else {
        setClassStudents({});
      }
    }

    setIsLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClasses();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  function openCreateModal() {
    setEditingClass(null);
    setForm(createDefaultForm());
    setModalError(null);
    setNotice(null);
    setIsModalOpen(true);
  }

  function openCreateAtSlot(hour: number) {
    const startTime = localDateTimeValue(selectedDate, hour);
    const endTime = localDateTimeValue(selectedDate, hour + 1);

    setEditingClass(null);
    setForm({
      ...emptyForm,
      start_time: startTime,
      end_time: endTime,
      repeat_weekdays: [weekdayFromDateTimeLocal(startTime)],
    });
    setModalError(null);
    setNotice(null);
    setIsModalOpen(true);
  }

  function openEditModal(classItem: ClassRow) {
    setEditingClass(classItem);
    setForm({
      title: classItem.title,
      start_time: toDateTimeLocalValue(classItem.start_time),
      end_time: toDateTimeLocalValue(classItem.end_time),
      location: classItem.location ?? "",
      class_type: classItem.class_type ?? "",
      status: normalizeStatus(classItem.status),
      notes: classItem.notes ?? "",
      student_ids: classStudents[classItem.id] ?? [],
      repeat_weekly: false,
      repeat_mode: "weeks",
      repeat_weeks: "4",
      repeat_until: "",
      repeat_weekdays: [weekdayFromDateTimeLocal(classItem.start_time)],
    });
    setModalError(null);
    setNotice(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingClass(null);
    setForm(emptyForm);
    setModalError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError(null);

    const title = form.title.trim();

    if (!title) {
      setModalError("El titulo de la clase es obligatorio.");
      return;
    }

    if (!form.start_time || !form.end_time) {
      setModalError("Define fecha y hora de inicio y fin.");
      return;
    }

    const startTime = new Date(form.start_time);
    const endTime = new Date(form.end_time);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setModalError("Las fechas no son validas.");
      return;
    }

    if (endTime <= startTime) {
      setModalError("La hora de fin debe ser posterior al inicio.");
      return;
    }

    if (!editingClass && form.repeat_weekly && form.status === "completed") {
      setModalError(
        "Crea las clases recurrentes como programadas o confirmadas. Cada clase se completa despues de dictarla para descontar abonos una sola vez.",
      );
      return;
    }

    setIsSaving(true);

    const payload = {
      coach_id: coachId,
      title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location: normalizeText(form.location),
      class_type: normalizeText(form.class_type),
      status: form.status,
      notes: normalizeText(form.notes),
    };

    if (!editingClass && form.repeat_weekly) {
      const recurringResult = await createRecurringClasses(
        payload,
        startTime,
        endTime,
        form,
      );

      if (recurringResult.error) {
        setModalError(recurringResult.error);
        setIsSaving(false);
        return;
      }

      setIsSaving(false);
      closeModal();
      setNotice(
        recurringResult.skipped > 0
          ? `Se crearon ${recurringResult.created} clases recurrentes y se omitieron ${recurringResult.skipped} por duplicado o conflicto de horario.`
          : `Se crearon ${recurringResult.created} clases recurrentes.`,
      );
      await loadClasses();
      return;
    }

    const result = editingClass
      ? await supabase
          .from("classes")
          .update(payload)
          .eq("id", editingClass.id)
          .eq("coach_id", coachId)
          .select("id")
          .single()
      : await supabase.from("classes").insert(payload).select("id").single();

    if (result.error || !result.data) {
      setModalError(result.error?.message ?? "No pudimos guardar la clase.");
      setIsSaving(false);
      return;
    }

    const relationError = await syncClassStudents(result.data.id, form.student_ids);

    if (relationError) {
      setModalError(relationError);
      setIsSaving(false);
      return;
    }

    if (form.status === "completed") {
      const warnings = await processCompletedClass(result.data.id);

      if (warnings.length > 0) {
        setClassWarnings((currentWarnings) => ({
          ...currentWarnings,
          [result.data.id]: warnings,
        }));
      }
    }

    setIsSaving(false);
    closeModal();
    await loadClasses();
  }

  async function createRecurringClasses(
    payload: {
      coach_id: string;
      title: string;
      start_time: string;
      end_time: string;
      location: string | null;
      class_type: string | null;
      status: ClassStatus;
      notes: string | null;
    },
    startTime: Date,
    endTime: Date,
    currentForm: ClassForm,
  ) {
    const occurrences = buildWeeklyOccurrences(startTime, endTime, currentForm);

    if (typeof occurrences === "string") {
      return { created: 0, skipped: 0, error: occurrences };
    }

    if (occurrences.length === 0) {
      return {
        created: 0,
        skipped: 0,
        error: "No hay fechas validas para crear con esa recurrencia.",
      };
    }

    const firstStart = occurrences[0].start.toISOString();
    const lastEnd = occurrences[occurrences.length - 1].end.toISOString();
    const { data: existingRows, error: existingError } = await supabase
      .from("classes")
      .select("id, title, start_time, end_time, status")
      .eq("coach_id", coachId)
      .lt("start_time", lastEnd)
      .gt("end_time", firstStart);

    if (existingError) {
      return {
        created: 0,
        skipped: 0,
        error: existingError.message,
      };
    }

    const existingClasses = (existingRows ?? []) as Pick<
      ClassRow,
      "id" | "title" | "start_time" | "end_time" | "status"
    >[];
    const creatableOccurrences = occurrences.filter(
      (occurrence) =>
        !existingClasses.some((classItem) =>
          isDuplicateOrConflict(
            occurrence,
            classItem,
            payload.title,
          ),
        ),
    );

    if (creatableOccurrences.length === 0) {
      return {
        created: 0,
        skipped: occurrences.length,
        error:
          "Todas las clases recurrentes coinciden con clases existentes o tienen conflicto de horario.",
      };
    }

    const recurrenceGroupId = crypto.randomUUID();
    const rowsWithRecurrence = creatableOccurrences.map((occurrence) => ({
      ...payload,
      start_time: occurrence.start.toISOString(),
      end_time: occurrence.end.toISOString(),
      recurrence_group_id: recurrenceGroupId,
    }));

    let insertResult = await supabase
      .from("classes")
      .insert(rowsWithRecurrence)
      .select("id");

    if (isMissingRecurrenceColumnError(insertResult.error?.message)) {
      insertResult = await supabase
        .from("classes")
        .insert(
          creatableOccurrences.map((occurrence) => ({
            ...payload,
            start_time: occurrence.start.toISOString(),
            end_time: occurrence.end.toISOString(),
          })),
        )
        .select("id");
    }

    if (insertResult.error || !insertResult.data) {
      return {
        created: 0,
        skipped: occurrences.length - creatableOccurrences.length,
        error: insertResult.error?.message ?? "No pudimos crear las clases.",
      };
    }

    for (const createdClass of insertResult.data) {
      const relationError = await syncClassStudents(
        createdClass.id,
        currentForm.student_ids,
      );

      if (relationError) {
        return {
          created: insertResult.data.length,
          skipped: occurrences.length - creatableOccurrences.length,
          error: relationError,
        };
      }
    }

    return {
      created: insertResult.data.length,
      skipped: occurrences.length - creatableOccurrences.length,
      error: null,
    };
  }

  async function syncClassStudents(classId: string, studentIds: string[]) {
    const uniqueStudentIds = Array.from(new Set(studentIds));

    const { error: deleteError } = await supabase
      .from("class_students")
      .delete()
      .eq("class_id", classId);

    if (deleteError) {
      return deleteError.message;
    }

    if (uniqueStudentIds.length === 0) {
      return null;
    }

    const { error: insertError } = await supabase.from("class_students").insert(
      uniqueStudentIds.map((studentId) => ({
        class_id: classId,
        student_id: studentId,
      })),
    );

    return insertError?.message ?? null;
  }

  async function processCompletedClass(classId: string) {
    setProcessingClassId(classId);
    setError(null);

    const warnings: string[] = [];
    const today = todayDateInput();

    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, coach_id, status, subscription_processed_at")
      .eq("id", classId)
      .eq("coach_id", coachId)
      .single();

    if (classError || !classData) {
      setError(
        isMissingProcessedColumnError(classError?.message)
          ? "Falta aplicar el patch supabase/patches/add_subscription_processed_at.sql antes de descontar abonos."
          : classError?.message ?? "No pudimos completar la clase.",
      );
      setProcessingClassId(null);
      return warnings;
    }

    if (classData.subscription_processed_at) {
      const { error: statusError } = await supabase
        .from("classes")
        .update({ status: "completed" })
        .eq("id", classId)
        .eq("coach_id", coachId);

      if (statusError) {
        setError(statusError.message);
      }

      setProcessingClassId(null);
      return ["Esta clase ya habia descontado abonos anteriormente."];
    }

    const { data: relationRows, error: relationError } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", classId);

    if (relationError) {
      setError(relationError.message);
      setProcessingClassId(null);
      return warnings;
    }

    for (const relation of relationRows ?? []) {
      const student = students.find(
        (currentStudent) => currentStudent.id === relation.student_id,
      );
      const { data: subscriptionRows, error: subscriptionError } = await supabase
        .from("student_subscriptions")
        .select("id, student_id, total_classes, used_classes, end_date, status")
        .eq("coach_id", coachId)
        .eq("student_id", relation.student_id)
        .eq("status", "active")
        .gte("end_date", today)
        .order("end_date", { ascending: true });

      if (subscriptionError) {
        warnings.push(
          isMissingSubscriptionStatusColumnError(subscriptionError.message)
            ? `${student?.full_name ?? "Alumno"}: falta aplicar el patch de status en abonos.`
            : `${student?.full_name ?? "Alumno"}: no pudimos revisar su abono.`,
        );
        continue;
      }

      const activeSubscription = ((subscriptionRows ?? []) as Subscription[]).find(
        (subscription) =>
          (subscription.used_classes ?? 0) < subscription.total_classes,
      );

      if (!activeSubscription) {
        warnings.push(
          `${student?.full_name ?? "Alumno"} no tiene abono activo disponible.`,
        );
        continue;
      }

      const currentUsedClasses = activeSubscription.used_classes ?? 0;
      const { error: updateError } = await supabase
        .from("student_subscriptions")
        .update({ used_classes: currentUsedClasses + 1 })
        .eq("id", activeSubscription.id)
        .eq("coach_id", coachId)
        .eq("used_classes", currentUsedClasses);

      if (updateError) {
        warnings.push(
          `${student?.full_name ?? "Alumno"}: no pudimos descontar su clase.`,
        );
      }
    }

    const { error: completeError } = await supabase
      .from("classes")
      .update({
        status: "completed",
        subscription_processed_at: new Date().toISOString(),
      })
      .eq("id", classId)
      .eq("coach_id", coachId)
      .is("subscription_processed_at", null);

    if (completeError) {
      setError(
        isMissingProcessedColumnError(completeError.message)
          ? "Falta aplicar el patch supabase/patches/add_subscription_processed_at.sql antes de descontar abonos."
          : completeError.message,
      );
    }

    setProcessingClassId(null);
    return warnings;
  }

  const visibleClasses = classes.filter((classItem) =>
    isSameLocalDate(classItem.start_time, selectedDate),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 lg:py-8">
      <header className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
            <CalendarDays size={22} />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Agenda</h1>
            <p className="mt-2 max-w-2xl leading-7 text-ink-muted">
              Calendario de clases
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] xl:flex xl:items-center">
          <div className="inline-grid grid-cols-3 rounded-2xl border border-line bg-surface p-1 shadow-sm">
            {["Dia", "Semana", "Mes"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`h-9 rounded-xl px-3 text-sm font-semibold ${
                  mode === "Dia"
                    ? "bg-foreground text-background"
                    : "text-ink-muted"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-accent-dark"
          >
            <Plus size={17} />
            Nueva clase
          </button>
        </div>
      </header>

      <section className="mt-6 grid gap-3 rounded-3xl border border-line bg-surface p-3 shadow-sm md:grid-cols-[auto_1fr_auto_auto] md:items-center">
        <div className="flex items-center justify-between gap-2 md:justify-start">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="grid size-11 place-items-center rounded-2xl border border-line bg-background"
            aria-label="Dia anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(todayDateInput())}
            className="h-11 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="grid size-11 place-items-center rounded-2xl border border-line bg-background"
            aria-label="Dia siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <label className="grid gap-1">
          <span className="px-1 text-xs font-semibold uppercase text-ink-muted">
            Dia
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="input-shell"
          />
        </label>
        <div className="rounded-2xl bg-background px-4 py-3 text-sm font-semibold text-ink-muted">
          {visibleClasses.length} clases este dia
        </div>
        <button
          type="button"
          onClick={() => void loadClasses()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold shadow-sm transition hover:border-foreground/20"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </section>

      {!isLoading && notice ? (
        <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm font-medium text-accent-dark">
          {notice}
        </div>
      ) : null}

      {isLoading ? <ClassesLoading /> : null}

      {!isLoading && error ? (
        <StateCard
          title="No pudimos cargar la agenda"
          text={error}
          actionLabel="Reintentar"
          onAction={() => void loadClasses()}
        />
      ) : null}

      {!isLoading && !error ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
          <DailyCalendar
            classes={visibleClasses}
            students={students}
            classStudents={classStudents}
            warnings={classWarnings}
            selectedDate={selectedDate}
            processingClassId={processingClassId}
            onSlotClick={openCreateAtSlot}
            onClassClick={openEditModal}
          />
          <AgendaSidePanel
            classes={visibleClasses}
            students={students}
            classStudents={classStudents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onClassClick={openEditModal}
          />
        </div>
      ) : null}

      {isModalOpen ? (
        <ClassModal
          form={form}
          setForm={setForm}
          isSaving={isSaving}
          error={modalError}
          isEditing={Boolean(editingClass)}
          students={students}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function DailyCalendar({
  classes,
  students,
  classStudents,
  warnings,
  selectedDate,
  processingClassId,
  onSlotClick,
  onClassClick,
}: {
  classes: ClassRow[];
  students: Student[];
  classStudents: Record<string, string[]>;
  warnings: Record<string, string[]>;
  selectedDate: string;
  processingClassId: string | null;
  onSlotClick: (hour: number) => void;
  onClassClick: (classItem: ClassRow) => void;
}) {
  const hours = Array.from({ length: 18 }, (_, index) => index + 6);
  const hourHeight = 86;
  const startHour = 6;
  const endHour = 23;
  const currentLineTop = currentTimeLineTop(selectedDate, startHour, hourHeight);

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="flex flex-col gap-2 border-b border-line bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent-dark">
            {formatLongDate(selectedDate)}
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {classes.length} clases programadas
          </h2>
        </div>
        <p className="text-sm text-ink-muted">06:00 - 23:00</p>
      </div>

      <div className="relative grid grid-cols-[4.25rem_1fr]">
        <div className="border-r border-line bg-background">
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex items-start justify-end px-3 pt-3 text-xs font-semibold text-ink-muted"
              style={{ height: hourHeight }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        <div className="relative" style={{ height: hours.length * hourHeight }}>
          {hours.map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => onSlotClick(hour)}
              className="absolute inset-x-0 border-b border-line/80 px-3 text-left transition hover:bg-accent/5"
              style={{
                top: (hour - startHour) * hourHeight,
                height: hourHeight,
              }}
              aria-label={`Crear clase a las ${hour}:00`}
            >
              <span className="mt-3 inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-muted opacity-0 transition hover:opacity-100">
                Nueva clase
              </span>
            </button>
          ))}

          {currentLineTop !== null ? (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
              style={{ top: currentLineTop }}
            >
              <span className="size-2 rounded-full bg-accent-dark" />
              <span className="h-px flex-1 bg-accent-dark" />
              <span className="ml-2 rounded-full bg-accent-dark px-2 py-0.5 text-[10px] font-bold text-white">
                ahora
              </span>
            </div>
          ) : null}

          {classes.map((classItem) => {
            const assignedStudents = getAssignedStudents(
              classStudents[classItem.id] ?? [],
              students,
            );
            const status = normalizeStatus(classItem.status);
            const config = statusConfig[status];
            const StatusIcon = config.icon;
            const top =
              (minutesFromDayStart(classItem.start_time) - startHour * 60) *
              (hourHeight / 60);
            const height = Math.max(
              56,
              classDurationMinutes(classItem.start_time, classItem.end_time) *
                (hourHeight / 60),
            );
            const calendarHeight = (endHour + 1 - startHour) * hourHeight;

            if (top >= calendarHeight || top + height <= 0) {
              return null;
            }

            const boundedTop = Math.max(0, top);
            const boundedHeight = Math.max(
              48,
              Math.min(height, calendarHeight - boundedTop),
            );
            const cardInset = 6;
            const innerHeight = Math.max(36, boundedHeight - cardInset * 2);
            const isCompact = innerHeight < 88;

            return (
              <div
                key={classItem.id}
                className="pointer-events-none absolute left-2 right-2 sm:left-4 sm:right-4"
                style={{
                  top: boundedTop,
                  height: boundedHeight,
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClassClick(classItem);
                  }}
                  className={`pointer-events-auto absolute inset-x-0 overflow-hidden rounded-xl border px-4 py-3 text-left shadow-[0_8px_22px_rgba(16,18,15,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,18,15,0.12)] ${statusBlockClass(status)}`}
                  style={{
                    top: cardInset,
                    bottom: cardInset,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold leading-5 text-foreground">
                        {classItem.title}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium leading-4 text-ink-muted">
                        {formatTime(classItem.start_time)} -{" "}
                        {formatTime(classItem.end_time)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-semibold leading-none ${config.className}`}
                    >
                      {processingClassId === classItem.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <StatusIcon size={12} />
                      )}
                      {config.label}
                    </span>
                  </div>

                  {!isCompact ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {assignedStudents.slice(0, 3).map((student) => (
                        <span
                          key={student.id}
                          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-2 text-[10px] font-semibold leading-none text-foreground shadow-sm"
                        >
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-[8px] font-bold text-background">
                            {initials(student.full_name)}
                          </span>
                          <span className="truncate">{student.full_name}</span>
                        </span>
                      ))}
                      {assignedStudents.length > 3 ? (
                        <span className="inline-flex h-7 items-center rounded-full bg-surface px-2 text-[10px] font-semibold leading-none text-foreground shadow-sm">
                          +{assignedStudents.length - 3}
                        </span>
                      ) : null}
                      {assignedStudents.length === 0 ? (
                        <span className="inline-flex h-7 items-center rounded-full bg-surface px-2 text-[10px] font-semibold leading-none text-ink-muted shadow-sm">
                          Sin alumnos
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 truncate text-[10px] font-medium leading-4 text-ink-muted">
                      {assignedStudents.length} alumnos
                      {classItem.location ? ` - ${classItem.location}` : ""}
                    </p>
                  )}

                  {!isCompact ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-medium leading-4 text-ink-muted">
                      {classItem.recurrence_group_id ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-accent-dark">
                          <Repeat2 size={11} />
                          Recurrente
                        </span>
                      ) : null}
                      <span>{classItem.location || "Sin ubicacion"}</span>
                      <span>
                        {durationLabel(classItem.start_time, classItem.end_time)}
                      </span>
                      <span>{assignedStudents.length} alumnos</span>
                    </div>
                  ) : null}

                  {warnings[classItem.id]?.length ? (
                    <p className="mt-1 truncate text-[10px] font-semibold leading-4 text-amber-700">
                      {warnings[classItem.id][0]}
                    </p>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="border-t border-line bg-background px-5 py-4 text-sm text-ink-muted">
          Toca cualquier horario libre para crear una clase en este dia.
        </div>
      ) : null}
    </section>
  );
}

function AgendaSidePanel({
  classes,
  students,
  classStudents,
  selectedDate,
  onSelectDate,
  onClassClick,
}: {
  classes: ClassRow[];
  students: Student[];
  classStudents: Record<string, string[]>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClassClick: (classItem: ClassRow) => void;
}) {
  return (
    <aside className="hidden space-y-5 xl:block">
      <MiniMonthCalendar selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <section className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Clases del dia</p>
            <p className="mt-1 text-xs text-ink-muted">
              {formatLongDate(selectedDate)}
            </p>
          </div>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold">
            {classes.length}
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {classes.length > 0 ? (
            classes.map((classItem) => {
              const assignedStudents = getAssignedStudents(
                classStudents[classItem.id] ?? [],
                students,
              );
              const status = normalizeStatus(classItem.status);

              return (
                <button
                  key={classItem.id}
                  type="button"
                  onClick={() => onClassClick(classItem)}
                  className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${statusBlockClass(status)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {classItem.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-ink-muted">
                        {formatTime(classItem.start_time)} -{" "}
                        {formatTime(classItem.end_time)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${statusConfig[status].className}`}
                    >
                      {statusConfig[status].label}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-xs text-ink-muted">
                    {assignedStudents.map((student) => student.full_name).join(", ") ||
                      "Sin alumnos"}
                  </p>
                  {classItem.recurrence_group_id ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-dark">
                      <Repeat2 size={13} />
                      Recurrente
                    </p>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="rounded-2xl bg-background p-4 text-sm text-ink-muted">
              No hay clases en este dia.
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}

function MiniMonthCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const days = monthGridDays(selectedDate);

  return (
    <section className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{formatMonthLabel(selectedDate)}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onSelectDate(addMonths(selectedDate, -1))}
            className="grid size-8 place-items-center rounded-xl border border-line bg-background"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(addMonths(selectedDate, 1))}
            className="grid size-8 place-items-center rounded-xl border border-line bg-background"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-muted">
        {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const isCurrentMonth = day.date.slice(0, 7) === selectedDate.slice(0, 7);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={`grid aspect-square place-items-center rounded-xl text-xs font-semibold transition ${
                isSelected
                  ? "bg-foreground text-background"
                  : isCurrentMonth
                    ? "text-foreground hover:bg-surface-muted"
                    : "text-ink-muted/45 hover:bg-surface-muted"
              }`}
            >
              {Number(day.date.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ClassModal({
  form,
  setForm,
  isSaving,
  error,
  isEditing,
  students,
  onClose,
  onSubmit,
}: {
  form: ClassForm;
  setForm: React.Dispatch<React.SetStateAction<ClassForm>>;
  isSaving: boolean;
  error: string | null;
  isEditing: boolean;
  students: Student[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-line bg-background p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent-dark">
              {isEditing ? "Editar clase" : "Nueva clase"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isEditing ? "Actualizar agenda" : "Crear bloque"}
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
          <Field label="Titulo">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
              disabled={isSaving}
              className="input-shell"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inicio">
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(event) => {
                  const nextStartTime = event.target.value;
                  setForm((current) => ({
                    ...current,
                    start_time: nextStartTime,
                    repeat_weekdays:
                      current.repeat_weekly && current.repeat_weekdays.length === 0
                        ? [weekdayFromDateTimeLocal(nextStartTime)]
                        : current.repeat_weekdays,
                  }));
                }}
                required
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
            <Field label="Fin">
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end_time: event.target.value,
                  }))
                }
                required
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ubicacion">
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
            <Field label="Tipo">
              <input
                value={form.class_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    class_type: event.target.value,
                  }))
                }
                placeholder="Privada, grupo, clinica"
                disabled={isSaving}
                className="input-shell"
              />
            </Field>
          </div>

          <Field label="Estado">
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as ClassStatus,
                }))
              }
              disabled={isSaving}
              className="input-shell"
            >
              <option value="scheduled">Programada</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
              <option value="completed">Completada</option>
            </select>
          </Field>

          {!isEditing ? (
            <section className="rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Repeticion</p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    Crea varias clases independientes con el mismo bloque.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      repeat_weekly: !current.repeat_weekly,
                      repeat_weekdays:
                        current.repeat_weekdays.length > 0
                          ? current.repeat_weekdays
                          : [weekdayFromDateTimeLocal(current.start_time)],
                    }))
                  }
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-70 ${
                    form.repeat_weekly
                      ? "bg-foreground text-background"
                      : "border border-line bg-background text-ink-muted"
                  }`}
                >
                  <Repeat2 size={16} />
                  Semanal
                </button>
              </div>

              {form.repeat_weekly ? (
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-ink-muted">
                      Dias
                    </p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {weekdays.map((weekday) => {
                        const isSelected = form.repeat_weekdays.includes(
                          weekday.value,
                        );

                        return (
                          <button
                            key={weekday.value}
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                repeat_weekdays: toggleNumber(
                                  current.repeat_weekdays,
                                  weekday.value,
                                ),
                              }))
                            }
                            className={`h-10 rounded-2xl text-xs font-bold transition disabled:opacity-70 ${
                              isSelected
                                ? "bg-foreground text-background"
                                : "border border-line bg-background text-ink-muted"
                            }`}
                          >
                            {weekday.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                    <select
                      value={form.repeat_mode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          repeat_mode: event.target.value as "weeks" | "until",
                        }))
                      }
                      disabled={isSaving}
                      className="input-shell"
                    >
                      <option value="weeks">Cantidad de semanas</option>
                      <option value="until">Fecha final</option>
                    </select>

                    {form.repeat_mode === "weeks" ? (
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={form.repeat_weeks}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            repeat_weeks: event.target.value,
                          }))
                        }
                        disabled={isSaving}
                        className="input-shell"
                      />
                    ) : (
                      <input
                        type="date"
                        value={form.repeat_until}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            repeat_until: event.target.value,
                          }))
                        }
                        disabled={isSaving}
                        className="input-shell"
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

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

          <StudentPicker
            students={students}
            selectedStudentIds={form.student_ids}
            disabled={isSaving}
            onToggle={(studentId) =>
              setForm((current) => ({
                ...current,
                student_ids: toggleStudentId(current.student_ids, studentId),
              }))
            }
          />

          {form.status === "completed" ? (
            <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-6 text-ink-muted">
              Preparado para la proxima fase: al completar una clase podremos
              descontar clases automaticamente de `student_subscriptions`.
            </div>
          ) : null}

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
                "Guardar clase"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentPicker({
  students,
  selectedStudentIds,
  disabled,
  onToggle,
}: {
  students: Student[];
  selectedStudentIds: string[];
  disabled: boolean;
  onToggle: (studentId: string) => void;
}) {
  const activeStudents = students.filter((student) => student.active !== false);
  const inactiveSelectedStudents = students.filter(
    (student) =>
      student.active === false && selectedStudentIds.includes(student.id),
  );
  const visibleStudents = [...activeStudents, ...inactiveSelectedStudents];

  return (
    <section className="rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Alumnos</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Selecciona uno o varios alumnos para esta clase.
          </p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold">
          {selectedStudentIds.length}
        </span>
      </div>

      {visibleStudents.length > 0 ? (
        <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1">
          {visibleStudents.map((student) => {
            const isSelected = selectedStudentIds.includes(student.id);

            return (
              <button
                key={student.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(student.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : "border-line bg-background hover:border-foreground/20"
                }`}
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    isSelected
                      ? "bg-background text-foreground"
                      : "bg-foreground text-background"
                  }`}
                >
                  {initials(student.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {student.full_name}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-xs ${
                      isSelected ? "text-background/70" : "text-ink-muted"
                    }`}
                  >
                    {[student.level, student.phone].filter(Boolean).join(" - ") ||
                      "Sin datos extra"}
                  </span>
                </span>
                <span
                  className={`grid size-6 place-items-center rounded-full border text-xs font-bold ${
                    isSelected
                      ? "border-background text-background"
                      : "border-line text-ink-muted"
                  }`}
                >
                  {isSelected ? "Si" : "+"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-background p-4 text-sm text-ink-muted">
          No hay alumnos activos para asignar. Crea alumnos en la seccion
          Alumnos y vuelve a la agenda.
        </div>
      )}
    </section>
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

function ClassesLoading() {
  return (
    <div className="mt-6 grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-3xl border border-line bg-surface p-5 shadow-sm"
        >
          <div className="h-5 w-44 animate-pulse rounded-full bg-surface-muted" />
          <div className="mt-4 h-4 w-72 max-w-full animate-pulse rounded-full bg-surface-muted" />
          <div className="mt-3 h-4 w-52 max-w-full animate-pulse rounded-full bg-surface-muted" />
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

const weekdays = [
  { label: "D", value: 0 },
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "M", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
];

function createDefaultForm(): ClassForm {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);

  const end = new Date(now);
  end.setHours(end.getHours() + 1);

  return {
    ...emptyForm,
    start_time: toDateTimeLocalValue(now.toISOString()),
    end_time: toDateTimeLocalValue(end.toISOString()),
    repeat_weekdays: [now.getDay()],
  };
}

function normalizeText(value: string) {
  const cleanValue = value.trim();
  return cleanValue.length > 0 ? cleanValue : null;
}

function isMissingProcessedColumnError(message?: string | null) {
  return Boolean(
    message?.includes("subscription_processed_at") &&
      message?.includes("does not exist"),
  );
}

function isMissingSubscriptionStatusColumnError(message?: string | null) {
  return Boolean(
    message?.includes("status") && message?.includes("does not exist"),
  );
}

function isMissingRecurrenceColumnError(message?: string | null) {
  return Boolean(
    message?.includes("recurrence_group_id") &&
      (message?.includes("does not exist") ||
        message?.includes("schema cache") ||
        message?.includes("Could not find")),
  );
}

function buildWeeklyOccurrences(
  startTime: Date,
  endTime: Date,
  form: ClassForm,
) {
  const selectedWeekdays = Array.from(new Set(form.repeat_weekdays)).sort(
    (firstDay, secondDay) => firstDay - secondDay,
  );

  if (selectedWeekdays.length === 0) {
    return "Elige al menos un dia para repetir la clase.";
  }

  const duration = endTime.getTime() - startTime.getTime();
  const startDate = new Date(startTime);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  if (form.repeat_mode === "weeks") {
    const weeks = Number(form.repeat_weeks);

    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
      return "La cantidad de semanas debe estar entre 1 y 52.";
    }

    endDate.setDate(startDate.getDate() + weeks * 7 - 1);
  } else {
    if (!form.repeat_until) {
      return "Define una fecha final para la repeticion.";
    }

    const untilDate = new Date(`${form.repeat_until}T00:00:00`);
    untilDate.setHours(23, 59, 59, 999);

    if (untilDate < startDate) {
      return "La fecha final debe ser posterior al inicio.";
    }

    endDate.setTime(untilDate.getTime());
  }

  const occurrences: { start: Date; end: Date }[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    if (selectedWeekdays.includes(cursor.getDay())) {
      const occurrenceStart = new Date(cursor);
      occurrenceStart.setHours(
        startTime.getHours(),
        startTime.getMinutes(),
        0,
        0,
      );

      if (occurrenceStart >= startTime) {
        occurrences.push({
          start: occurrenceStart,
          end: new Date(occurrenceStart.getTime() + duration),
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
}

function isDuplicateOrConflict(
  occurrence: { start: Date; end: Date },
  classItem: Pick<ClassRow, "title" | "start_time" | "end_time" | "status">,
  title: string,
) {
  if (normalizeStatus(classItem.status) === "cancelled") {
    return false;
  }

  const existingStart = new Date(classItem.start_time).getTime();
  const existingEnd = new Date(classItem.end_time).getTime();
  const occurrenceStart = occurrence.start.getTime();
  const occurrenceEnd = occurrence.end.getTime();
  const isExactDuplicate =
    classItem.title.trim().toLowerCase() === title.trim().toLowerCase() &&
    existingStart === occurrenceStart &&
    existingEnd === occurrenceEnd;
  const overlaps = occurrenceStart < existingEnd && occurrenceEnd > existingStart;

  return isExactDuplicate || overlaps;
}

function groupClassStudents(relations: ClassStudentRow[]) {
  return relations.reduce<Record<string, string[]>>((accumulator, relation) => {
    accumulator[relation.class_id] = [
      ...(accumulator[relation.class_id] ?? []),
      relation.student_id,
    ];

    return accumulator;
  }, {});
}

function getAssignedStudents(studentIds: string[], students: Student[]) {
  const studentById = new Map(
    students.map((student) => [student.id, student] as const),
  );

  return studentIds
    .map((studentId) => studentById.get(studentId))
    .filter((student): student is Student => Boolean(student));
}

function toggleStudentId(studentIds: string[], studentId: string) {
  return studentIds.includes(studentId)
    ? studentIds.filter((currentStudentId) => currentStudentId !== studentId)
    : [...studentIds, studentId];
}

function toggleNumber(values: number[], value: number) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value].sort((firstValue, secondValue) => firstValue - secondValue);
}

function weekdayFromDateTimeLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().getDay() : date.getDay();
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizeStatus(status: string | null): ClassStatus {
  if (
    status === "scheduled" ||
    status === "confirmed" ||
    status === "cancelled" ||
    status === "completed"
  ) {
    return status;
  }

  return "scheduled";
}

function statusBlockClass(status: ClassStatus) {
  const classes: Record<ClassStatus, string> = {
    scheduled: "border-l-4 border-l-ink-muted bg-[#f7f8f4]",
    confirmed: "border-l-4 border-l-accent-dark bg-[#eefaf3]",
    completed: "border-l-4 border-l-[#64748b] bg-[#f1f5f9]",
    cancelled: "border-l-4 border-l-red-500 bg-red-50",
  };

  return classes[status];
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(dateValue: string) {
  return dateValue === todayDateInput();
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateValue: string, months: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function localDateTimeValue(dateValue: string, hour: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setHours(hour, 0, 0, 0);
  return toDateTimeLocalValue(date.toISOString());
}

function isSameLocalDate(value: string, dateValue: string) {
  return toDateTimeLocalValue(value).slice(0, 10) === dateValue;
}

function minutesFromDayStart(value: string) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function currentTimeLineTop(
  selectedDate: string,
  startHour: number,
  hourHeight: number,
) {
  if (!isToday(selectedDate)) {
    return null;
  }

  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const visibleStart = startHour * 60;
  const visibleEnd = 24 * 60;

  if (minutes < visibleStart || minutes > visibleEnd) {
    return null;
  }

  return (minutes - visibleStart) * (hourHeight / 60);
}

function monthGridDays(selectedDate: string) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const firstOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const start = new Date(firstOfMonth);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  start.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date: date.toISOString().slice(0, 10),
    };
  });
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function durationLabel(startValue: string, endValue: string) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  const minutes = Math.max(0, Math.round((end - start) / 60000));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function classDurationMinutes(startValue: string, endValue: string) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  return Math.max(15, Math.round((end - start) / 60000));
}
