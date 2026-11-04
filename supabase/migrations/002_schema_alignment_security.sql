-- Align the checked-in base schema with the current Supabase schema supplied for Mi Salud.
-- Review and apply through Supabase CLI after backing up production data.

alter table public.profiles
  add column if not exists pacemaker_implanted boolean not null default false,
  add column if not exists pulse_low_threshold smallint not null default 50;

alter table public.profiles
  drop constraint if exists profiles_pulse_low_threshold_check;
alter table public.profiles
  add constraint profiles_pulse_low_threshold_check
  check (pulse_low_threshold between 30 and 70);

alter table public.daily_entries
  add column if not exists weight_kg numeric check (weight_kg between 20 and 300),
  add column if not exists daily_activity smallint check (daily_activity between 1 and 3);

alter table public.symptom_types
  add column if not exists category text not null default 'otros',
  add column if not exists helper_text text,
  add column if not exists doctor_alert_min_severity smallint check (doctor_alert_min_severity between 1 and 3),
  add column if not exists emergency_alert_min_severity smallint check (emergency_alert_min_severity between 1 and 3),
  add column if not exists applies_when text not null default 'always'
    check (applies_when in ('always', 'post_implant'));

alter table public.entry_symptoms
  add column if not exists custom_label text;
alter table public.entry_symptoms
  alter column symptom_type_id drop not null;

insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

create table if not exists public.symptom_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  episode_type text not null check (episode_type in ('desmayo','casi_desmayo','mareo_fuerte','palpitaciones','dolor_pecho','falta_aire','caida','otro')),
  severity smallint check (severity between 1 and 3),
  duration text check (duration in ('segundos','menos_1_min','1_a_5_min','mas_de_5_min','no_se')),
  position_before text check (position_before in ('de_pie_quieto','caminando','levantandome','sentado','acostado','esfuerzo','no_recuerdo')),
  triggers text[] not null default '{}',
  warning_signs text[] not null default '{}',
  after_effects text[] not null default '{}',
  injury boolean not null default false,
  injury_notes text,
  heart_rate smallint check (heart_rate between 20 and 250),
  bp_systolic smallint check (bp_systolic between 50 and 300),
  bp_diastolic smallint check (bp_diastolic between 30 and 200),
  witness_notes text,
  contacted_help text check (contacted_help in ('ninguno','familiar','medico','emergencias')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists symptom_episodes_user_occurred_idx
  on public.symptom_episodes(user_id, occurred_at desc);

alter table public.symptom_episodes enable row level security;
drop policy if exists "own rows" on public.symptom_episodes;
create policy "symptom episodes own rows" on public.symptom_episodes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.symptom_episodes to authenticated;

-- A child symptom must belong to the same user's daily entry; the generic own-row policy alone
-- would otherwise allow a user to reference another user's entry UUID.
drop policy if exists "own rows" on public.entry_symptoms;
create policy "entry symptoms own parent" on public.entry_symptoms
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.daily_entries e
      where e.id = entry_symptoms.entry_id and e.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.daily_entries e
      where e.id = entry_symptoms.entry_id and e.user_id = (select auth.uid())
    )
  );

-- Schedules and intakes are similarly bound to their own parent records.
drop policy if exists "own rows" on public.medication_schedules;
create policy "schedules own medication" on public.medication_schedules
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.medications m where m.id = medication_schedules.medication_id and m.user_id = (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.medications m where m.id = medication_schedules.medication_id and m.user_id = (select auth.uid()))
  );
drop policy if exists "own rows" on public.medication_intakes;
create policy "intakes own schedule" on public.medication_intakes
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.medication_schedules s where s.id = medication_intakes.schedule_id and s.user_id = (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.medication_schedules s where s.id = medication_intakes.schedule_id and s.user_id = (select auth.uid()))
  );

drop policy if exists "own rows" on public.doctor_questions;
create policy "questions own appointment" on public.doctor_questions
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and (appointment_id is null or exists (
      select 1 from public.appointments a where a.id = doctor_questions.appointment_id and a.user_id = (select auth.uid())
    ))
  )
  with check (
    user_id = (select auth.uid())
    and (appointment_id is null or exists (
      select 1 from public.appointments a where a.id = doctor_questions.appointment_id and a.user_id = (select auth.uid())
    ))
  );

-- Do not allow a browser session to modify authentication-controlled fields.
revoke all on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name, birth_date, emergency_contact_name, emergency_contact_phone,
  timezone, pacemaker_implanted, pulse_low_threshold
) on public.profiles to authenticated;

-- The account owner may clear the mandatory password-change flag only after Auth updated the password.
create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  update public.profiles
     set must_change_password = false, updated_at = now()
   where id = (select auth.uid());
end;
$$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

create or replace function public.save_daily_entry(
  p_entry_date date,
  p_overall_feeling smallint,
  p_heart_rate smallint default null,
  p_bp_systolic smallint default null,
  p_bp_diastolic smallint default null,
  p_sleep_hours numeric default null,
  p_weight_kg numeric default null,
  p_daily_activity smallint default null,
  p_notes text default null,
  p_symptoms jsonb default '[]'::jsonb,
  p_severity smallint default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_symptom jsonb;
  v_type_id smallint;
  v_label text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_overall_feeling not between 1 and 5 then raise exception 'Invalid overall feeling'; end if;
  if p_severity not between 1 and 3 then raise exception 'Invalid symptom severity'; end if;
  if jsonb_typeof(coalesce(p_symptoms, '[]'::jsonb)) <> 'array' then raise exception 'Symptoms must be an array'; end if;

  insert into public.daily_entries (
    user_id, entry_date, overall_feeling, heart_rate, bp_systolic, bp_diastolic,
    sleep_hours, weight_kg, daily_activity, notes
  ) values (
    v_user_id, p_entry_date, p_overall_feeling, p_heart_rate, p_bp_systolic, p_bp_diastolic,
    p_sleep_hours, p_weight_kg, p_daily_activity, left(p_notes, 4000)
  )
  on conflict (user_id, entry_date) do update set
    overall_feeling = excluded.overall_feeling,
    heart_rate = excluded.heart_rate,
    bp_systolic = excluded.bp_systolic,
    bp_diastolic = excluded.bp_diastolic,
    sleep_hours = excluded.sleep_hours,
    weight_kg = excluded.weight_kg,
    daily_activity = excluded.daily_activity,
    notes = excluded.notes,
    updated_at = now()
  returning id into v_entry_id;

  delete from public.entry_symptoms where user_id = v_user_id and entry_id = v_entry_id;
  for v_symptom in select value from jsonb_array_elements(coalesce(p_symptoms, '[]'::jsonb))
  loop
    v_type_id := nullif(v_symptom ->> 'symptom_type_id', '')::smallint;
    v_label := nullif(left(trim(coalesce(v_symptom ->> 'custom_label', '')), 120), '');
    if v_type_id is null and v_label is null then raise exception 'Invalid symptom'; end if;
    if v_type_id is not null and not exists (
      select 1 from public.symptom_types st where st.id = v_type_id and st.is_active
    ) then raise exception 'Invalid symptom type'; end if;
    insert into public.entry_symptoms (user_id, entry_id, symptom_type_id, custom_label, severity)
    values (v_user_id, v_entry_id, v_type_id, v_label, p_severity);
  end loop;
  return v_entry_id;
end;
$$;
revoke all on function public.save_daily_entry(date, smallint, smallint, smallint, smallint, numeric, numeric, smallint, text, jsonb, smallint) from public, anon;
grant execute on function public.save_daily_entry(date, smallint, smallint, smallint, smallint, numeric, numeric, smallint, text, jsonb, smallint) to authenticated;

-- Ensure new rows are subject to RLS even on projects with different default grants.
grant select, insert, update, delete on public.entry_symptoms, public.medication_schedules,
  public.medication_intakes, public.daily_entries, public.medications, public.appointments,
  public.doctor_questions, public.device_info, public.push_subscriptions to authenticated;
grant select on public.symptom_types, public.reminders to authenticated;

-- Required verification after applying: all app tables must have RLS enabled and no anonymous policies.
