import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Supabase client bound to the request's cookie jar. Use from Server Components,
// Route Handlers, and server helpers. In a plain Server Component the cookie
// `set` calls are no-ops (React marks the store read-only) — that's fine, the
// proxy refreshes the session cookie on navigation. In Route Handlers the writes
// land on the response.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    }
  );
}
