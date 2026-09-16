import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../../lib/adminAuth';

const TMP_BUCKET = 'enhance-tmp';

// Step 1 of the Enhance flow: hand the browser a signed URL it can upload the
// ORIGINAL photo to directly (Supabase, not our own server). Vercel's Node
// serverless functions cap an incoming request body at ~4.5 MB, which a real
// camera or phone photo blows past easily — routing the raw file straight to
// Supabase Storage sidesteps that limit entirely, since it never passes
// through our function. The actual processing route downloads it from here
// with the service-role key (no such limit applies server-to-Supabase) and
// deletes it once done.
export async function POST() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const { data, error } = await supabase.storage.from(TMP_BUCKET).createSignedUploadUrl(path);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}

// Called when a photo is discarded (or the tab closes) without ever being
// saved, so its temp original doesn't sit in enhance-tmp indefinitely. Best
// effort — a rare miss here is harmless, just an orphaned temp file.
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }
  if (!body?.path || typeof body.path !== 'string') {
    return NextResponse.json({ error: 'Missing path.' }, { status: 400 });
  }

  await supabase.storage.from(TMP_BUCKET).remove([body.path]).catch(() => {});
  return NextResponse.json({ ok: true });
}
