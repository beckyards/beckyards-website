import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';

// TEMPORARY diagnostic route. Bypasses supabase-js/postgrest-js entirely and
// makes a raw fetch() to Supabase's REST API with the exact same URL/key our
// real queries use, so a thrown error keeps its real stack trace (postgrest-js
// normally strips this down to a bare { message } object). Delete this file
// once the production ByteString bug is found.
export async function GET() {
  const { error: authError } = await requireAdminClient();
  if (authError) return authError;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const report = {
    urlLength: url?.length,
    keyLength: key?.length,
    urlHasNonAscii: url ? /[^\x00-\x7F]/.test(url) : null,
    keyHasNonAscii: key ? /[^\x00-\x7F]/.test(key) : null,
  };

  try {
    const res = await fetch(`${url}/rest/v1/mowing_clients?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const text = await res.text();
    return NextResponse.json({ ...report, ok: true, status: res.status, bodyPreview: text.slice(0, 300) });
  } catch (err) {
    return NextResponse.json(
      {
        ...report,
        caughtRawFetch: true,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause
          ? { name: err.cause.name, message: err.cause.message, stack: err.cause.stack, code: err.cause.code }
          : null,
      },
      { status: 500 }
    );
  }
}
