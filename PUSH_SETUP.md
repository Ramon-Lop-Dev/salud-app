# Terminar de activar los avisos

El par VAPID actual ya está generado localmente. La clave pública está en `.env.local`; las claves de servidor y el secreto de cron están en `.env.push.local`. Este último archivo está ignorado por Git y tiene permisos privados. **No copies sus valores al chat ni los agregues al repositorio.** La clave VAPID privada que se compartió antes debe descartarse; no la uses.

## Lo único que necesitas hacer

1. Abre `.env.push.local` y reemplaza `VAPID_SUBJECT=mailto:REEMPLAZAR_POR_CORREO_DE_SOPORTE` con un correo real que controles, por ejemplo `mailto:soporte@tu-dominio.com`. Guarda el archivo.
2. Revoca el PAT que pudiera haber quedado escrito accidentalmente en `.env.local` y crea uno nuevo en Supabase → Account → **Access Tokens**. No uses la clave pública ni la clave secreta del proyecto. El PAT nuevo suele empezar por `sbp_`.
3. En una terminal interactiva, desde la carpeta del proyecto, ejecuta `npm run deploy:push`. El script te pedirá el PAT con entrada oculta. Escríbelo ahí; no lo pegues en el chat. Lo valida, carga los secretos a Edge Functions y despliega `dispatch-reminders`. El token solo se usa durante el proceso y no se guarda.
4. En el Dashboard del proyecto, habilita las extensiones `pg_cron`, `pg_net` y Vault. En Vault crea un secreto con nombre exacto `mi_salud_cron_secret`; como valor, usa `REMINDER_CRON_SECRET` de `.env.push.local` directamente en el Dashboard. No lo compartas por chat.
5. Abre `supabase/push-cron.example.sql` y ejecuta ese SQL **una sola vez** en el SQL Editor. Ya apunta al proyecto configurado.
6. Ejecuta `npm run build` y publica `dist/` en un sitio con HTTPS. Entra a la PWA, inicia sesión y pulsa **Activar avisos**. Acepta el permiso del dispositivo.

## Comprobación

Para probar, crea un medicamento con una toma cercana y deja activa la PWA en un dispositivo de prueba. La tarea corre cada cinco minutos; el navegador y el sistema operativo pueden retrasar los avisos. El texto enviado es genérico por privacidad y no incluye el nombre de la medicina. Push no sustituye alarmas médicas ni permite pedir ayuda de emergencia.

## Si el paso 4 falla

El CLI ya está instalado como dependencia de desarrollo. Revisa que el proyecto de Supabase corresponda a la URL de `.env.local` y que `VAPID_SUBJECT` ya no tenga el texto de reemplazo. Si el PAT no se acepta, revócalo y crea otro; no publiques los archivos locales de entorno para pedir ayuda.
