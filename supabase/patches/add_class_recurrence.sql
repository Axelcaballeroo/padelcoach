-- PadelCoach patch: identifies classes created together by a weekly recurrence.
-- Paste this into Supabase SQL Editor if your existing classes table is missing the column.

alter table public.classes
add column if not exists recurrence_group_id uuid;

create index if not exists classes_recurrence_group_id_idx
on public.classes (recurrence_group_id);
