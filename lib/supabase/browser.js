import { createBrowserClient } from '@supabase/ssr';

// Supabase client for use inside Client Components (the admin login form and the
// interactive admin screens). Reads the session from the browser cookie jar that
// the server client / proxy keep in sync.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
