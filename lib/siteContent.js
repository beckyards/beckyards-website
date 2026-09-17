import { createClient } from '@supabase/supabase-js';

// Sections that can be overridden from the admin area. Each maps to one row in
// the `site_content` table whose `value` (jsonb) replaces a hardcoded default —
// either a list (work/services/offers, from lib/work.js etc.) or a page's own
// copy object (home/about/contact/... , from lib/pageContent.js).
export const CONTENT_KEYS = [
  'services',
  'programs',
  'home',
  'contact',
  'promoBar',
  'footer',
  'terms',
  'about',
  'portfolio',
];

let cached;
function readClient() {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key
    ? createClient(url, key, { auth: { persistSession: false } })
    : null;
  return cached;
}

// Server-only. Returns the admin-edited value for `key`, or `fallback` (the
// built-in default) when there is no row yet, env vars are missing, or anything
// goes wrong. The public site must keep rendering even if Supabase is
// unreachable, so every failure path returns the fallback rather than throwing.
export async function getContent(key, fallback) {
  if (!CONTENT_KEYS.includes(key)) return fallback;

  const supabase = readClient();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data || data.value == null) return fallback;
    return data.value;
  } catch {
    return fallback;
  }
}
