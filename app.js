import { supabase, isSupabaseConfigured, vapidPublicKey } from './src/lib/supabase.js';
import {
  emptyState, loadUserState, setSymptomCatalog, saveDailyEntry, saveMedication, deleteMedication,
  saveAppointment, deleteAppointment, saveEpisode, saveQuestion, updateQuestion, deleteQuestion,
  saveProfile, markIntake, savePushSubscription, deletePushSubscription, localDateISO,
} from './src/lib/repository.js';
import { NICARAGUA_EMERGENCY_CONTACTS } from './src/config/emergencies.js';

const MOODS = [
  { value: 1, label: 'Muy mal', face: '😟' },
  { value: 2, label: 'Regular', face: '😐' },
  { value: 3, label: 'Bien', face: '🙂' },
  { value: 4, label: 'Muy bien', face: '😊' },
  { value: 5, label: 'Excelente', face: '😄' },
];
const SYMPTOMS = ['Mareo', 'Desmayo o casi desmayo', 'Palpitaciones', 'Falta de aire', 'Dolor de pecho', 'Cansancio', 'Hinchazón de pies', 'Otro'];
const ICONS = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  pill: '<path d="m10.5 20.5 10-10a5.7 5.7 0 0 0-8-8l-10 10a5.7 5.7 0 0 0 8 8Z"/><path d="m8 8 8 8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.1 10.4a16 16 0 0 0 6 6l1.9-1.9a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 2.2 2.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  question: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0m-7 7v5m-4 0h8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/>',
};

const app = document.querySelector('#app');
const toastEl = document.querySelector('#toast');
let toastTimer;
let deferredInstallPrompt = null;
let currentRoute = location.hash.includes('type=recovery') ? 'password' : location.hash.replace('#/', '') || 'home';
let state = emptyState();
let currentSession = null;
let sessionReady = false;
let authBusy = false;
let appError = '';
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function icon(name) { return `<svg aria-hidden="true" viewBox="0 0 24 24">${ICONS[name] || ICONS.heart}</svg>`; }
function todayISO() { return localDateISO(); }
function id() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function dateLabel(value, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  if (!value) return 'Sin fecha';
  const parsed = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat('es', { ...options, timeZone: 'UTC' }).format(parsed);
}
function profileTimeZone() { return state.profile.timezone || 'America/Managua'; }
function greetingForProfileTime() {
  const hour = Number(new Intl.DateTimeFormat('es', { timeZone: profileTimeZone(), hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
function profileDateTime(value, options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) {
  return new Intl.DateTimeFormat('es', { ...options, timeZone: profileTimeZone() }).format(new Date(value));
}
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 3200);
}
function navigate(route) {
  stopVoiceDictation();
  currentRoute = route;
  if (location.hash !== `#/${route}`) location.hash = `/${route}`;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function pageHead(kicker, title, copy = '') {
  return `<header class="page-head"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1>${copy ? `<p>${esc(copy)}</p>` : ''}</header>`;
}
function button(label, route, kind = 'button', iconName = '') {
  return `<a class="button ${kind}" href="#/${route}">${iconName ? icon(iconName) : ''}${esc(label)}</a>`;
}
function emergencyStrip() {
  return `<details class="emergency-strip"><summary>${icon('alert')} <strong>Aviso médico</strong> · Llamar 102</summary><div class="emergency-details"><p>Si tienes desmayo, dolor fuerte de pecho o falta de aire intensa, busca atención urgente. Esta app no reemplaza la atención médica.</p><p class="hint">Números informados para Nicaragua; verifica su vigencia con MINSA/servicios locales antes de depender de ellos.</p><div class="emergency-number-list">${NICARAGUA_EMERGENCY_CONTACTS.map((contact) => `<a class="emergency-call" href="tel:${esc(contact.number)}">${icon('phone')} ${esc(contact.label)} · ${esc(contact.number)}</a>`).join('')}</div></div></details>`;
}
function header() {
  const userName = state.profile.name ? `Hola, ${esc(state.profile.name)}` : 'Tu espacio personal';
  return `<header class="topbar"><a class="brand" href="#/home"><span class="brand-mark">${icon('heart')}</span><span><span class="brand-kicker">${userName}</span><span class="brand-name">Mi Salud</span></span></a><div class="top-actions">${deferredInstallPrompt ? '<button class="icon-button" type="button" data-action="install-app">Instalar</button>' : ''}<button class="icon-button" type="button" data-nav="profile" aria-label="Mi perfil">${icon('person')}<span class="profile-action-label">Perfil</span></button></div></header>`;
}
const navItems = [
  ['home', 'Inicio', 'home'], ['meds', 'Medicinas', 'pill'], ['appointments', 'Citas', 'calendar'], ['health', 'Mi Salud', 'history'],
];
function bottomNav() {
  const active = currentRoute === 'home' ? 'home' : currentRoute.startsWith('medication') || currentRoute === 'meds' ? 'meds' : currentRoute.startsWith('appointment') || currentRoute === 'appointments' ? 'appointments' : 'health';
  return `<nav class="bottom-nav" aria-label="Navegación principal">${navItems.map(([route, label, iconName]) => `<a class="nav-item" href="#/${route}" ${active === route ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></a>`).join('')}</nav>`;
}
function shell(content, { emergency = true, nav = true, className = '' } = {}) {
  document.body.className = className;
  app.innerHTML = `<div class="app-shell">${header()}${emergency ? emergencyStrip() : ''}<main id="main" tabindex="-1">${content}<p class="footer-note">Tus registros están asociados a tu cuenta. Mi Salud acompaña tus cuidados, pero no sustituye a tu equipo de salud.</p></main>${nav ? bottomNav() : ''}</div>`;
}
function emptyCard(message, actionLabel, route, symbol = 'heart') {
  return `<section class="empty"><div class="empty-icon">${icon(symbol)}</div><h3>Aún no hay registros</h3><p>${esc(message)}</p>${button(actionLabel, route, 'small')}</section>`;
}
function nearestAppointment() {
  return [...state.appointments].filter((item) => item.status !== 'cancelled' && item.startsAt >= new Date().toISOString()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}
function todayIntakes() {
  const doses = state.medications.flatMap((med) => (med.schedules || []).map((schedule) => ({ med, schedule, time: schedule.time_of_day.slice(0, 5) })));
  return doses.sort((a, b) => a.time.localeCompare(b.time));
}
function intakeKey(scheduleId, time) { return `${scheduleId}|${todayISO()}|${time}`; }

function homeView() {
  const moodToday = state.entries.find((entry) => entry.date === todayISO());
  const appointment = nearestAppointment();
  const doses = todayIntakes();
  const takenCount = doses.filter((dose) => state.intakes[intakeKey(dose.schedule.id, dose.time)] === 'taken').length;
  const moodOptions = MOODS.map((mood) => `<button type="button" class="choice" aria-pressed="${moodToday?.mood === mood.value}" data-action="mood-home" data-value="${mood.value}"><span class="face">${mood.face}</span><span>${mood.label}</span></button>`).join('');
  const medsMarkup = doses.length ? `<section class="card"><div class="row"><div><p class="eyebrow">Hoy</p><h2>Medicinas del día</h2></div><span class="tag blue">${takenCount} de ${doses.length} tomadas</span></div><div class="progress" aria-label="Progreso de tomas"><span style="width:${doses.length ? Math.round((takenCount / doses.length) * 100) : 0}%"></span></div><div class="list" style="margin-top:14px">${doses.map(({ med, schedule, time }) => {
    const status = state.intakes[intakeKey(schedule.id, time)];
    return `<article class="list-item"><div class="row wrap"><div><div class="med-time">${esc(time)}</div><h3>${esc(med.name)}</h3><p>${esc(med.dose || 'Dosis no especificada')} · ${esc(med.instructions || 'Seguir indicación médica')}</p></div><button class="button small ${status === 'taken' ? 'neutral' : 'green'}" data-action="take-dose" data-id="${esc(med.id)}" data-schedule="${esc(schedule.id)}" data-time="${esc(time)}" ${status === 'taken' ? 'disabled' : ''}>${status === 'taken' ? '✓ Ya tomada' : 'Marcar tomada'}</button></div></article>`;
  }).join('')}</div>${button('Ver todas mis medicinas', 'meds', 'secondary')}</section>` : `<section class="card"><h2>Medicinas de hoy</h2><p>Añade tus medicinas con el horario que te indicó tu profesional de salud.</p>${button('Agregar una medicina', 'medication-new', '', 'plus')}</section>`;
  const appointmentMarkup = appointment ? `<section class="card"><div class="row wrap"><div><p class="eyebrow">Próxima cita</p><h2>${esc(appointment.title)}</h2><p>${esc(profileDateTime(appointment.startsAt))}</p><p>${esc(appointment.doctor || 'Profesional sin especificar')} · ${esc(appointment.specialty || 'Consulta')}</p></div><span class="tag blue">${icon('calendar')} Programada</span></div>${button('Ver mis citas', 'appointments', 'secondary')}</section>` : `<section class="card soft"><p class="eyebrow">Agenda médica</p><h2>¿Tienes una cita próxima?</h2><p>Guarda la fecha, el lugar y las preguntas que quieras llevar.</p>${button('Anotar una cita', 'appointment-new', '', 'plus')}</section>`;
  const supportAction = state.profile.emergencyPhone
    ? `<a class="button small secondary" href="tel:${esc(state.profile.emergencyPhone)}">${icon('phone')} Llamar a familiar</a>`
    : button('Añadir contacto', 'profile', 'small secondary', 'person');
  return `${pageHead('Tu bienestar, paso a paso', `${greetingForProfileTime()}${state.profile.name ? `, ${state.profile.name}` : ''}`, dateLabel(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' }))}<div class="stack"><section class="card"><h2>¿Cómo te sientes hoy?</h2><p class="muted">Elige la opción que mejor describa tu estado.</p><div class="mood-grid" role="group" aria-label="Estado general">${moodOptions}</div><div class="row wrap" style="margin-top:14px">${button('Registrar mi día', 'day', 'small secondary')}${button('Me pasó algo ahora', 'incident', 'small red', 'alert')}</div></section>${appointmentMarkup}${medsMarkup}<section class="card soft"><div class="row wrap"><div><p class="eyebrow">Acompañamiento</p><h2>¿Necesitas ayuda ahora?</h2><p>${state.profile.emergencyName ? `Contacto: ${esc(state.profile.emergencyName)}` : 'Añade un contacto familiar en tu perfil.'}</p></div>${supportAction}</div></section><section class="card"><h2>Accesos rápidos</h2><div class="button-grid two-col">${button('Preguntas para mi doctor', 'questions', 'secondary', 'question')}${button('Historial de salud', 'health', 'secondary', 'history')}${button('Reporte para mi cita', 'report', 'secondary', 'file')}${button('Ayuda urgente', 'emergency', 'red', 'alert')}</div></section></div>`;
}

function medsView() {
  const list = state.medications.length ? `<div class="list">${state.medications.map((med) => `<article class="list-item"><div class="row start"><div><div class="row wrap"><h3>${esc(med.name)}</h3>${med.active === false ? '<span class="tag">Pausada</span>' : '<span class="tag green">Activa</span>'}</div><p>${esc(med.dose || 'Dosis por confirmar')}</p><p>${(med.times || []).map((time) => `<span class="tag blue">${esc(time)}</span>`).join(' ') || 'Sin horario'}</p><p class="muted">${esc(med.instructions || 'Sin instrucciones adicionales')}</p></div><button class="icon-button" aria-label="Eliminar ${esc(med.name)}" data-action="delete-med" data-id="${esc(med.id)}">×</button></div></article>`).join('')}</div>` : emptyCard('Cuando agregues un medicamento podrás consultarlo aquí. Confirma los horarios con tu médico o farmacéutico.', 'Agregar medicina', 'medication-new', 'pill');
  return `${pageHead('Tratamiento personal', 'Mis medicinas', 'Organiza los horarios y registra cada toma. Sigue siempre la receta de tu profesional de salud.')}<div class="stack"><div class="row wrap">${button('Agregar medicina', 'medication-new', '', 'plus')}<button class="button small secondary" data-action="push-settings">${state.pushEnabled ? 'Desactivar avisos' : 'Activar avisos'}</button></div>${list}<section class="card soft"><h3>Importante</h3><p>Los avisos dependen de la conexión y de los ajustes del dispositivo. No reemplazan una alarma médica.</p><p>No cambies dosis ni horarios por esta aplicación. Si tienes dudas, consulta con tu médico o farmacéutico.</p></section></div>`;
}
function medicationForm() {
  return `${pageHead('Tratamiento personal', 'Agregar medicina', 'Copia el nombre y la pauta tal como aparecen en la receta.')}<form class="card form-grid" id="medication-form"><div class="field"><label for="med-name">Nombre de la medicina *</label><input id="med-name" name="name" required autocomplete="off" placeholder="Ejemplo: Enalapril" /></div><div class="field"><label for="med-dose">Dosis</label><input id="med-dose" name="dose" placeholder="Ejemplo: 10 mg" /></div><div class="field"><label for="med-instructions">Instrucciones</label><textarea id="med-instructions" name="instructions" placeholder="Por ejemplo: después del desayuno"></textarea></div><div class="field"><label for="med-times">Horas de toma</label><input id="med-times" name="times" placeholder="08:00, 20:00" inputmode="text" /><small>Separa las horas con coma. Puedes dejarlo vacío y agregarlo después.</small></div><div class="field"><label for="med-start">Fecha de inicio</label><input id="med-start" name="start" type="date" value="${todayISO()}" /></div><div class="form-actions"><button class="button" type="submit">${icon('check')} Guardar medicina</button><a class="button secondary" href="#/meds">Cancelar</a></div></form>`;
}
function appointmentsView() {
  const sorted = [...state.appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const cards = sorted.length ? `<div class="list">${sorted.map((item) => `<article class="list-item"><div class="row wrap"><span class="tag blue">${esc(profileDateTime(item.startsAt, { weekday: 'long', day: 'numeric', month: 'long' }))}</span><span class="tag">${esc(profileDateTime(item.startsAt, { hour: '2-digit', minute: '2-digit' }))}</span></div><h3 style="margin-top:10px">${esc(item.title)}</h3><p>${esc(item.doctor || 'Profesional no especificado')}${item.specialty ? ` · ${esc(item.specialty)}` : ''}</p><p>${esc(item.location || 'Lugar por confirmar')}</p>${item.notes ? `<p class="muted">${esc(item.notes)}</p>` : ''}<div class="row wrap" style="margin-top:10px"><button class="button small secondary" data-action="delete-appointment" data-id="${esc(item.id)}">Cancelar / eliminar</button><a class="button small secondary" href="#/questions">Preparar preguntas</a></div></article>`).join('')}</div>` : emptyCard('Anota tu próxima consulta para tener a mano el día, la hora y el lugar.', 'Anotar cita', 'appointment-new', 'calendar');
  return `${pageHead('Agenda médica personal', 'Mis citas', 'Revisa tus consultas y anota visitas nuevas con calma.')}<div class="stack">${button('Agregar nueva cita', 'appointment-new', '', 'plus')}${cards}</div>`;
}
function appointmentForm() {
  return `${pageHead('Agenda médica', 'Anotar una cita', 'Añade los datos disponibles. Podrás completar lo que falte más adelante.')}<form class="card form-grid" id="appointment-form"><div class="field"><label for="appt-title">Motivo de la cita *</label><input id="appt-title" name="title" required placeholder="Ejemplo: Revisión de cardiología" /></div><div class="field"><label for="appt-doctor">Nombre del médico o doctora</label><input id="appt-doctor" name="doctor" placeholder="Nombre del profesional" /></div><div class="field"><label for="appt-specialty">Especialidad</label><input id="appt-specialty" name="specialty" placeholder="Ejemplo: Cardiología" /></div><div class="field"><label for="appt-location">Lugar</label><input id="appt-location" name="location" placeholder="Centro médico y consultorio" /></div><div class="field"><label for="appt-date">Fecha *</label><input id="appt-date" name="date" type="date" required min="${todayISO()}" value="${todayISO()}" /></div><div class="field"><label for="appt-time">Hora *</label><input id="appt-time" name="time" type="time" required value="10:30" /></div><div class="field"><label for="appt-notes">Notas o preparativos</label><textarea id="appt-notes" name="notes" placeholder="Documentos que quieres llevar o indicaciones recibidas"></textarea></div><div class="form-actions"><button class="button" type="submit">${icon('check')} Guardar cita</button><a class="button secondary" href="#/appointments">Cancelar</a></div></form>`;
}
function dayView() {
  const saved = state.entries.find((entry) => entry.date === todayISO());
  const moodOptions = MOODS.map((mood) => `<label class="check-row"><input type="radio" name="mood" value="${mood.value}" ${saved?.mood === mood.value ? 'checked' : ''} required /><span>${mood.face} ${mood.label}</span></label>`).join('');
  const profileSymptoms = state.symptomTypes.filter((symptom) => symptom.applies_when !== 'post_implant' || state.profile.pacemakerImplanted);
  const availableSymptoms = profileSymptoms.length ? profileSymptoms.map((symptom) => symptom.name) : SYMPTOMS;
  return `${pageHead('Registro diario', 'Mi día', 'Cuéntanos con tranquilidad cómo te has sentido hoy. El dictado depende del navegador; la app no guarda el audio original. Revisa el texto antes de guardarlo.')}<form class="stack" id="day-form"><section class="card"><h2>¿Cómo te sientes?</h2><div class="list">${moodOptions}</div></section><section class="card"><h2>¿Notaste algún síntoma?</h2><p class="muted">Selecciona los que hayas sentido hoy.</p><div class="list">${availableSymptoms.map((symptom) => `<label class="check-row"><input type="checkbox" name="symptoms" value="${esc(symptom)}" ${saved?.symptoms?.includes(symptom) ? 'checked' : ''}/><span>${esc(symptom)}</span></label>`).join('')}</div><div class="field" style="margin-top:14px"><label for="severity">Intensidad más alta</label><select name="severity" id="severity"><option value="1">Leve</option><option value="2" ${saved?.symptomRows?.some((item) => item.severity === 2) ? 'selected' : ''}>Media</option><option value="3" ${saved?.symptomRows?.some((item) => item.severity === 3) ? 'selected' : ''}>Fuerte</option></select></div></section><section class="card"><h2>Mediciones (opcionales)</h2><p class="muted">Anota las medidas que te hayan indicado registrar.</p><div class="form-grid two-col"><div class="field"><label for="pulse">Pulso (latidos/min)</label><input id="pulse" name="pulse" type="number" min="20" max="250" inputmode="numeric" value="${esc(saved?.pulse || '')}" placeholder="72" /></div><div class="field"><label for="sleep">Horas de sueño</label><input id="sleep" name="sleep" type="number" min="0" max="24" step="0.5" inputmode="decimal" value="${esc(saved?.sleep || '')}" placeholder="7.5" /></div><div class="field"><label for="systolic">Presión sistólica</label><input id="systolic" name="systolic" type="number" min="50" max="300" inputmode="numeric" value="${esc(saved?.systolic || '')}" placeholder="120" /></div><div class="field"><label for="diastolic">Presión diastólica</label><input id="diastolic" name="diastolic" type="number" min="30" max="200" inputmode="numeric" value="${esc(saved?.diastolic || '')}" placeholder="80" /></div><div class="field"><label for="weight">Peso (kg)</label><input id="weight" name="weight" type="number" min="20" max="300" step="0.1" inputmode="decimal" value="${esc(saved?.weight || '')}" placeholder="70.0" /></div><div class="field"><label for="activity">Actividad diaria</label><select id="activity" name="activity"><option value="">Sin dato</option><option value="1" ${saved?.activity === 1 ? 'selected' : ''}>Normal</option><option value="2" ${saved?.activity === 2 ? 'selected' : ''}>Con dificultad</option><option value="3" ${saved?.activity === 3 ? 'selected' : ''}>Necesité reposo</option></select></div></div></section><section class="card"><div class="field"><label for="day-notes">¿Qué más quieres recordar?</label><textarea id="day-notes" name="notes" maxlength="4000" placeholder="Actividades, descanso u otra observación">${esc(saved?.notes || '')}</textarea><button id="voice-button" class="button secondary" type="button" data-action="voice-notes" data-target="day-notes" aria-pressed="false">${icon('mic')} Dictar notas con mi voz</button><span class="hint" id="voice-status" aria-live="polite">Al tocar, permite usar el micrófono. Vuelve a tocar para detener y revisar el texto.</span></div></section><button class="button" type="submit">${icon('check')} Guardar mi día</button></form>`;
}
function incidentView() {
  const options = ['Me desmayé', 'Casi me desmayé', 'Mareo fuerte', 'Palpitaciones', 'Dolor o presión en el pecho', 'Falta de aire', 'Caída', 'Otro síntoma'];
  const checkChoices = (name, title, labels) => `<fieldset class="field"><legend class="field-label">${title}</legend><div class="list">${labels.map((label) => `<label class="check-row"><input type="checkbox" name="${name}" value="${esc(label)}" /><span>${esc(label)}</span></label>`).join('')}</div></fieldset>`;
  return `${pageHead('Registro de episodio', 'Cuéntanos qué pasó', 'Si es una emergencia o tienes síntomas intensos, llama ahora a emergencias. Este formulario no evalúa ni diagnostica.')}<form class="stack" id="incident-form"><section class="card"><h2>¿Qué ocurrió? *</h2><div class="list">${options.map((item) => `<label class="check-row"><input type="radio" name="symptom" value="${esc(item)}" required /><span>${esc(item)}</span></label>`).join('')}</div></section><section class="card"><div class="form-grid"><div class="field"><label for="incident-date">Fecha *</label><input id="incident-date" name="date" type="date" required value="${todayISO()}" /></div><div class="field"><label for="incident-time">Hora aproximada *</label><input id="incident-time" name="time" type="time" required value="${new Date().toTimeString().slice(0, 5)}" /></div><div class="field"><label for="incident-severity">Intensidad</label><select id="incident-severity" name="severity"><option>Leve</option><option selected>Media</option><option>Fuerte</option></select></div><div class="field"><label for="incident-duration">Duración</label><select id="incident-duration" name="duration"><option value="">No especificada</option><option value="segundos">Unos segundos</option><option value="menos_1_min">Menos de 1 minuto</option><option value="1_a_5_min">Entre 1 y 5 minutos</option><option value="mas_de_5_min">Más de 5 minutos</option><option value="no_se">No sé</option></select></div><div class="field"><label for="position-before">¿Qué posición o actividad tenías?</label><select id="position-before" name="position"><option value="">No especificada</option><option value="de_pie_quieto">De pie quieto</option><option value="caminando">Caminando</option><option value="levantandome">Me estaba levantando</option><option value="sentado">Sentado</option><option value="acostado">Acostado</option><option value="esfuerzo">Esfuerzo físico</option><option value="no_recuerdo">No recuerdo</option></select></div></div></section><section class="card">${checkChoices('triggers', 'Circunstancias que pudieron influir', ['Calor', 'Mucho tiempo de pie', 'Comí hace poco', 'Me levanté rápido', 'Esfuerzo físico', 'Emoción fuerte o dolor'])}${checkChoices('warningSigns', 'Señales que notaste', ['Dolor de pecho', 'Falta de aire', 'Palpitaciones', 'Sudor frío', 'Visión borrosa', 'Debilidad'])}${checkChoices('afterEffects', 'Cómo te sentiste después', ['Cansancio', 'Confusión', 'Dolor de cabeza', 'Náusea', 'Me recuperé pronto'])}<label class="check-row"><input type="checkbox" name="injury" /><span>Me hice daño durante la caída o el episodio</span></label><div class="field"><label for="injury-notes">Detalle de la lesión</label><input id="injury-notes" name="injuryNotes" maxlength="1000" /></div></section><section class="card"><div class="form-grid"><div class="field"><label for="episode-pulse">Pulso (latidos/min), si lo mediste</label><input id="episode-pulse" name="pulse" type="number" min="20" max="250" inputmode="numeric" /></div><div class="field"><label for="episode-sys">Presión sistólica, si la mediste</label><input id="episode-sys" name="systolic" type="number" min="50" max="300" inputmode="numeric" /></div><div class="field"><label for="episode-dia">Presión diastólica, si la mediste</label><input id="episode-dia" name="diastolic" type="number" min="30" max="200" inputmode="numeric" /></div><div class="field"><label for="witness">Notas de quien te acompañó</label><textarea id="witness" name="witness" maxlength="2000"></textarea></div><div class="field"><label for="help-contacted">¿A quién contactaste?</label><select id="help-contacted" name="contactedHelp"><option value="">No indicado</option><option value="ninguno">A nadie</option><option value="familiar">A un familiar</option><option value="medico">A un médico</option><option value="emergencias">A emergencias</option></select></div><div class="field"><label for="incident-notes">Otros detalles</label><textarea id="incident-notes" name="notes" maxlength="4000"></textarea></div></div></section><aside class="card emergency-card"><h2>${icon('alert')} Señales de alarma</h2><p>Ante dolor fuerte de pecho, dificultad intensa para respirar, desmayo o peligro inmediato, llama a emergencias.</p><a class="button red" href="tel:102">${icon('phone')} Central de ambulancias · 102</a></aside><div class="form-actions"><button class="button" type="submit">${icon('check')} Guardar episodio</button><a class="button secondary" href="#/home">Cancelar</a></div></form>`;
}
function healthView() {
  const entries = [...state.entries].sort((a, b) => b.date.localeCompare(a.date));
  const incidents = [...state.incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const entryCards = entries.map((entry) => {
    const mood = MOODS.find((item) => item.value === entry.mood);
    return `<article class="list-item"><div class="row wrap"><span class="tag blue">${esc(dateLabel(entry.date))}</span><span class="tag">${mood?.face || ''} ${esc(mood?.label || 'Registro')}</span></div><p>${entry.symptoms?.length ? `Síntomas: ${esc(entry.symptoms.join(', '))}` : 'Sin síntomas registrados'}</p>${entry.pulse ? `<p>Pulso: ${esc(entry.pulse)} latidos/min</p>` : ''}${entry.systolic ? `<p>Presión: ${esc(entry.systolic)}/${esc(entry.diastolic || '—')} mmHg</p>` : ''}${entry.notes ? `<p>${esc(entry.notes)}</p>` : ''}</article>`;
  }).join('');
  const incidentCards = incidents.map((incident) => `<article class="list-item"><div class="row wrap"><span class="tag red">${esc(dateLabel(incident.date))} · ${esc(incident.time)}</span><span class="tag amber">${esc(incident.severity)}</span></div><h3>${esc(incident.symptom)}</h3>${incident.notes ? `<p>${esc(incident.notes)}</p>` : ''}</article>`).join('');
  return `${pageHead('Histórico de bienestar', 'Mi historial de salud', 'Consulta los datos que has registrado y comparte un resumen con tu profesional de salud.')}<div class="stack"><div class="button-grid two-col">${button('Registrar mi día', 'day', 'secondary', 'plus')}${button('Anotar un episodio', 'incident', 'secondary', 'alert')}${button('Reporte para mi cita', 'report', 'secondary', 'file')}${button('Preguntas para mi doctor', 'questions', 'secondary', 'question')}</div><section class="card"><h2>Registros diarios</h2>${entries.length ? `<div class="list">${entryCards}</div>` : '<p class="muted">Todavía no hay registros diarios.</p>'}</section><section class="card"><h2>Episodios anotados</h2>${incidents.length ? `<div class="list">${incidentCards}</div>` : '<p class="muted">Todavía no hay episodios anotados.</p>'}</section></div>`;
}
function questionsView() {
  return `${pageHead('Cuaderno de consulta', 'Preguntas para mi doctor', 'Anota tus dudas cuando te acuerdes para llevarlas a tu próxima consulta.')}<div class="stack"><form class="card form-grid" id="question-form"><div class="field"><label for="question">¿Qué quieres preguntarle a tu médico?</label><textarea id="question" name="question" required placeholder="Escribe aquí tu duda"></textarea></div><button class="button" type="submit">${icon('plus')} Guardar pregunta</button></form><section class="card"><h2>Preguntas pendientes</h2>${state.questions.length ? `<div class="list">${state.questions.map((q) => `<article class="list-item"><div class="row start"><p>${esc(q.text)}</p><button class="icon-button" data-action="delete-question" data-id="${esc(q.id)}" aria-label="Eliminar pregunta">×</button></div><span class="tag ${q.answered ? 'green' : 'amber'}">${q.answered ? 'Respondida' : 'Pendiente'}</span><button class="button small secondary" style="margin-top:9px" data-action="toggle-question" data-id="${esc(q.id)}">${q.answered ? 'Marcar pendiente' : 'Marcar respondida'}</button></article>`).join('')}</div>` : '<p class="muted">No tienes preguntas guardadas todavía.</p>'}</section></div>`;
}
function reportView() {
  const entries = [...state.entries].sort((a, b) => b.date.localeCompare(a.date));
  const incidents = [...state.incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const mood = (value) => MOODS.find((item) => item.value === value)?.label || 'Sin dato';
  return `${pageHead('Documento médico para consulta', 'Reporte para mi cita', 'Vista previa del resumen. Revisa los datos antes de compartirlos o imprimirlos.')}<div class="stack"><div class="row wrap no-print"><button class="button" data-action="print-report">${icon('file')} Imprimir o guardar como PDF</button><button class="button secondary" data-action="share-report">Compartir resumen</button></div><article class="card report-sheet"><p class="eyebrow">Mi Salud · Resumen personal</p><h2>${esc(state.profile.name || 'Paciente')}</h2><p>Generado el ${esc(dateLabel(todayISO()))}</p><div class="divider"></div><h2>Registros diarios (${entries.length})</h2>${entries.length ? entries.slice(0, 10).map((entry) => `<section class="list-item"><h3>${esc(dateLabel(entry.date))} · ${esc(mood(entry.mood))}</h3><p>Síntomas: ${entry.symptoms?.length ? esc(entry.symptoms.join(', ')) : 'Ninguno anotado'}</p>${entry.pulse ? `<p>Pulso: ${esc(entry.pulse)} latidos/min</p>` : ''}${entry.systolic ? `<p>Presión: ${esc(entry.systolic)}/${esc(entry.diastolic || '—')} mmHg</p>` : ''}${entry.sleep ? `<p>Sueño: ${esc(entry.sleep)} horas</p>` : ''}${entry.notes ? `<p>Notas: ${esc(entry.notes)}</p>` : ''}</section>`).join('') : '<p>No se han guardado registros diarios.</p>'}<h2>Episodios</h2>${incidents.length ? incidents.slice(0, 10).map((event) => `<p><strong>${esc(dateLabel(event.date))}, ${esc(event.time)}:</strong> ${esc(event.symptom)} (${esc(event.severity)}). ${esc(event.notes || '')}</p>`).join('') : '<p>No hay episodios anotados.</p>'}<h2>Medicinas registradas</h2>${state.medications.length ? state.medications.map((med) => `<p><strong>${esc(med.name)}</strong> — ${esc(med.dose || 'dosis no especificada')}; ${esc((med.times || []).join(', ') || 'horario no especificado')}</p>`).join('') : '<p>No hay medicinas registradas.</p>'}<h2>Preguntas pendientes</h2>${state.questions.filter((q) => !q.answered).length ? state.questions.filter((q) => !q.answered).map((q) => `<p>• ${esc(q.text)}</p>`).join('') : '<p>No hay preguntas pendientes.</p>'}<p class="footer-note">Este documento es un registro personal y no representa un diagnóstico médico.</p></article></div>`;
}
function emergencyView() {
  const familyCall = state.profile.emergencyPhone
    ? `<a class="button secondary" href="tel:${esc(state.profile.emergencyPhone)}">${icon('phone')} Llamar a ${esc(state.profile.emergencyName || 'mi contacto')}</a>`
    : '';
  return `${pageHead('Ayuda inmediata', 'Esto necesita atención ahora', 'Si estás en peligro, llama ahora. La aplicación no puede enviar ayuda por sí sola.')}<div class="card emergency-card emergency-body"><div style="font-size:58px" aria-hidden="true">⚠️</div><h2>Si es una emergencia, llama ahora</h2><p>Mantén la calma y busca ayuda de una persona cercana.</p><div class="emergency-number-list">${NICARAGUA_EMERGENCY_CONTACTS.map((contact) => `<a class="button red" href="tel:${esc(contact.number)}">${icon('phone')} ${esc(contact.label)} · ${esc(contact.number)}</a>`).join('')}${familyCall}</div><p class="hint">Los números de Nicaragua fueron comunicados por el usuario; confirma su vigencia con MINSA/servicios locales. Si alguno no funciona, intenta con otro servicio local disponible.</p><section class="card" style="margin-top:18px;text-align:left"><h3>Busca atención urgente ante:</h3><p>Desmayo, dolor fuerte de pecho, falta de aire intensa o cualquier peligro inmediato.</p></section>${button('Ya estoy bien, volver al inicio', 'home', 'neutral')}</div>`;
}
function profileView() {
  const device = state.deviceInfo || {};
  return `${pageHead('Tus preferencias', 'Mi perfil', 'Mantén al día tus datos para que tu experiencia se ajuste a ti.')}<form class="card form-grid" id="profile-form">
    <h2>Tu información</h2>
    <div class="field"><label for="profile-name">Nombre completo</label><input id="profile-name" name="name" value="${esc(state.profile.name)}" autocomplete="name" maxlength="120" /></div>
    <div class="field"><label for="profile-email">Correo electrónico</label><input id="profile-email" type="email" value="${esc(state.profile.email)}" disabled /><small>Para cambiarlo, pide ayuda a la persona que administra tu cuenta.</small></div>
    <div class="field"><label for="birth-date">Fecha de nacimiento</label><input id="birth-date" name="birthDate" type="date" value="${esc(state.profile.birthDate)}" /></div>
    <div class="divider"></div><h2>Tu contacto de confianza</h2>
    <div class="field"><label for="contact-name">Nombre</label><input id="contact-name" name="emergencyName" value="${esc(state.profile.emergencyName)}" maxlength="120" /></div>
    <div class="field"><label for="contact-phone">Teléfono</label><input id="contact-phone" name="emergencyPhone" type="tel" value="${esc(state.profile.emergencyPhone)}" maxlength="40" /></div>
    <div class="divider"></div><h2>Preferencias de salud</h2>
    <div class="field"><label for="timezone">Zona horaria</label><select id="timezone" name="timezone"><option value="America/Managua" ${state.profile.timezone === 'America/Managua' ? 'selected' : ''}>Nicaragua</option><option value="America/Costa_Rica" ${state.profile.timezone === 'America/Costa_Rica' ? 'selected' : ''}>Costa Rica</option><option value="America/Mexico_City" ${state.profile.timezone === 'America/Mexico_City' ? 'selected' : ''}>México · Ciudad de México</option></select></div>
    <label class="check-row"><input type="checkbox" name="pacemaker" ${state.profile.pacemakerImplanted ? 'checked' : ''} /><span>Tengo marcapasos implantado</span></label>
    <div class="field"><label for="pulse-low">Avisarme si mi pulso es menor que (latidos/min)</label><input id="pulse-low" name="pulseLowThreshold" type="number" min="30" max="70" value="${esc(state.profile.pulseLowThreshold)}" required /><small>Consulta con tu equipo de salud qué valor es adecuado para ti.</small></div>
    <details class="profile-device"><summary>Información de tu marcapasos (opcional)</summary><div class="form-grid">
      <div class="field"><label for="implant-date">Fecha de implante</label><input id="implant-date" name="implantDate" type="date" value="${esc(device.implant_date || '')}" /></div>
      <div class="field"><label for="device-model">Modelo</label><input id="device-model" name="deviceModel" value="${esc(device.model || '')}" maxlength="100" /></div>
      <div class="field"><label for="manufacturer">Fabricante</label><input id="manufacturer" name="manufacturer" value="${esc(device.manufacturer || '')}" maxlength="100" /></div>
      <div class="field"><label for="device-serial">Número de serie</label><input id="device-serial" name="serial" value="${esc(device.serial || '')}" maxlength="100" autocomplete="off" /></div>
      <div class="field"><label for="next-check">Próximo control</label><input id="next-check" name="nextCheckDate" type="date" value="${esc(device.next_check_date || '')}" /></div>
      <div class="field"><label for="device-notes">Notas</label><textarea id="device-notes" name="deviceNotes" maxlength="2000">${esc(device.notes || '')}</textarea></div>
    </div></details>
    <button class="button" type="submit">${icon('check')} Guardar cambios</button><button class="button secondary" type="button" data-action="export-data">${icon('download')} Descargar una copia de mis datos</button><button class="button neutral" type="button" data-action="sign-out">Cerrar sesión</button>
  </form><section class="card soft notification-settings"><h2>Avisos de medicinas y citas</h2><p>Elige si quieres recibir recordatorios en este dispositivo. Puedes cambiarlo cuando quieras.</p><button class="button secondary" type="button" data-action="push-settings">${state.pushEnabled ? 'Desactivar avisos en este dispositivo' : 'Activar avisos en este dispositivo'}</button><p class="hint">Los avisos dependen de la conexión y de los ajustes del dispositivo. No reemplazan una alarma médica.</p></section><section class="card soft"><h2>Contraseña</h2><p>Puedes cambiar tu contraseña cuando quieras. Se te pedirá que elijas una nueva.</p><button class="button secondary" type="button" data-action="change-password">${icon('key')} Cambiar contraseña</button></section><section class="card soft"><h2>Tu privacidad</h2><p>Tus registros son personales. Cierra sesión al terminar si compartes este dispositivo.</p></section>`;
}
function loginView() {
  return `<div class="auth-heading"><p class="eyebrow">Bienvenido</p><h1>Tu salud, en un solo lugar</h1><p>Entra con el correo y la contraseña que te entregó tu familiar o equipo de cuidado.</p></div><form class="form-grid" id="login-form"><div class="field"><label for="login-email">Correo electrónico</label><input id="login-email" name="email" type="email" required autocomplete="username" maxlength="254" placeholder="nombre@correo.com" /></div><div class="field"><label for="login-password">Contraseña</label><input id="login-password" name="password" type="password" required autocomplete="current-password" maxlength="128" placeholder="Escribe tu contraseña" /></div><button class="button" type="submit" ${authBusy ? 'disabled' : ''}>${authBusy ? 'Un momento…' : 'Entrar a Mi Salud'}</button><a class="button text" href="#/recover">Olvidé mi contraseña</a><p class="hint">¿Necesitas ayuda para entrar? Pide apoyo a tu persona de confianza.</p></form>`;
}
function recoverView() {
  return `<div class="auth-heading"><p class="eyebrow">Recuperar acceso</p><h1>¿Olvidaste tu contraseña?</h1><p>Escribe el correo de tu cuenta y te enviaremos los pasos para crear una nueva.</p></div><form class="form-grid" id="recover-form"><div class="field"><label for="recover-email">Correo electrónico</label><input id="recover-email" name="email" type="email" required autocomplete="email" maxlength="254" placeholder="nombre@correo.com" /></div><button class="button" type="submit">Enviar instrucciones</button><a class="button secondary" href="#/login">Volver</a></form>`;
}
function passwordView() {
  return `${pageHead('Un paso más', 'Crea una contraseña nueva', 'Elige una contraseña larga que puedas recordar y que no uses en otros sitios.')}<form class="card form-grid" id="password-form"><div class="field"><label for="new-password">Nueva contraseña (12 caracteres o más)</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required /></div><div class="field"><label for="confirm-password">Repite la contraseña</label><input id="confirm-password" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required /></div><button class="button" type="submit">Guardar contraseña</button></form>`;
}

function render() {
  const routeViews = {
    home: homeView, meds: medsView, 'medication-new': medicationForm,
    appointments: appointmentsView, 'appointment-new': appointmentForm,
    day: dayView, incident: incidentView, health: healthView, questions: questionsView,
    report: reportView, emergency: emergencyView, profile: profileView, login: loginView, recover: recoverView, password: passwordView,
  };
  if (!isSupabaseConfigured) {
    document.body.className = '';
    app.innerHTML = `<main class="auth-screen"><section class="auth-card"><div class="brand-mark">${icon('heart')}</div><h1>Mi Salud no está disponible</h1><p>No pudimos conectar con tu espacio personal. Inténtalo más tarde o pide ayuda a la persona que te acompaña.</p></section></main>`;
    return;
  }
  if (!sessionReady) {
    app.innerHTML = `<main class="auth-screen"><section class="auth-card"><div class="brand-mark">${icon('heart')}</div><h1>Un momento, por favor</h1><p>Estamos preparando tu espacio personal…</p></section></main>`;
    return;
  }
  if (!currentSession) {
    document.body.className = '';
    app.innerHTML = `<main class="auth-screen" id="main"><a class="auth-brand" href="#/login"><span class="brand-mark">${icon('heart')}</span><span><strong>Mi Salud</strong><small>Un espacio para acompañar tus cuidados</small></span></a><a class="auth-emergency" href="tel:102">${icon('phone')} ¿Necesitas ayuda urgente? Llama al 102</a><section class="auth-card">${currentRoute === 'recover' ? recoverView() : loginView()}</section><p class="footer-note">Cuida tus datos y no compartas tu contraseña.</p></main>`;
    return;
  }
  if (state.profile.mustChangePassword && currentRoute !== 'password') currentRoute = 'password';
  if (currentRoute === 'login' || currentRoute === 'recover') currentRoute = 'home';
  const view = routeViews[currentRoute] || homeView;
  shell(view(), { emergency: currentRoute !== 'emergency' && currentRoute !== 'login' && currentRoute !== 'password', nav: !['emergency', 'login', 'password'].includes(currentRoute), className: currentRoute === 'emergency' ? 'screen-emergency' : '' });
}

async function refreshUserState() {
  if (!currentSession?.user) return;
  state = await loadUserState(currentSession.user);
  setSymptomCatalog(state.symptomTypes);
  try {
    const registration = await navigator.serviceWorker?.ready;
    state.pushEnabled = Boolean(await registration?.pushManager?.getSubscription());
  } catch { state.pushEnabled = false; }
}
function safeErrorMessage(error) {
  const message = String(error?.message || '');
  if (/fetch|network|failed to fetch/i.test(message)) return 'No hay conexión con el servicio. Tus cambios no se guardaron; vuelve a intentarlo.';
  if (/permission|row-level|rls|policy/i.test(message)) return 'No pudimos completar esta acción. Pide ayuda a tu persona de confianza.';
  if (/column|relation|schema cache|does not exist/i.test(message)) return 'No pudimos cargar tus datos. Pide ayuda a la persona que te acompaña.';
  return 'No se pudo completar la operación. Revisa la conexión y vuelve a intentarlo.';
}
async function applySession(session) {
  const changedUser = currentSession?.user?.id !== session?.user?.id;
  currentSession = session;
  if (!session) {
    state = emptyState(); sessionReady = true; render(); return;
  }
  if (changedUser || !sessionReady) {
    sessionReady = false; render();
    try { await refreshUserState(); }
    catch (error) { appError = safeErrorMessage(error); state = emptyState(); }
    sessionReady = true;
    if (state.profile.mustChangePassword) currentRoute = 'password';
    else if (['login', 'recover'].includes(currentRoute)) currentRoute = 'home';
    render();
    if (appError) showToast(appError);
    appError = '';
  } else {
    sessionReady = true; render();
  }
}
function decodeBase64Url(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
async function togglePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    showToast('Este dispositivo no puede mostrar avisos desde la app.'); return;
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await deletePushSubscription(currentSession.user.id, existing.endpoint);
    await existing.unsubscribe(); state.pushEnabled = false; render(); showToast('Avisos desactivados en este dispositivo.'); return;
  }
  if (!vapidPublicKey) { showToast('Los avisos todavía no están disponibles. Pide ayuda a la persona que administra Mi Salud.'); return; }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') { showToast('No activaste los avisos. Puedes cambiarlo en los ajustes de tu dispositivo.'); return; }
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64Url(vapidPublicKey) });
  await savePushSubscription(currentSession.user.id, subscription);
  state.pushEnabled = true; render(); showToast('Este dispositivo quedó preparado para recibir avisos.');
}
let activeRecognition = null;
function startVoiceDictation(targetId) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { showToast('El dictado por voz no está disponible en este navegador.'); return; }
  if (activeRecognition) {
    stopVoiceDictation();
    return;
  }
  const target = document.getElementById(targetId);
  const status = document.querySelector('#voice-status');
  const button = document.querySelector('#voice-button');
  if (!target) return;
  const recognition = new Recognition();
  activeRecognition = recognition;
  recognition.lang = 'es-NI'; recognition.interimResults = false; recognition.maxAlternatives = 1;
  recognition.continuous = true;
  if (button) { button.setAttribute('aria-pressed', 'true'); button.innerHTML = `${icon('mic')} Detener dictado`; }
  if (status) status.textContent = 'Escuchando… puedes detener el dictado cuando quieras.';
  recognition.onresult = (event) => {
    const transcripts = [];
    for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
      if (event.results[index].isFinal) transcripts.push(event.results[index][0]?.transcript || '');
    }
    const transcript = transcripts.join(' ').trim();
    if (!transcript) return;
    target.value = `${target.value}${target.value ? ' ' : ''}${transcript}`.slice(0, 4000);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    if (status) status.textContent = 'Dictado añadido. Revisa el texto antes de guardar.';
  };
  recognition.onerror = (event) => {
    const messages = {
      'not-allowed': 'Permite el micrófono para este sitio desde el icono junto a la dirección y vuelve a intentarlo.',
      'service-not-allowed': 'El navegador no permite el servicio de dictado. Puedes escribir la nota.',
      'audio-capture': 'No encontramos un micrófono disponible. Puedes escribir la nota.',
      network: 'No hay conexión para el dictado en este navegador. Puedes escribir la nota.',
      'no-speech': 'No escuchamos voz. Vuelve a tocar el botón e intenta hablar más cerca del micrófono.',
    };
    const message = messages[event.error] || 'No se pudo iniciar el dictado. Puedes escribir la nota.';
    if (status) status.textContent = message;
    showToast(message);
  };
  recognition.onend = () => {
    if (activeRecognition === recognition) activeRecognition = null;
    if (button) { button.setAttribute('aria-pressed', 'false'); button.innerHTML = `${icon('mic')} Dictar notas con mi voz`; }
  };
  try { recognition.start(); }
  catch {
    activeRecognition = null;
    if (button) { button.setAttribute('aria-pressed', 'false'); button.innerHTML = `${icon('mic')} Dictar notas con mi voz`; }
    if (status) status.textContent = 'No se pudo iniciar el micrófono. Puedes escribir la nota.';
  }
}
function stopVoiceDictation() {
  const recognition = activeRecognition;
  if (!recognition) return;
  activeRecognition = null;
  recognition.stop();
  const button = document.querySelector('#voice-button');
  const status = document.querySelector('#voice-status');
  if (button) { button.setAttribute('aria-pressed', 'false'); button.innerHTML = `${icon('mic')} Dictar notas con mi voz`; }
  if (status) status.textContent = 'Dictado detenido. Revisa el texto antes de guardar.';
}

function formValues(form) { return Object.fromEntries(new FormData(form).entries()); }
async function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  stopVoiceDictation();
  const values = formValues(form);
  try {
    if (form.id === 'login-form') {
      authBusy = true; render();
      const { error } = await supabase.auth.signInWithPassword({ email: values.email.trim(), password: values.password });
      if (error) throw new Error('No se pudo iniciar sesión. Revisa correo y contraseña.');
      showToast('Sesión iniciada.');
    } else if (form.id === 'recover-form') {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), { redirectTo: `${location.origin}/#/password` });
      if (error) throw new Error('No se pudo enviar el enlace. Comprueba el correo o inténtalo más tarde.');
      showToast('Si la cuenta existe, recibirás instrucciones en tu correo.'); navigate('login');
    } else if (form.id === 'password-form') {
      if (values.password !== values.confirm) throw new Error('Las contraseñas no coinciden.');
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw new Error('No se pudo cambiar la contraseña. Comprueba que el enlace siga vigente.');
      const { error: rpcError } = await supabase.rpc('complete_password_change');
      if (rpcError) throw new Error('La contraseña cambió, pero no se pudo completar la verificación de cuenta. Contacta al administrador.');
      await refreshUserState(); currentRoute = 'home'; render(); showToast('Contraseña actualizada.');
    } else if (form.id === 'medication-form') {
      await saveMedication(currentSession.user.id, values); await refreshUserState(); showToast('Medicina guardada en tu cuenta.'); navigate('meds');
    } else if (form.id === 'appointment-form') {
      await saveAppointment(currentSession.user.id, values); await refreshUserState(); showToast('Cita guardada.'); navigate('appointments');
    } else if (form.id === 'day-form') {
      const symptoms = [...form.querySelectorAll('input[name="symptoms"]:checked')].map((input) => input.value);
      await saveDailyEntry(currentSession.user.id, values, symptoms); await refreshUserState(); showToast('Tu registro del día quedó guardado.'); navigate('health');
    } else if (form.id === 'incident-form') {
      values.triggers = [...form.querySelectorAll('[name="triggers"]:checked')].map((input) => input.value);
      values.warningSigns = [...form.querySelectorAll('[name="warningSigns"]:checked')].map((input) => input.value);
      values.afterEffects = [...form.querySelectorAll('[name="afterEffects"]:checked')].map((input) => input.value);
      await saveEpisode(currentSession.user.id, values); await refreshUserState(); showToast('Episodio guardado en tu historial.'); navigate('health');
    } else if (form.id === 'question-form') {
      await saveQuestion(currentSession.user.id, values.question); await refreshUserState(); showToast('Pregunta guardada.'); render();
    } else if (form.id === 'profile-form') {
      await saveProfile(currentSession.user.id, values); await refreshUserState(); showToast('Perfil actualizado.'); render();
    }
  } catch (error) {
    const safeMessages = new Set([
      'No se pudo iniciar sesión. Revisa correo y contraseña.',
      'No se pudo enviar el enlace. Comprueba el correo o inténtalo más tarde.',
      'Las contraseñas no coinciden.',
      'No se pudo cambiar la contraseña. Comprueba que el enlace siga vigente.',
      'La contraseña cambió, pero no se pudo completar la verificación de cuenta. Contacta al administrador.',
    ]);
    showToast(safeMessages.has(error.message) ? error.message : safeErrorMessage(error));
  } finally {
    authBusy = false;
    if (currentRoute === 'login') render();
  }
}
async function updateMood(value) {
  const numeric = Number(value);
  const existing = state.entries.find((entry) => entry.date === todayISO());
  try {
    await saveDailyEntry(currentSession.user.id, {
      mood: numeric, severity: existing?.symptomRows?.[0]?.severity || 1, pulse: existing?.pulse,
      sleep: existing?.sleep, systolic: existing?.systolic, diastolic: existing?.diastolic,
      weight: existing?.weight, activity: existing?.activity, notes: existing?.notes,
    }, existing?.symptoms || []);
    await refreshUserState(); render(); showToast(`Estado guardado: ${MOODS[numeric - 1].label}.`);
  } catch { showToast('No se pudo guardar el estado. Comprueba la conexión.'); }
}
function serializeData() { return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2); }
function downloadFile(filename, content, type) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}
async function shareReport() {
  const text = `Resumen Mi Salud\n${state.entries.length} registros diarios · ${state.incidents.length} episodios anotados · ${state.medications.length} medicinas`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Reporte para mi cita médica', text }); } catch { /* El usuario puede cerrar la hoja de compartir. */ }
  } else {
    await navigator.clipboard?.writeText(text);
    showToast('Resumen copiado o listo para compartir.');
  }
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action], [data-nav]');
  if (!target) return;
  const action = target.dataset.action;
  if (target.dataset.nav) { navigate(target.dataset.nav); return; }
  if (action === 'mood-home') await updateMood(target.dataset.value);
  if (action === 'take-dose') {
    try {
      const medication = state.medications.find((item) => item.id === target.dataset.id);
      const schedule = medication?.schedules.find((item) => item.id === target.dataset.schedule);
      if (!schedule) throw new Error('No se encontró el horario de esta toma.');
      await markIntake(currentSession.user.id, schedule, 'taken'); await refreshUserState(); render(); showToast('Toma registrada.');
    } catch { showToast('No se pudo registrar la toma. Comprueba la conexión.'); }
  }
  if (action === 'delete-med' && confirm('¿Eliminar esta medicina de la lista?')) {
    try { await deleteMedication(currentSession.user.id, target.dataset.id); await refreshUserState(); render(); showToast('Medicina eliminada.'); } catch { showToast('No se pudo eliminar la medicina.'); }
  }
  if (action === 'delete-appointment' && confirm('¿Eliminar esta cita?')) {
    try { await deleteAppointment(currentSession.user.id, target.dataset.id); await refreshUserState(); render(); showToast('Cita cancelada.'); } catch { showToast('No se pudo actualizar la cita.'); }
  }
  if (action === 'toggle-question') {
    const question = state.questions.find((item) => item.id === target.dataset.id);
    if (question) { try { await updateQuestion(currentSession.user.id, question.id, !question.answered); await refreshUserState(); render(); } catch { showToast('No se pudo actualizar la pregunta.'); } }
  }
  if (action === 'delete-question') {
    try { await deleteQuestion(currentSession.user.id, target.dataset.id); await refreshUserState(); render(); } catch { showToast('No se pudo borrar la pregunta.'); }
  }
  if (action === 'print-report') window.print();
  if (action === 'share-report') shareReport();
  if (action === 'export-data') downloadFile('mi-salud-respaldo.json', serializeData(), 'application/json');
  if (action === 'sign-out') {
    try {
      const registration = await navigator.serviceWorker?.ready;
      const subscription = await registration?.pushManager?.getSubscription();
      if (subscription && currentSession?.user?.id) await deletePushSubscription(currentSession.user.id, subscription.endpoint);
      await subscription?.unsubscribe();
    } catch { /* El cierre de sesión debe continuar aunque falle la desuscripción push. */ }
    const { error } = await supabase.auth.signOut();
    if (error) showToast('No se pudo cerrar sesión.');
  }
  if (action === 'push-settings') {
    try { await togglePushNotifications(); } catch { showToast('No pudimos activar los avisos. Revisa los ajustes de tu dispositivo o pide ayuda.'); }
  }
  if (action === 'change-password') {
    navigate('password');
  }
  if (action === 'voice-notes') startVoiceDictation(target.dataset.target);
  if (action === 'voice-stop') stopVoiceDictation();
  if (action === 'install-app') {
    if (!deferredInstallPrompt) { showToast('Abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.'); return; }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    render();
  }
});
app.addEventListener('submit', onSubmit);
window.addEventListener('hashchange', () => {
  if (location.hash.includes('type=recovery')) currentRoute = 'password';
  else currentRoute = location.hash.replace('#/', '') || 'home';
  render();
});
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; render(); });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; showToast('Mi Salud se instaló correctamente.'); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => showToast('No se pudo preparar el modo sin conexión.'));
}
render();
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') currentRoute = 'password';
    window.setTimeout(() => { void applySession(session); }, 0);
  });
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) appError = safeErrorMessage(error);
    return applySession(data?.session || null);
  }).catch((error) => {
    appError = safeErrorMessage(error); sessionReady = true; render(); showToast(appError);
  });
}
