-- PadelCoach patch: allows cancelling subscriptions without deleting history.
-- Paste this into Supabase SQL Editor if student_subscriptions is missing status.

alter table public.student_subscriptions
add column if not exists status text default 'active';

create index if not exists student_subscriptions_status_idx
on public.student_subscriptions (status);
