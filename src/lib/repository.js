import { supabase } from './supabase.js';

function ensure(result) {
  if (result.error) throw new Error(result.error.message || 'No se pudo completar la operación.');
  return result.data;
}
let profileTimezone = 'America/Managua';
export function setProfileTimezone(timezone) {
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); profileTimezone = timezone; }
  catch { profileTimezone = 'America/Managua'; }
}
function localDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: profileTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function nextLocalDateISO() {
  const date = new Date(`${localDateISO()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return localDateISO(date);
}
function toLocalTimestamp(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetUtc;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: profileTimezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(({ type, value }) => [type, value]));
    const displayedUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    guess += targetUtc - displayedUtc;
  }
  return new Date(guess).toISOString();
}
export function emptyState() {
  return {
    profile: { name: '', emergencyName: '', emergencyPhone: '', email: '', birthDate: '', timezone: 'America/Managua', mustChangePassword: false, pacemakerImplanted: false, pulseLowThreshold: 50 },
    medications: [], appointments: [], entries: [], incidents: [], questions: [], intakes: {}, symptomTypes: [], reminders: [], deviceInfo: null,
  };
}

export async function loadUserState(user) {
  const state = emptyState();
  const [profileRes, symptomsRes, entriesRes, medicationsRes, schedulesRes, appointmentsRes, questionsRes, episodesRes, remindersRes, devicesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('symptom_types').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('daily_entries').select('*').eq('user_id', user.id).order('entry_date', { ascending: false }).limit(90),
    supabase.from('medications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('medication_schedules').select('*').eq('user_id', user.id),
    supabase.from('appointments').select('*').eq('user_id', user.id).order('starts_at'),
    supabase.from('doctor_questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('symptom_episodes').select('*').eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(90),
    supabase.from('reminders').select('*').eq('user_id', user.id).order('remind_at').limit(100),
    supabase.from('device_info').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
  ]);
  const [profile, symptomTypes, entries, medications, schedules, appointments, questions, episodes, reminders, devices] = [profileRes, symptomsRes, entriesRes, medicationsRes, schedulesRes, appointmentsRes, questionsRes, episodesRes, remindersRes, devicesRes].map(ensure);
  setProfileTimezone(profile?.timezone || 'America/Managua');
  const entryIds = entries.map((entry) => entry.id);
  const scheduleIds = schedules.map((schedule) => schedule.id);
  const today = localDateISO();
  const tomorrow = nextLocalDateISO();
  const [entrySymptomsRes, todayIntakesRes] = await Promise.all([
    entryIds.length ? supabase.from('entry_symptoms').select('*').eq('user_id', user.id).in('entry_id', entryIds) : Promise.resolve({ data: [], error: null }),
    scheduleIds.length ? supabase.from('medication_intakes').select('*').eq('user_id', user.id).in('schedule_id', scheduleIds).gte('scheduled_for', toLocalTimestamp(today, '00:00')).lt('scheduled_for', toLocalTimestamp(tomorrow, '00:00')) : Promise.resolve({ data: [], error: null }),
  ]);
  const entrySymptoms = ensure(entrySymptomsRes);
  const todayIntakes = ensure(todayIntakesRes);
  state.symptomTypes = symptomTypes || [];
  state.profile = {
    ...state.profile,
    name: profile?.full_name || user.user_metadata?.full_name || '',
    emergencyName: profile?.emergency_contact_name || '', emergencyPhone: profile?.emergency_contact_phone || '',
    birthDate: profile?.birth_date || '', timezone: profile?.timezone || 'America/Managua',
    mustChangePassword: Boolean(profile?.must_change_password),
    pacemakerImplanted: Boolean(profile?.pacemaker_implanted), pulseLowThreshold: profile?.pulse_low_threshold ?? 50,
    email: user.email || '',
  };
  setProfileTimezone(state.profile.timezone);
  state.entries = (entries || []).map((entry) => {
    const matches = (entrySymptoms || []).filter((item) => item.entry_id === entry.id);
    return {
      id: entry.id, date: entry.entry_date, mood: entry.overall_feeling,
      symptoms: matches.map((item) => item.custom_label || symptomTypes.find((type) => type.id === item.symptom_type_id)?.name || 'Otro'),
      symptomRows: matches, pulse: entry.heart_rate ?? '', sleep: entry.sleep_hours ?? '', systolic: entry.bp_systolic ?? '', diastolic: entry.bp_diastolic ?? '',
      weight: entry.weight_kg ?? '', activity: entry.daily_activity ?? '', notes: entry.notes || '',
    };
  });
  state.medications = (medications || []).map((med) => ({
    id: med.id, name: med.name, dose: med.dose || '', instructions: med.instructions || '', start: med.start_date,
    active: med.is_active, schedules: (schedules || []).filter((schedule) => schedule.medication_id === med.id),
    times: (schedules || []).filter((schedule) => schedule.medication_id === med.id).map((schedule) => schedule.time_of_day.slice(0, 5)).sort(),
  }));
  state.appointments = (appointments || []).map((item) => ({ id: item.id, title: item.title, doctor: item.doctor_name || '', specialty: item.specialty || '', location: item.location || '', startsAt: item.starts_at, notes: item.notes || '', status: item.status }));
  state.questions = (questions || []).map((item) => ({ id: item.id, text: item.question, answered: item.is_answered, appointmentId: item.appointment_id, answerNotes: item.answer_notes || '' }));
  state.incidents = (episodes || []).map((item) => ({
    id: item.id, date: item.occurred_at.slice(0, 10), time: item.occurred_at.slice(11, 16), symptom: item.episode_type,
    severity: item.severity ?? 1, duration: item.duration, position: item.position_before, notes: item.description || '',
  }));
  state.intakes = Object.fromEntries((todayIntakes || []).map((item) => {
    const schedule = schedules.find((row) => row.id === item.schedule_id);
    return [`${item.schedule_id}|${localDateISO()}|${schedule?.time_of_day.slice(0, 5) || ''}`, item.status];
  }));
  state.reminders = reminders || [];
  state.deviceInfo = devices?.[0] || null;
  return state;
}

export async function saveDailyEntry(userId, values, symptoms) {
  const children = symptoms.map((symptom) => {
    const found = stateSymptomByName(symptom);
    return { symptom_type_id: found?.id ?? null, custom_label: found ? null : symptom };
  });
  return ensure(await supabase.rpc('save_daily_entry', {
    p_entry_date: localDateISO(), p_overall_feeling: Number(values.mood),
    p_heart_rate: values.pulse ? Number(values.pulse) : null,
    p_bp_systolic: values.systolic ? Number(values.systolic) : null,
    p_bp_diastolic: values.diastolic ? Number(values.diastolic) : null,
    p_sleep_hours: values.sleep ? Number(values.sleep) : null,
    p_weight_kg: values.weight ? Number(values.weight) : null,
    p_daily_activity: values.activity ? Number(values.activity) : null,
    p_notes: values.notes?.trim() || null, p_symptoms: children, p_severity: Number(values.severity || 1),
  }));
}
let symptomCatalog = [];
export function setSymptomCatalog(items) { symptomCatalog = items || []; }
function stateSymptomByName(name) { return symptomCatalog.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase()); }

export async function saveMedication(userId, values) {
  const med = ensure(await supabase.from('medications').insert({
    user_id: userId, name: values.name.trim(), dose: values.dose?.trim() || null,
    instructions: values.instructions?.trim() || null, start_date: values.start || localDateISO(),
  }).select('id').single());
  const times = [...new Set(String(values.times || '').split(/[;,\s]+/).map((value) => value.trim()).filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)))];
  if (times.length) {
    const { error } = await supabase.from('medication_schedules').insert(times.map((time) => ({ user_id: userId, medication_id: med.id, time_of_day: `${time}:00`, days_of_week: [1, 2, 3, 4, 5, 6, 7] })));
    if (error) {
      await supabase.from('medications').delete().eq('user_id', userId).eq('id', med.id);
      throw new Error(error.message);
    }
  }
  return med;
}
export async function deleteMedication(userId, medicationId) {
  ensure(await supabase.from('medications').delete().eq('user_id', userId).eq('id', medicationId));
}
export async function saveAppointment(userId, values) {
  return ensure(await supabase.from('appointments').insert({
    user_id: userId, title: values.title.trim(), doctor_name: values.doctor?.trim() || null,
    specialty: values.specialty?.trim() || null, location: values.location?.trim() || null,
    starts_at: toLocalTimestamp(values.date, values.time), notes: values.notes?.trim() || null,
  }).select('id').single());
}
export async function deleteAppointment(userId, appointmentId) {
  ensure(await supabase.from('appointments').update({ status: 'cancelled' }).eq('user_id', userId).eq('id', appointmentId));
}
export async function saveEpisode(userId, values) {
  const typeMap = {
    'Me desmayé': 'desmayo', 'Casi me desmayé': 'casi_desmayo', 'Mareo fuerte': 'mareo_fuerte', 'Caída': 'caida',
    Palpitaciones: 'palpitaciones', 'Dolor o presión en el pecho': 'dolor_pecho', 'Falta de aire': 'falta_aire', 'Otro síntoma': 'otro',
  };
  const now = new Date();
  const occurredAt = values.date ? toLocalTimestamp(values.date, values.time) : toLocalTimestamp(localDateISO(now), values.time);
  return ensure(await supabase.from('symptom_episodes').insert({
    user_id: userId, occurred_at: occurredAt, episode_type: typeMap[values.symptom] || 'otro',
    severity: values.severity === 'Leve' ? 1 : values.severity === 'Fuerte' ? 3 : 2,
    duration: values.duration || null, position_before: values.position || null,
    triggers: values.triggers || [], warning_signs: values.warningSigns || [], after_effects: values.afterEffects || [],
    injury: values.injury === 'on', injury_notes: values.injuryNotes?.trim() || null,
    heart_rate: values.pulse ? Number(values.pulse) : null, bp_systolic: values.systolic ? Number(values.systolic) : null,
    bp_diastolic: values.diastolic ? Number(values.diastolic) : null,
    witness_notes: values.witness?.trim() || null, contacted_help: values.contactedHelp || null,
    description: values.notes?.trim() || null,
  }).select('id').single());
}
export async function saveQuestion(userId, question) {
  return ensure(await supabase.from('doctor_questions').insert({ user_id: userId, question: question.trim() }).select('id').single());
}
export async function updateQuestion(userId, questionId, isAnswered) {
  ensure(await supabase.from('doctor_questions').update({ is_answered: isAnswered }).eq('user_id', userId).eq('id', questionId));
}
export async function deleteQuestion(userId, questionId) {
  ensure(await supabase.from('doctor_questions').delete().eq('user_id', userId).eq('id', questionId));
}
export async function saveProfile(userId, values) {
  setProfileTimezone(values.timezone || 'America/Managua');
  ensure(await supabase.from('profiles').update({
    full_name: values.name?.trim() || '', birth_date: values.birthDate || null,
    emergency_contact_name: values.emergencyName?.trim() || null, emergency_contact_phone: values.emergencyPhone?.trim() || null,
    timezone: values.timezone || 'America/Managua', pacemaker_implanted: values.pacemaker === 'on',
    pulse_low_threshold: Number(values.pulseLowThreshold || 50),
  }).eq('id', userId));
  const device = {
    user_id: userId, implant_date: values.implantDate || null, model: values.deviceModel?.trim() || null,
    manufacturer: values.manufacturer?.trim() || null, serial: values.serial?.trim() || null,
    next_check_date: values.nextCheckDate || null, notes: values.deviceNotes?.trim() || null,
  };
  if (Object.values(device).some((value) => value && value !== userId)) {
    const result = await supabase.from('device_info').select('id').eq('user_id', userId).limit(1).maybeSingle();
    const existing = ensure(result);
    if (existing) ensure(await supabase.from('device_info').update(device).eq('user_id', userId).eq('id', existing.id));
    else ensure(await supabase.from('device_info').insert(device));
  }
}
export async function markIntake(userId, schedule, status) {
  const scheduledFor = toLocalTimestamp(localDateISO(), schedule.time_of_day.slice(0, 5));
  ensure(await supabase.from('medication_intakes').upsert({
    user_id: userId, schedule_id: schedule.id, scheduled_for: scheduledFor,
    status, taken_at: status === 'taken' ? new Date().toISOString() : null,
  }, { onConflict: 'schedule_id,scheduled_for' }));
}
export async function savePushSubscription(userId, subscription) {
  const body = subscription.toJSON();
  ensure(await supabase.from('push_subscriptions').upsert({
    user_id: userId, endpoint: body.endpoint, keys: body.keys,
  }, { onConflict: 'endpoint' }));
}
export async function deletePushSubscription(userId, endpoint) {
  ensure(await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint));
}
export { localDateISO };
