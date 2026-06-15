import { createClient } from '@supabase/supabase-js';

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, '');
}

function normalizeSupabaseUrl(value: string | undefined) {
  const cleaned = cleanEnvValue(value);

  if (!cleaned) {
    return undefined;
  }

  try {
    const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);

    // If someone accidentally pastes the Supabase dashboard/project URL,
    // convert it to the correct project API URL.
    const dashboardProjectMatch = url.pathname.match(/\/project\/([a-z0-9-]+)/i);
    if (url.hostname === 'supabase.com' && dashboardProjectMatch?.[1]) {
      return `https://${dashboardProjectMatch[1]}.supabase.co`;
    }

    // Supabase JS expects only https://PROJECT-REF.supabase.co.
    // If /rest/v1 or any other path was pasted, remove it.
    if (url.hostname.endsWith('.supabase.co')) {
      return `${url.protocol}//${url.hostname}`;
    }
  } catch {
    // Fall back to simple cleanup below.
  }

  return cleaned.replace(/\/rest\/v1.*$/i, '').replace(/\/+$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'missing-anon-key'
);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables.');
  }
}
