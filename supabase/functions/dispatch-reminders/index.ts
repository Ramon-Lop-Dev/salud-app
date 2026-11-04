// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const encoder = new TextEncoder();
function equalConstantTime(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) mismatch |= (a[index] || 0) ^ (b[index] || 0);
  return mismatch === 0;
}
function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}
function toLocalUtc(dateText: string, timeText: string, timeZone: string) {
  const [year, month, day] = dateText.split('-').map(Number);
  const [hour, minute] = timeText.slice(0, 5).split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(({ type, value }) => [type, value]));
    const displayed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    guess += desired - displayed;
  }
  return new Date(guess).toISOString();
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const expectedSecret = Deno.env.get('REMINDER_CRON_SECRET') || '';
  if (!expectedSecret || !equalConstantTime(request.headers.get('x-cron-secret') || '', expectedSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || '';
  if (![supabaseUrl, serviceRoleKey, vapidPublicKey, vapidPrivateKey, vapidSubject].every(Boolean)) {
    return new Response('Reminder service is not configured', { status: 503 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  const end = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const weekdayNumber: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const [scheduleResult, medicationResult, appointmentResult, profileResult] = await Promise.all([
    admin.from('medication_schedules').select('id,user_id,time_of_day,days_of_week,medication_id'),
    admin.from('medications').select('id,is_active').eq('is_active', true),
    admin.from('appointments').select('id,user_id,starts_at').eq('status', 'scheduled').gte('starts_at', now.toISOString()).lte('starts_at', end.toISOString()),
    admin.from('profiles').select('id,timezone'),
  ]);
  if (scheduleResult.error || medicationResult.error || appointmentResult.error || profileResult.error) {
    return new Response('Could not read reminder sources', { status: 500 });
  }
  const activeMedicationIds = new Set<string>((medicationResult.data || []).map((medication: { id: string }) => medication.id));
  const timezones = new Map<string, string>((profileResult.data || []).map((profile: { id: string; timezone?: string | null }) => [profile.id, profile.timezone || 'America/Managua']));
  const reminderRows: Array<{ user_id: string; type: 'medication' | 'appointment'; ref_id: string; remind_at: string; channel: 'push' }> = [];
  for (const schedule of scheduleResult.data || []) {
    if (!activeMedicationIds.has(schedule.medication_id)) continue;
    const timezone = timezones.get(schedule.user_id) || 'America/Managua';
    const localDates = Array.from({ length: 8 }, (_, offset) => {
      const local = localParts(new Date(now.getTime() + offset * 24 * 60 * 60 * 1000), timezone);
      return { date: `${local.year}-${local.month}-${local.day}`, weekday: local.weekday };
    });
    for (const { date, weekday } of localDates) {
      if (!(schedule.days_of_week || []).includes(weekdayNumber[weekday])) continue;
      const remindAt = toLocalUtc(date, schedule.time_of_day, timezone);
      reminderRows.push({ user_id: schedule.user_id, type: 'medication', ref_id: schedule.id, remind_at: remindAt, channel: 'push' });
    }
  }
  for (const appointment of appointmentResult.data || []) {
    const remindAt = new Date(new Date(appointment.starts_at).getTime() - 24 * 60 * 60 * 1000);
    if (remindAt.getTime() > now.getTime() - 60 * 60 * 1000) {
      reminderRows.push({ user_id: appointment.user_id, type: 'appointment', ref_id: appointment.id, remind_at: remindAt.toISOString(), channel: 'push' });
    }
  }
  if (reminderRows.length) {
    const { error } = await admin.from('reminders').upsert(reminderRows, {
      onConflict: 'user_id,type,ref_id,remind_at', ignoreDuplicates: true,
    });
    if (error) return new Response('Could not prepare reminders', { status: 500 });
  }

  const dueStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  // Expire old reminders outside the retry window so they do not accumulate forever.
  const { error: expiredError } = await admin.from('reminders').update({ sent_at: now.toISOString() })
    .eq('channel', 'push').is('sent_at', null).lt('remind_at', dueStart);
  if (expiredError) return new Response('Could not expire old reminders', { status: 500 });
  const { data: due, error: dueError } = await admin.from('reminders').select('id,user_id,type')
    .eq('channel', 'push').is('sent_at', null).gte('remind_at', dueStart).lte('remind_at', now.toISOString()).limit(250);
  if (dueError) return new Response('Could not load due reminders', { status: 500 });
  const medicationDue = (due || []).filter((reminder) => reminder.type === 'medication');
  const appointmentDue = (due || []).filter((reminder) => reminder.type === 'appointment');
  const scheduleIds = [...new Set(medicationDue.map((reminder) => reminder.ref_id))];
  const appointmentIds = [...new Set(appointmentDue.map((reminder) => reminder.ref_id))];
  const [intakesResult, appointmentsDueResult] = await Promise.all([
    scheduleIds.length
      ? admin.from('medication_intakes').select('schedule_id,scheduled_for,status').in('schedule_id', scheduleIds).in('status', ['taken', 'skipped']).gte('scheduled_for', dueStart).lte('scheduled_for', now.toISOString())
      : Promise.resolve({ data: [], error: null }),
    appointmentIds.length
      ? admin.from('appointments').select('id,status').in('id', appointmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (intakesResult.error || appointmentsDueResult.error) return new Response('Could not validate reminder state', { status: 500 });
  const completedIntakes = new Set((intakesResult.data || []).map((intake) => `${intake.schedule_id}|${new Date(intake.scheduled_for).getTime()}`));
  const appointmentStatuses = new Map((appointmentsDueResult.data || []).map((appointment) => [appointment.id, appointment.status]));
  const userIds = [...new Set<string>((due || []).map((reminder: { user_id: string }) => reminder.user_id))];
  const subscriptionMap = new Map<string, Array<{ id: string; endpoint: string; keys: { p256dh?: string; auth?: string } }>>();
  if (userIds.length) {
    const { data: subscriptions, error } = await admin.from('push_subscriptions').select('id,user_id,endpoint,keys').in('user_id', userIds);
    if (error) return new Response('Could not load subscriptions', { status: 500 });
    for (const subscription of subscriptions || []) {
      const items = subscriptionMap.get(subscription.user_id) || [];
      items.push(subscription);
      subscriptionMap.set(subscription.user_id, items);
    }
  }

  let delivered = 0;
  for (const reminder of due || []) {
    const shouldSkipMedication = reminder.type === 'medication'
      && completedIntakes.has(`${reminder.ref_id}|${new Date(reminder.remind_at).getTime()}`);
    const shouldSkipAppointment = reminder.type === 'appointment'
      && appointmentStatuses.get(reminder.ref_id) !== 'scheduled';
    if (shouldSkipMedication || shouldSkipAppointment) {
      await admin.from('reminders').update({ sent_at: new Date().toISOString() }).eq('id', reminder.id).is('sent_at', null);
      continue;
    }
    const payload = JSON.stringify({
      title: 'Recordatorio de Mi Salud',
      body: reminder.type === 'appointment' ? 'Tienes una cita próxima.' : 'Es la hora de revisar tu plan de medicinas.',
      url: reminder.type === 'appointment' ? '/#/appointments' : '/#/meds',
    });
    const subscriptions = subscriptionMap.get(reminder.user_id) || [];
    if (!subscriptions.length) continue;
    let sentAtLeastOnce = false;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, { TTL: 3600, urgency: 'normal' });
        delivered += 1;
        sentAtLeastOnce = true;
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number }).statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id);
        }
      }
    }
    // Keep retryable failures pending for the next cron run; the one-hour expiry above bounds retries.
    if (sentAtLeastOnce) {
      await admin.from('reminders').update({ sent_at: new Date().toISOString() }).eq('id', reminder.id).is('sent_at', null);
    }
  }

  return Response.json({ accepted: true, remindersProcessed: due?.length || 0, deliveries: delivered });
});
