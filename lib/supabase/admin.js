import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Privileged Supabase client using the service-role key. It bypasses Row Level
// Security, so it must ONLY be imported from server code that has already
// verified the caller is the admin (see lib/adminAuth.js). Never expose this to
// the browser and never put the key in a NEXT_PUBLIC_ var.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL). Add it to .env.local and Vercel.'
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
