# SPEC: App de seguimiento de salud (una sola persona)

> Leer este archivo completo ANTES de escribir código. Trabajar por fases y detenerse al final de cada una.

## 1. Contexto

PWA de acompañamiento para UNA persona adulta mayor que está pendiente de recibir un marcapasos (todavía no lo tiene). Objetivo: que registre cada día cómo se siente, no pierda ningún detalle antes de su cita médica y pueda mostrar un reporte PDF al doctor. Además, citas y medicamentos con recordatorios.

- Idioma de la interfaz: **español (Nicaragua)**. Zona horaria: `America/Managua`.
- Usuario poco técnico: letra grande (mínimo 18px), botones grandes (mínimo 48px de alto), alto contraste, máximo 3 toques por acción, sin menús escondidos.
- Cero tecnicismos en pantalla. Mensajes de error amables y claros.

## 2. Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, configurado como PWA instalable
- Supabase: Auth + Postgres (el esquema ya está en `001_init.sql` + `002_catalogo_episodios.sql`, NO modificarlos sin avisarme)
- El catálogo de síntomas, las alertas y su respaldo médico están en `FUENTES_Y_CATALOGO.md`. Léelo también.
- `@supabase/supabase-js` y `@supabase/ssr`
- FullCalendar (calendario táctil, vistas mes y lista)
- `@react-pdf/renderer` (reporte PDF)
- Despliegue en Vercel
- Diseño de pantallas: **MCP de Stitch** (ver sección 6)

## 3. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # sb_publishable_...
SUPABASE_SECRET_KEY=                    # sb_secret_... SOLO servidor
```

- Usar las API keys NUEVAS de Supabase. **NO usar** `anon key` ni `service_role key` (legacy, serán retiradas en 2027).
- Crear `.env.example` con los nombres vacíos. Nunca escribir valores reales en código, README ni commits.
- `SUPABASE_SECRET_KEY` solo en código de servidor (Route Handlers, Server Actions). Jamás importarla en componentes cliente ni con prefijo `NEXT_PUBLIC_`.

## 4. Reglas de seguridad (obligatorias)

1. **Sin registro público.** No crear página ni endpoint de sign-up. El usuario lo crea el administrador desde el panel de Supabase.
2. **Cambio obligatorio de contraseña.** Si `profiles.must_change_password = true`, un middleware redirige a `/cambiar-contrasena` desde cualquier ruta. Tras cambiarla con `supabase.auth.updateUser({ password })`, se actualiza el flag a `false`. Validar mínimo 10 caracteres.
3. Todas las rutas excepto `/login` y `/recuperar` requieren sesión.
4. Las consultas del cliente siempre pasan por RLS. Nunca usar la secret key para leer datos que el usuario podría leer con su sesión.
5. Notificaciones y correos **sin datos sensibles**: texto genérico ("Tienes un recordatorio"), nunca nombres de medicinas ni síntomas.
6. No registrar (console.log) datos de salud ni tokens.
7. Recuperación de contraseña por correo.
8. Cabeceras de seguridad básicas en `next.config`.

## 5. Aviso permanente de seguridad

Banner fijo y visible en todas las pantallas (pie o cabecera), no descartable:

> "Si tienes desmayo, dolor fuerte de pecho o falta de aire intensa, llama a emergencias. Esta app no reemplaza la atención médica."

### Alertas al guardar un registro

Las alertas salen de la base de datos, NO del código (así el médico puede ajustarlas sin programar). Para cada síntoma marcado con severidad `s`:

- Si `emergency_alert_min_severity` no es NULL y `s >= emergency_alert_min_severity` → **pantalla de emergencia**: botón grande "Llamar a emergencias" (`tel:`), botón "Llamar a mi contacto" (`profiles.emergency_contact_phone`) y el aviso permanente.
- Si no, y `doctor_alert_min_severity` no es NULL y `s >= doctor_alert_min_severity` → **aviso amarillo**: "Esto conviene contárselo a tu médico pronto" + botón "Agregar a mis preguntas para el doctor".
- Si no, no se muestra alerta (el síntoma igual queda en el reporte).

**Reglas combinadas** (se evalúan por registro del día y por episodio; constantes en `config/alerts.ts`):
1. Pulso medido por debajo de `profiles.pulse_low_threshold` **y** al menos uno de: mareo, casi desmayo, desmayo, dolor de pecho, falta de aire (cualquier severidad) → pantalla de emergencia.
2. Palpitaciones (severidad 2 o más) **y** mareo, casi desmayo o debilidad el mismo día → pantalla de emergencia.
3. Aumento de peso mayor o igual a 0.9 kg respecto al día anterior, o a 2.3 kg en 7 días → aviso amarillo.
4. Pulso bajo sin síntomas → solo una nota suave ("Tu pulso estuvo bajo. Anota si te sientes mal."); sin alarma. Se resalta en el reporte.

Los textos de alerta son informativos. La app **no diagnostica** ni dice qué tiene la persona.

### Si hubo desmayo, casi desmayo o caída
Al marcar "Desmayo", "Casi me desmayo" o "Caída o golpe", ofrecer un botón grande: "¿Quieres anotar los detalles?" que abre la pantalla de **Episodio** (sección 6, pantalla 10).

## 6. Flujo de trabajo con Stitch (diseño primero)

1. Verificar que el MCP de Stitch responde (listar sus herramientas).
2. Crear en Stitch un proyecto "Salud App" y generar estas pantallas, móvil primero, tema claro, alto contraste, tipografía grande, paleta calmada (azules/verdes suaves):
   1. Login
   2. Cambiar contraseña (primer ingreso)
   3. Inicio: "¿Cómo te sientes hoy?" con 5 caritas, próxima cita, medicinas de hoy
   4. Registro diario: ánimo, "¿pudiste hacer tus actividades normales hoy?" (3 opciones), síntomas agrupados por categoría con severidad (leve/media/fuerte), botón "Otro: escribir qué pasó", pulso, presión, peso, sueño, y un cuadro grande "¿Qué pasó hoy? Cuéntalo con tus palabras" (con dictado por voz)
   5. Historial por día
   6. Calendario de citas + formulario de cita
   7. Medicamentos + botón "Ya la tomé" / "Omitir"
   8. Preguntas para el doctor
   9. Reporte: elegir rango de fechas y descargar PDF
   10. Registrar un episodio (desmayo, casi desmayo, caída, etc.): hora, cuánto duró, qué hacía antes (de pie, caminando, al levantarme...), posibles detonantes (comida reciente, calor, mucho tiempo de pie...), señales de aviso (sudor frío, vista borrosa...), cómo me sentí después, si me golpeé, pulso y presión si pude medirlos, qué vio quien estaba presente, y "cuéntalo con tus palabras". Todo con botones grandes, y todo opcional salvo la hora y el tipo.
3. **DETENERSE y mostrarme las pantallas para aprobarlas** antes de convertirlas a código.
4. Convertir los diseños aprobados a componentes React reutilizables.

## 7. Funcionalidades por fase

Al terminar cada fase: ejecutar lint y build, listar lo que probé, y esperar mi confirmación.

### Fase 1: Núcleo
- Login, recuperación y cambio obligatorio de contraseña
- Inicio con caritas (1 muy mal ... 5 muy bien)
- Registro diario: un registro por día (upsert por `user_id + entry_date`), editable el mismo día
- Síntomas desde `symptom_types`, agrupados por `category`, con `helper_text` como ayuda y severidad 1-3 (leve/media/fuerte) y hora opcional. Mostrar solo `applies_when = 'always'`, o también `'post_implant'` si `profiles.pacemaker_implanted = true`. Solo `is_active = true`.
- **Síntoma libre ("Otro: escribir qué pasó")**: guardar en `entry_symptoms` con `symptom_type_id = NULL` y `custom_label` con lo que escribió, más severidad. Siempre visible al final de la lista.
- Cada síntoma tiene su campo de nota opcional (`entry_symptoms.notes`).
- `daily_entries`: `overall_feeling`, `daily_activity` (1 todo normal, 2 con dificultad, 3 casi nada), pulso, presión, `weight_kg`, `sleep_hours` (todos opcionales) y `notes` (cuadro "¿Qué pasó hoy?"; dictado por voz del teléfono con un campo de texto normal, sin librerías).
- Ayuda en pantalla para el pulso: "Mídelo sentado y en reposo, durante un minuto." Y para el peso: "Pésate cada mañana, después de orinar y antes de desayunar."
- **Episodios** (`symptom_episodes`): crear, editar y listar. Se ofrecen desde el registro diario y desde un botón fijo en el inicio ("Me pasó algo ahora"). Valores sugeridos para `triggers`, `warning_signs` y `after_effects` en los comentarios de `002_catalogo_episodios.sql`; mostrarlos en español sencillo.
- Alertas según la sección 5.
- Historial por día (incluye los episodios de cada día)
- **Reporte PDF** por rango de fechas (por defecto, desde la última cita hasta hoy). Encabezado con nombre, fechas y contacto de emergencia. Contenido, en este orden:
  1. **Resumen de una página**: días registrados, número de desmayos, casi desmayos y caídas, síntomas más frecuentes, días con "casi nada" de actividad, y si hubo más o menos síntomas que en el periodo anterior de igual duración.
  2. **Episodios** (tabla): fecha y hora, tipo, duración, qué hacía antes, detonantes, señales de aviso, cómo se sintió después, lesión, pulso/presión, testigo, descripción. Resaltar desmayos y episodios con lesión.
  3. **Patrones**: en qué momento del día ocurren los síntomas y qué detonantes o posturas se repiten (conteos simples, sin interpretar).
  4. **Pulso, presión y peso**: tabla y gráfico simple por día; resaltar valores de pulso por debajo de `profiles.pulse_low_threshold`.
  5. **Frecuencia de cada síntoma** con severidad máxima, incluidos los síntomas escritos libremente.
  6. **Línea de tiempo día por día**: ánimo, actividad, síntomas y las notas libres de la persona, tal como las escribió.
  7. **Medicamentos**: lista completa con dosis, fecha de inicio y fecha de fin (así el médico ve cambios recientes) y cumplimiento (Fase 3).
  8. **Preguntas para el doctor** pendientes (Fase 2).
  Pie de página: "Reporte generado por la persona a partir de sus propios registros. No es un diagnóstico."
- PWA instalable (manifest, íconos, service worker básico)

### Fase 2: Citas
- CRUD de citas, calendario interactivo (FullCalendar), vista lista
- Preguntas para el doctor (con opción de asociarlas a una cita); salen en el PDF
- Exportar cita a `.ics`
- Mostrar "próxima cita" en el inicio

### Fase 3: Medicamentos y recordatorios
- CRUD de medicamentos con horarios y días de la semana
- Generar `medication_intakes` pendientes del día; botones "Ya la tomé" / "Omitir"
- Cumplimiento de medicamentos en el PDF
- Recordatorios por notificación push (Web Push con VAPID) y correo (Resend) como respaldo
- Citas: recordar 1 día antes y 2 horas antes
- Un job programado procesa `reminders` vencidos (`sent_at is null`). **Usar Supabase `pg_cron` + endpoint protegido con `CRON_SECRET`** (el plan gratis de Vercel solo permite crons diarios, no cada 5 minutos).
- Nota: en iPhone el push solo funciona con la PWA instalada; por eso el correo de respaldo.

### Fase 4 (no implementar ahora)
- Pantalla de `device_info` y seguimiento postoperatorio

## 8. Criterios de calidad

- Accesibilidad: contraste AA, etiquetas en todos los campos, foco visible, tamaños táctiles grandes
- Funciona bien en un teléfono de gama baja y conexión lenta
- TypeScript estricto, sin `any` innecesarios
- Validar entradas (rangos razonables de pulso, presión, horas de sueño)
- Estados de carga y error en todas las pantallas
- README corto con: cómo correr local, variables de entorno, cómo crear el usuario, cómo desplegar

## 9. Lo que NO debes hacer

- No pedirme ni escribir mis llaves en el chat ni en archivos versionados
- No agregar registro público, redes sociales ni analítica de terceros
- No dar consejos médicos ni diagnósticos en la app; solo registrar y mostrar
- No cambiar el esquema SQL sin avisar
- No avanzar a la siguiente fase sin mi confirmación
