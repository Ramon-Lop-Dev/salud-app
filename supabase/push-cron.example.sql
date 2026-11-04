-- Run once from the Supabase SQL Editor after enabling pg_cron, pg_net, and Vault.
-- First store a randomly generated 32+ byte secret in Vault using the dashboard/secret manager.
-- Do not put that value in this file, in git, or in this chat.
-- Project ref from the successful deploy output. This is an identifier, not a secret.

select cron.schedule(
  'mi-salud-dispatch-reminders-every-5-minutes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://zqbwcsxhhbeyegbvqlrw.supabase.co/functions/v1/dispatch-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'mi_salud_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
