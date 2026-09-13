import { NextResponse } from 'next/server';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';

// TEMPORARY diagnostic helper — surfaces the full exception (name, message,
// stack) directly in the API response so it shows up on the failing admin
// page, since Vercel's dashboard isn't showing console.error output to us.
// Remove this and the DIAGNOSTIC_ERROR symbol handling once the production
// ByteString bug is found and fixed.
function serializeError(err) {
  if (!err || typeof err !== 'object') return { message: String(err) };
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    cause: err.cause ? serializeError(err.cause) : undefined,
  };
}

// The single email allowed into the admin area. Everything else with a valid
// Supabase session is still rejected — this is the real authorization check,
// since the Supabase project could technically have other auth users.
export function getAdminEmail() {
  return (process.env.ADMIN_EMAIL || 'thebeckyards@gmail.com').toLowerCase();
}

// Returns the signed-in Supabase user if they are the admin, otherwise null.
// Use from the admin layout (redirect on null) and from every /api/admin route
// handler (401 on null).
export async function getAdminUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  let user;
  try {
    const result = await supabase.auth.getUser();
    if (result.error) {
      const err = new Error(`auth.getUser() returned an error: ${result.error.message}`);
      err.diagnosticStage = 'auth.getUser (returned error)';
      err.diagnosticDetail = serializeError(result.error);
      throw err;
    }
    user = result.data.user;
  } catch (err) {
    if (!err.diagnosticStage) {
      err.diagnosticStage = 'auth.getUser (threw)';
      err.diagnosticDetail = serializeError(err);
    }
    throw err;
  }

  if (!user || !user.email) return null;
  if (user.email.toLowerCase() !== getAdminEmail()) return null;
  return user;
}

const MISCONFIGURED_MESSAGE =
  "The admin panel isn't fully set up on this deployment yet: SUPABASE_SERVICE_ROLE_KEY " +
  '(the "service_role" secret key from Supabase → Project Settings → API) is missing from the ' +
  'environment. In Vercel: Settings → Environment Variables → add SUPABASE_SERVICE_ROLE_KEY and ' +
  'ADMIN_EMAIL → redeploy. This only affects the admin area — the public site is unaffected.';

// Every /api/admin/* route needs both a signed-in admin AND a working
// service-role Supabase client. Doing both checks here means a route never
// has to remember to wrap createAdminClient() in its own try/catch — if the
// service-role key is missing on a given deployment, the admin UI gets a
// real, readable message instead of a raw server crash it can't parse (which
// is what a blank "Cannot load this section" turned out to be).
export async function requireAdminClient() {
  let user;
  try {
    user = await getAdminUser();
  } catch (err) {
    return {
      error: NextResponse.json(
        { error: 'DIAGNOSTIC: ' + err.message, diagnosticStage: err.diagnosticStage, diagnosticDetail: err.diagnosticDetail },
        { status: 500 }
      ),
    };
  }
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 401 }) };
  }
  try {
    return { client: createAdminClient() };
  } catch (err) {
    return {
      error: NextResponse.json(
        { error: 'DIAGNOSTIC: createAdminClient threw: ' + err.message, diagnosticDetail: serializeError(err) },
        { status: 500 }
      ),
    };
  }
}
