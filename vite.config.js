import { defineConfig, loadEnv } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function pwaPrecacheAssets() {
  let builtAssets = [];
  return {
    name: 'mi-salud-pwa-precache-assets',
    apply: 'build',
    generateBundle(_options, bundle) {
      builtAssets = Object.keys(bundle)
        .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
        .map((file) => `/${file}`);
    },
    closeBundle() {
      const workerPath = resolve(process.cwd(), 'dist/sw.js');
      const worker = readFileSync(workerPath, 'utf8');
      const assetsLiteral = JSON.stringify(builtAssets);
      writeFileSync(workerPath, worker.replace('const PRECACHE_ASSETS = [];', `const PRECACHE_ASSETS = ${assetsLiteral};`));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['NEXT_PUBLIC_', 'VAPID_PUBLIC_KEY']);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  const vapidPublicKey = env.VAPID_PUBLIC_KEY || '';

  return {
    plugins: [pwaPrecacheAssets()],
    define: {
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      // A Supabase publishable key is intended for browser use; authorization is enforced by Auth + RLS.
      __SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(publishableKey),
      __VAPID_PUBLIC_KEY__: JSON.stringify(vapidPublicKey),
    },
    server: {
      host: '127.0.0.1',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'DENY',
        'Permissions-Policy': 'camera=(), geolocation=(), payment=()',
      },
    },
    preview: { host: '127.0.0.1' },
  };
});
