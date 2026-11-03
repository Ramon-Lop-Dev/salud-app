-- =====================================================================
-- 001_init.sql  |  App de seguimiento de salud (un solo usuario)
-- Ejecutar en Supabase: SQL Editor -> New query -> pegar -> Run
-- (o guardar como supabase/migrations/001_init.sql si usas la CLI)
-- =====================================================================

-- ---------- Tipos ----------
create type public.intake_status as enum ('pending', 'taken', 'skipped');
create type public.appointment_status as enum ('scheduled', 'done', 'cancelled');
create type public.reminder_type as enum ('medication', 'appointment');
create type public.reminder_channel as enum ('push', 'email');

-- ---------- Utilidad: updated_at automatico ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  birth_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  must_change_password boolean not null default true,
  timezone text not null default 'America/Managua',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crea el perfil automaticamente cuando el admin crea el usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Catalogo de sintomas (lectura para todos los autenticados) ----------
create table public.symptom_types (
  id smallint generated always as identity primary key,
  name text not null unique,
  icon text,
  sort_order smallint not null default 0,
  is_active boolean not null default true
);

-- Catalogo inicial. IMPORTANTE: validarlo con el medico de la persona.
insert into public.symptom_types (name, icon, sort_order) values
  ('Mareo', 'dizzy', 1),
  ('Desmayo o casi desmayo', 'faint', 2),
  ('Palpitaciones', 'heart-pulse', 3),
  ('Falta de aire', 'wind', 4),
  ('Dolor de pecho', 'heart-crack', 5),
  ('Cansancio', 'battery-low', 6),
  ('Hinchazon de pies', 'foot', 7);

-- ---------- Registro diario ----------
create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  entry_date date not null,
  overall_feeling smallint not null check (overall_feeling between 1 and 5),
  heart_rate smallint check (heart_rate between 20 and 250),
  bp_systolic smallint check (bp_systolic between 50 and 300),
  bp_diastolic smallint check (bp_diastolic between 30 and 200),
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 24),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.entry_symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  entry_id uuid not null references public.daily_entries (id) on delete cascade,
  symptom_type_id smallint not null references public.symptom_types (id),
  severity smallint not null check (severity between 1 and 3), -- 1 leve, 2 media, 3 fuerte
  occurred_at time,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Medicamentos ----------
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  dose text,
  instructions text,
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  time_of_day time not null,
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}', -- 1 = lunes ... 7 = domingo
  created_at timestamptz not null default now()
);

create table public.medication_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  schedule_id uuid not null references public.medication_schedules (id) on delete cascade,
  scheduled_for timestamptz not null,
  status public.intake_status not null default 'pending',
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  unique (schedule_id, scheduled_for)
);

-- ---------- Citas ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  doctor_name text,
  specialty text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  status public.appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctor_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  question text not null,
  appointment_id uuid references public.appointments (id) on delete set null,
  is_answered boolean not null default false,
  answer_notes text,
  created_at timestamptz not null default now()
);

-- ---------- Recordatorios y notificaciones ----------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.reminder_type not null,
  ref_id uuid not null,
  remind_at timestamptz not null,
  channel public.reminder_channel not null default 'push',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------- Dispositivo (para cuando ya tenga el marcapasos) ----------
create table public.device_info (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  implant_date date,
  model text,
  manufacturer text,
  serial text,
  next_check_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Indices ----------
create index daily_entries_user_date_idx on public.daily_entries (user_id, entry_date desc);
create index entry_symptoms_entry_idx on public.entry_symptoms (entry_id);
create index appointments_user_starts_idx on public.appointments (user_id, starts_at);
create index intakes_user_scheduled_idx on public.medication_intakes (user_id, scheduled_for);
create index reminders_due_idx on public.reminders (remind_at) where sent_at is null;

-- ---------- Triggers updated_at ----------
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.daily_entries
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.medications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- =====================================================================
-- SEGURIDAD: Row Level Security (cada usuario solo ve sus filas)
-- =====================================================================

-- profiles: solo lee y actualiza su propia fila (no insert/delete desde el cliente)
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- symptom_types: solo lectura
alter table public.symptom_types enable row level security;
create policy "symptom_types read" on public.symptom_types
  for select to authenticated using (true);

-- reminders: el usuario solo los lee; los crea y marca el servidor (secret key)
alter table public.reminders enable row level security;
create policy "reminders select own" on public.reminders
  for select to authenticated using (user_id = (select auth.uid()));

-- Tablas con user_id: acceso total solo a sus propias filas
do $$
declare
  t text;
begin
  foreach t in array array[
    'daily_entries', 'entry_symptoms', 'medications', 'medication_schedules',
    'medication_intakes', 'appointments', 'doctor_questions',
    'push_subscriptions', 'device_info'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Verificacion rapida (debe devolver 0 filas: ninguna tabla sin RLS)
-- select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
