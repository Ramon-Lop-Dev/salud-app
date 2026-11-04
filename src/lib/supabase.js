import { createClient } from '@supabase/supabase-js';

const url = typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '';
const publishableKey = typeof __SUPABASE_PUBLISHABLE_KEY__ !== 'undefined' ? __SUPABASE_PUBLISHABLE_KEY__ : '';
export const vapidPublicKey = typeof __VAPID_PUBLIC_KEY__ !== 'undefined' ? __VAPID_PUBLIC_KEY__ : '';
export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: { headers: { 'X-Client-Info': 'mi-salud-pwa/0.2' } },
    })
  : null;

export function getSupabaseOrigin() {
  return isSupabaseConfigured ? new URL(url).origin : '';
}
