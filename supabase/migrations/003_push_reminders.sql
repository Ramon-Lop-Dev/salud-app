-- Push-reminder idempotency for the scheduled Edge Function.
-- Review for duplicate historical reminders before applying to a populated project.
create unique index if not exists reminders_delivery_key_idx
  on public.reminders (user_id, type, ref_id, remind_at);

drop trigger if exists set_updated_at on public.symptom_episodes;
create trigger set_updated_at before update on public.symptom_episodes
  for each row execute function public.set_updated_at();
