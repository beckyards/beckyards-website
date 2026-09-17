import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../../lib/adminAuth';

const TMP_BUCKET = 'enhance-tmp';

// Step 1 of the Images upload flow: hand the browser a signed URL it can
// upload the ORIGINAL photo to directly (Supabase, not our own server).
// Vercel's Node serverless functions cap an incoming request body at
// ~4.5 MB, which a real phone photo blows past easily — this was the actual
// cause of phone uploads silently failing even after the HEIC/wasm fix.
// Routing the raw file straight to Supabase Storage sidesteps that limit
// entirely, since it never passes through our function. The finalize route
// (/api/admin/media POST) downloads it from here with the service-role key
// (no such limit applies server-to-Supabase), converts/validates it, and
// deletes the temp copy once it's safely in the public `media` bucket. Reuses
// the same `enhance-tmp` scratch bucket the Enhance tool already uses for
// this exact purpose, rather than provisioning a second one.
export async function POST() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const path = `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const { data, error } = await supabase.storage.from(TMP_BUCKET).createSignedUploadUrl(path);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
