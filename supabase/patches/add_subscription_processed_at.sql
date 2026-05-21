-- PadelCoach patch: prevents duplicate subscription discounts for completed classes.
-- Paste this into Supabase SQL Editor if your existing classes table is missing the column.

alter table public.classes
add column if not exists subscription_processed_at timestamptz;

create index if not exists classes_subscription_processed_at_idx
on public.classes (subscription_processed_at);
