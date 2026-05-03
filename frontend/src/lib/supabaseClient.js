import { createClient } from '@supabase/supabase-js';

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/\/+$/, '');
}

/**
 * Resolve URL + anon/publishable key from Vite env (several common names).
 * @returns {{ url: string, key: string, issue: 'none' | 'missing_url' | 'missing_key' | 'secret_key_not_for_browser' | 'unconfigured' }}
 */
export function resolveSupabaseEnv() {
  const url = normalizeUrl(
    import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || ''
  );
  const keyRaw =
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';
  const key = typeof keyRaw === 'string' ? keyRaw.trim() : '';

  if (!url && !key) return { url: '', key: '', issue: 'unconfigured' };
  if (!url) return { url: '', key, issue: 'missing_url' };
  if (!key) return { url, key: '', issue: 'missing_key' };
  // Server-only key; PostgREST expects publishable/anon in the browser.
  if (key.startsWith('sb_secret_')) {
    return { url, key: '', issue: 'secret_key_not_for_browser' };
  }
  return { url, key, issue: 'none' };
}

const ISSUE_MESSAGES = {
  missing_url: 'Supabase URL is missing. Set PUBLIC_SUPABASE_URL (or VITE_SUPABASE_URL) in frontend/.env',
  missing_key:
    'Supabase anon/publishable key is missing. Set PUBLIC_SUPABASE_PUBLISHABLE_KEY or PUBLIC_SUPABASE_ANON_KEY in frontend/.env',
  secret_key_not_for_browser:
    'The key in .env looks like a secret key (sb_secret_…). Use the publishable key (sb_publishable_…) or the legacy anon JWT (starts with eyJ…) from Project Settings → API — never the secret key in the browser.',
  unconfigured: ''
};

export function supabaseEnvIssueMessage(issue) {
  if (!issue || issue === 'none' || issue === 'unconfigured') return '';
  return ISSUE_MESSAGES[issue] || issue;
}

/**
 * Browser client for public (anon / publishable) key only.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabaseBrowserClient() {
  const { url, key, issue } = resolveSupabaseEnv();
  if (issue !== 'none' || !url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
