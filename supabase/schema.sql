-- PadelCoach MVP database schema
-- Paste this file into the Supabase SQL Editor. Do not run automatically.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  level text,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  class_count integer not null,
  duration_days integer not null,
  price numeric default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  total_classes integer not null,
  used_classes integer default 0,
  start_date date not null,
  end_date date not null,
  paid_status text default 'pending',
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.student_subscriptions
add column if not exists status text default 'active';

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  class_type text,
  status text default 'scheduled',
  notes text,
  recurrence_group_id uuid,
  subscription_processed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.classes
add column if not exists subscription_processed_at timestamptz;

alter table public.classes
add column if not exists recurrence_group_id uuid;

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz default now(),
  unique (class_id, student_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  subscription_id uuid references public.student_subscriptions(id) on delete set null,
  amount numeric not null,
  payment_date date default current_date,
  method text,
  status text default 'paid',
  notes text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.plans enable row level security;
alter table public.student_subscriptions enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.payments enable row level security;

-- Profiles: each authenticated user owns exactly their own profile row.
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (id = auth.uid());

-- Coach-owned tables: users can only access rows where coach_id is their user id.
create policy "students_select_own"
on public.students
for select
to authenticated
using (coach_id = auth.uid());

create policy "students_insert_own"
on public.students
for insert
to authenticated
with check (coach_id = auth.uid());

create policy "students_update_own"
on public.students
for update
to authenticated
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

create policy "students_delete_own"
on public.students
for delete
to authenticated
using (coach_id = auth.uid());

create policy "plans_select_own"
on public.plans
for select
to authenticated
using (coach_id = auth.uid());

create policy "plans_insert_own"
on public.plans
for insert
to authenticated
with check (coach_id = auth.uid());

create policy "plans_update_own"
on public.plans
for update
to authenticated
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

create policy "plans_delete_own"
on public.plans
for delete
to authenticated
using (coach_id = auth.uid());

create policy "student_subscriptions_select_own"
on public.student_subscriptions
for select
to authenticated
using (coach_id = auth.uid());

create policy "student_subscriptions_insert_own"
on public.student_subscriptions
for insert
to authenticated
with check (
  coach_id = auth.uid()
  and exists (
    select 1
    from public.students
    where students.id = student_subscriptions.student_id
      and students.coach_id = auth.uid()
  )
  and (
    plan_id is null
    or exists (
      select 1
      from public.plans
      where plans.id = student_subscriptions.plan_id
        and plans.coach_id = auth.uid()
    )
  )
);

create policy "student_subscriptions_update_own"
on public.student_subscriptions
for update
to authenticated
using (coach_id = auth.uid())
with check (
  coach_id = auth.uid()
  and exists (
    select 1
    from public.students
    where students.id = student_subscriptions.student_id
      and students.coach_id = auth.uid()
  )
  and (
    plan_id is null
    or exists (
      select 1
      from public.plans
      where plans.id = student_subscriptions.plan_id
        and plans.coach_id = auth.uid()
    )
  )
);

create policy "student_subscriptions_delete_own"
on public.student_subscriptions
for delete
to authenticated
using (coach_id = auth.uid());

create policy "classes_select_own"
on public.classes
for select
to authenticated
using (coach_id = auth.uid());

create policy "classes_insert_own"
on public.classes
for insert
to authenticated
with check (coach_id = auth.uid());

create policy "classes_update_own"
on public.classes
for update
to authenticated
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

create policy "classes_delete_own"
on public.classes
for delete
to authenticated
using (coach_id = auth.uid());

-- Join table ownership is inferred from both the class and the student.
create policy "class_students_select_own"
on public.class_students
for select
to authenticated
using (
  exists (
    select 1
    from public.classes
    where classes.id = class_students.class_id
      and classes.coach_id = auth.uid()
  )
  and exists (
    select 1
    from public.students
    where students.id = class_students.student_id
      and students.coach_id = auth.uid()
  )
);

create policy "class_students_insert_own"
on public.class_students
for insert
to authenticated
with check (
  exists (
    select 1
    from public.classes
    where classes.id = class_students.class_id
      and classes.coach_id = auth.uid()
  )
  and exists (
    select 1
    from public.students
    where students.id = class_students.student_id
      and students.coach_id = auth.uid()
  )
);

create policy "class_students_update_own"
on public.class_students
for update
to authenticated
using (
  exists (
    select 1
    from public.classes
    where classes.id = class_students.class_id
      and classes.coach_id = auth.uid()
  )
  and exists (
    select 1
    from public.students
    where students.id = class_students.student_id
      and students.coach_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.classes
    where classes.id = class_students.class_id
      and classes.coach_id = auth.uid()
  )
  and exists (
    select 1
    from public.students
    where students.id = class_students.student_id
      and students.coach_id = auth.uid()
  )
);

create policy "class_students_delete_own"
on public.class_students
for delete
to authenticated
using (
  exists (
    select 1
    from public.classes
    where classes.id = class_students.class_id
      and classes.coach_id = auth.uid()
  )
);

create policy "payments_select_own"
on public.payments
for select
to authenticated
using (coach_id = auth.uid());

create policy "payments_insert_own"
on public.payments
for insert
to authenticated
with check (
  coach_id = auth.uid()
  and (
    student_id is null
    or exists (
      select 1
      from public.students
      where students.id = payments.student_id
        and students.coach_id = auth.uid()
    )
  )
  and (
    subscription_id is null
    or exists (
      select 1
      from public.student_subscriptions
      where student_subscriptions.id = payments.subscription_id
        and student_subscriptions.coach_id = auth.uid()
    )
  )
);

create policy "payments_update_own"
on public.payments
for update
to authenticated
using (coach_id = auth.uid())
with check (
  coach_id = auth.uid()
  and (
    student_id is null
    or exists (
      select 1
      from public.students
      where students.id = payments.student_id
        and students.coach_id = auth.uid()
    )
  )
  and (
    subscription_id is null
    or exists (
      select 1
      from public.student_subscriptions
      where student_subscriptions.id = payments.subscription_id
        and student_subscriptions.coach_id = auth.uid()
    )
  )
);

create policy "payments_delete_own"
on public.payments
for delete
to authenticated
using (coach_id = auth.uid());

create index if not exists profiles_created_at_idx
on public.profiles (created_at);

create index if not exists students_coach_id_idx
on public.students (coach_id);

create index if not exists students_coach_id_active_idx
on public.students (coach_id, active);

create index if not exists plans_coach_id_idx
on public.plans (coach_id);

create index if not exists plans_coach_id_active_idx
on public.plans (coach_id, active);

create index if not exists student_subscriptions_coach_id_idx
on public.student_subscriptions (coach_id);

create index if not exists student_subscriptions_student_id_idx
on public.student_subscriptions (student_id);

create index if not exists student_subscriptions_plan_id_idx
on public.student_subscriptions (plan_id);

create index if not exists student_subscriptions_status_idx
on public.student_subscriptions (status);

create index if not exists classes_coach_id_idx
on public.classes (coach_id);

create index if not exists classes_start_time_idx
on public.classes (start_time);

create index if not exists classes_coach_id_start_time_idx
on public.classes (coach_id, start_time);

create index if not exists classes_subscription_processed_at_idx
on public.classes (subscription_processed_at);

create index if not exists classes_recurrence_group_id_idx
on public.classes (recurrence_group_id);

create index if not exists class_students_class_id_idx
on public.class_students (class_id);

create index if not exists class_students_student_id_idx
on public.class_students (student_id);

create index if not exists payments_coach_id_idx
on public.payments (coach_id);

create index if not exists payments_student_id_idx
on public.payments (student_id);

create index if not exists payments_subscription_id_idx
on public.payments (subscription_id);

create index if not exists payments_coach_id_payment_date_idx
on public.payments (coach_id, payment_date);
