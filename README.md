# Mi Salud · Serenidad

PWA en español para registro de salud, tratamientos, citas y ayuda, con interfaz mobile-first y controles accesibles. Estructura principal:

- `app.js`, `styles.css`, `index.html`: interfaz y rutas.
- `src/lib/`: cliente Supabase y capa de acceso a datos.
- `src/config/`: datos configurables de emergencia.
- `public/`: iconos, manifiesto, service worker y encabezados de hosting.
- `supabase/migrations/`: esquema, alineación y políticas.
- `supabase/functions/`: envío de notificaciones push en servidor.

## Ejecutar y compilar

Node.js 20.19+ (Vite actual):

- `npm start`: desarrollo local en `http://127.0.0.1:5173`.
- `npm run build`: genera `dist/`.
- `npm run preview`: previsualiza `dist/`.

El service worker, micrófono, push e instalación requieren `localhost` o HTTPS. Publica el contenido de `dist/` en un hosting estático con HTTPS y configura los encabezados de seguridad de `public/_headers` en el proveedor elegido.

## Supabase y secretos

La aplicación usa el cliente oficial `@supabase/supabase-js`. Vite lee del archivo local ignorado por Git únicamente `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `VAPID_PUBLIC_KEY`. La clave publicable se distribuye al navegador por diseño; Auth y RLS son los controles de autorización. `SUPABASE_SECRET_KEY` no está en el bundle ni se usa en el cliente.

1. Confirma que `.env.local` permanece ignorado por Git. En el Dashboard de Supabase, rota la clave secreta privilegiada antes de cargar datos reales; no la compartas ni la añadas a `VITE_*` o `NEXT_PUBLIC_*`.
2. En un proyecto nuevo, ejecuta primero `001_init.sql`; si las tablas ya existen con el esquema proporcionado, no vuelvas a ejecutar esa migración inicial.
3. Haz backup y revisa/aplica `002_schema_alignment_security.sql` y `003_push_reminders.sql`. La segunda migration añade columnas faltantes, `symptom_episodes`, la RPC transaccional del día, y políticas de integridad entre padres e hijos; la tercera necesita que no existan claves de recordatorio duplicadas.
4. Activa Supabase Auth por correo, desactiva el registro público si solo el administrador crea cuentas, configura recuperación de contraseña y URLs permitidas para localhost y producción. Aplica rate limits/CAPTCHA según el riesgo del proyecto.
5. Prueba RLS con dos cuentas de prueba antes de usar cuentas reales. Las pantallas sólo cargan datos tras validar sesión. Los usuarios no pueden cambiar `must_change_password` desde el navegador.

El cliente nunca crea recordatorios arbitrarios; la tabla `reminders` queda de lectura para el usuario y la procesa la función del servidor. La clave privilegiada debe permanecer únicamente en los secretos administrados de Supabase.

## Notificaciones push

Push requiere HTTPS, permiso explícito, claves VAPID, configuración de función y una tarea programada. Sin estos pasos, la suscripción no enviará avisos.

1. Las claves VAPID no se compran ni se copian de Supabase: genera un par propio en una terminal privada con `npx --yes web-push generate-vapid-keys`. El comando muestra una clave pública y otra privada. No pegues la privada en el repositorio ni en esta conversación.
2. La clave pública está en `VAPID_PUBLIC_KEY` de `.env.local`. El par nuevo y el secreto de cron se guardan localmente en `.env.push.local`, un archivo ignorado por Git y protegido con permisos del propietario. Allí reemplaza el valor de ejemplo de `VAPID_SUBJECT` por un correo real de soporte, con prefijo `mailto:`.
3. En Supabase Dashboard → Edge Functions → Secrets, carga `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `REMINDER_CRON_SECRET` desde ese archivo. No compartas sus valores. Supabase proporciona `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_URL` al runtime Edge; no copies la clave privilegiada de `.env.local`.
4. Despliega `dispatch-reminders` con la configuración de `supabase/config.toml` y habilita `pg_cron`, `pg_net` y Vault.
5. Guarda el mismo secreto cron en Vault con nombre `mi_salud_cron_secret`. Revisa y ejecuta `supabase/push-cron.example.sql`, sustituyendo sólo el project ref, para invocar la función cada cinco minutos.
6. Reconstruye y publica `dist/` en HTTPS. Inicia sesión en la app, activa avisos y prueba el envío con una cuenta de prueba.

El aviso de push es genérico por privacidad y no contiene nombre de medicamento ni detalles clínicos. El sistema operativo/navegador puede retrasar o no entregar notificaciones; no son alarmas médicas ni una vía de emergencia.

## Audio y privacidad

«Dictar notas» usa Web Speech API si el navegador la ofrece; la app no graba ni guarda un archivo de audio. El proveedor del navegador puede procesar el audio según su política. El texto reconocido se muestra para que la persona lo revise antes de guardarlo.

La sesión la administra Supabase Auth con flujo PKCE. La información clínica se guarda en Supabase según RLS, no en `localStorage` ni en la caché del service worker. El cliente carga el perfil, síntomas, registros diarios/síntomas, episodios, medicinas/horarios/tomas, citas, preguntas, recordatorios, dispositivo y suscripciones push. Exportar un reporte crea un archivo local a solicitud del usuario.

## Contactos de emergencia

La app muestra 102 (ambulancia MINSA Managua), 128 (Cruz Roja), 1800-1911 (Hospital Vivian Pellas), 118 (Policía) y 115 (Bomberos) según los datos facilitados por el usuario. No se encontró una fuente oficial verificable en esta auditoría para confirmar su vigencia o alcance. Antes de publicar, confirma cada número con MINSA y las entidades correspondientes; los datos son editables en `src/config/emergencies.js`.

## Estado y límites de producción

La app ya tiene integración de Auth y persistencia orientada a RLS. El usuario aplicó las migraciones, pero **no se puede considerar lista para producción todavía**: faltan configurar/probar Auth y las redirecciones con cuentas de prueba, desplegar y verificar Edge Function + VAPID + cron para que Push entregue avisos, y probar RLS con dos usuarios. Tampoco hay pruebas de penetración, revisión clínica/regulatoria, monitorización/backup aprobados ni validación legal de privacidad. No uses datos médicos reales hasta completar esas verificaciones con el administrador de Supabase y responsables clínicos.

No hay chatbot de diagnóstico. La aplicación registra y organiza información; no sustituye atención profesional. Ante una emergencia, usa un número local confirmado y busca ayuda presencial.

## Auditoría inicial de Stitch

Se auditaron las 13 páginas `code.html` y 12 capturas disponibles en `stitch_salud_mayor_m_vil/`. Eran maquetas independientes con datos de demostración, acciones simuladas, CDN/fuentes e imágenes externas. La app conserva el diseño cálido y accesible, unifica rutas, sustituye ejemplos por datos de la cuenta autenticada y añade estados de error/privacidad.
