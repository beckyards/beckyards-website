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

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Server-only. Returns the admin-edited value for `key`, or `fallback` (the
// built-in default) when there is no row yet, env vars are missing, or anything
// goes wrong. The public site must keep rendering even if Supabase is
// unreachable, so every failure path returns the fallback rather than throwing.
//
// When both the default and the saved value are plain objects (page copy), the
// result is { ...default, ...saved }, so a field added to the default later still
// shows up on a page whose content was saved before that field existed. The merge
// is shallow: a saved nested object or array replaces the default one whole.
// Arrays and other types are returned as saved.
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
    if (isPlainObject(fallback) && isPlainObject(data.value)) {
      return { ...fallback, ...data.value };
    }
    return data.value;
  } catch {
    return fallback;
  }
}
