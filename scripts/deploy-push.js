import { spawnSync } from 'node:child_process';
import { createECDH } from 'node:crypto';
import { chmodSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin, stdout } from 'node:process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const clientEnvPath = resolve(root, '.env.local');
const pushEnvPath = resolve(root, '.env.push.local');

function readEnv(path) {
  const text = readFileSync(path, 'utf8');
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return [];
    const separator = trimmed.indexOf('=');
    if (separator < 1) return [];
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[trimmed.slice(0, separator), value]];
  }));
}

function fail(message) {
  console.error(`Configuración pendiente: ${message}`);
  process.exit(1);
}

async function requestAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    fail('abre una terminal interactiva y vuelve a ejecutar npm run deploy:push para ingresar el token nuevo de forma oculta.');
  }
  stdout.write('Personal Access Token nuevo de Supabase (entrada oculta; no lo pegues en el chat): ');
  stdin.setRawMode(true);
  stdin.resume();
  let token = '';
  return new Promise((resolveToken, rejectToken) => {
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const byte of chunk) {
        if (byte === 3) {
          cleanup();
          rejectToken(new Error('Ingreso cancelado.'));
          return;
        }
        if (byte === 13 || byte === 10) {
          cleanup();
          resolveToken(token);
          return;
        }
        if (byte === 127 || byte === 8) token = token.slice(0, -1);
        else if (byte >= 32 && byte <= 126) token += String.fromCharCode(byte);
      }
    };
    stdin.on('data', onData);
  }).then((token) => {
    if (!token.startsWith('sbp_') || token.length < 20) fail('el token no tiene el formato esperado. Revoca ese token y crea uno nuevo en Supabase → Account → Access Tokens.');
    return token;
  });
}

let clientEnv;
let pushEnv;
try {
  clientEnv = readEnv(clientEnvPath);
  pushEnv = readEnv(pushEnvPath);
} catch {
  fail('No se pudo leer .env.local o .env.push.local. No se imprimieron sus contenidos.');
}

const required = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'REMINDER_CRON_SECRET'];
for (const name of required) {
  if (!pushEnv[name]) fail(`falta ${name} en .env.push.local.`);
}
if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  fail('faltan la URL o la clave publicable de Supabase en .env.local.');
}
if (pushEnv.VAPID_SUBJECT.includes('REEMPLAZAR') || !/^mailto:[^@\s]+@[^@\s]+$/.test(pushEnv.VAPID_SUBJECT)) {
  fail('reemplaza VAPID_SUBJECT por un correo real, por ejemplo mailto:soporte@tu-dominio.com.');
}
if (clientEnv.VAPID_PUBLIC_KEY !== pushEnv.VAPID_PUBLIC_KEY) {
  fail('la clave pública VAPID de .env.local y .env.push.local no coincide.');
}

try {
  const publicBytes = Buffer.from(pushEnv.VAPID_PUBLIC_KEY, 'base64url');
  const privateBytes = Buffer.from(pushEnv.VAPID_PRIVATE_KEY, 'base64url');
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(privateBytes);
  if (publicBytes.length !== 65 || privateBytes.length !== 32 || !ecdh.getPublicKey(undefined, 'uncompressed').equals(publicBytes)) {
    fail('el par de claves VAPID no coincide o tiene un formato incorrecto.');
  }
  chmodSync(pushEnvPath, 0o600);
  if ((statSync(pushEnvPath).mode & 0o077) !== 0) fail('no se pudieron restringir los permisos de .env.push.local.');
} catch {
  fail('no se pudo validar el par VAPID. Genera uno nuevo y no compartas la clave privada.');
}

let projectRef;
try {
  const projectUrl = new URL(clientEnv.NEXT_PUBLIC_SUPABASE_URL);
  if (!projectUrl.hostname.endsWith('.supabase.co')) throw new Error('invalid project host');
  projectRef = projectUrl.hostname.split('.')[0];
} catch {
  fail('la URL del proyecto Supabase no parece válida.');
}

function runSupabase(args, task, accessToken) {
  console.log(`${task}…`);
  const result = spawnSync('npx', ['supabase', ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
  });
  if (result.error || result.status !== 0) {
    fail(`falló «npx supabase ${args[0]}». No se mostró ningún valor secreto; revisa tu sesión del CLI y vuelve a intentar.`);
  }
}

const accessToken = await requestAccessToken();
runSupabase(['projects', 'list'], 'Comprobando acceso a Supabase', accessToken);
runSupabase(['secrets', 'set', '--env-file', '.env.push.local', '--project-ref', projectRef], 'Guardando secretos de avisos en Supabase', accessToken);
runSupabase(['functions', 'deploy', 'dispatch-reminders', '--project-ref', projectRef], 'Publicando el servicio de recordatorios', accessToken);
console.log('Servicio publicado. El token de acceso no se guardó localmente. Falta crear en Vault el secreto mi_salud_cron_secret y programar push-cron.example.sql.');
