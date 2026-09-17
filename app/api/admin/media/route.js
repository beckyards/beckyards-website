import { NextResponse } from 'next/server';
import heicConvert from 'heic-convert';
import { requireAdminClient } from '../../../../lib/adminAuth';
import {
  MEDIA_BUCKET as BUCKET,
  MEDIA_MAX_BYTES as MAX_BYTES,
  MEDIA_ALLOWED_TYPES as ALLOWED,
  baseNameFrom,
  extFrom,
  isHeicFile,
  isSafeObjectName,
  uploadToMedia,
} from '../../../../lib/mediaUpload';

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || [])
    .filter((row) => row.id && row.name && !row.name.startsWith('.'))
    .map((row) => ({
      name: row.name,
      url: supabase.storage.from(BUCKET).getPublicUrl(row.name).data.publicUrl,
      size: row.metadata?.size ?? null,
      createdAt: row.created_at ?? null,
    }));

  return NextResponse.json({ items });
}

const TMP_BUCKET = 'enhance-tmp';

// The original photo travels as a JSON reference to a file already sitting in
// the `enhance-tmp` scratch bucket, not as a multipart upload — see
// /api/admin/media/upload-url for why: Vercel's Node serverless functions cap
// an incoming request body around 4.5 MB, which a real phone photo exceeds
// easily, so the browser uploads the raw file straight to Supabase first
// (using a signed URL from that route) and this route just downloads it
// server-side (no such limit there) before validating/converting it into the
// public `media` bucket.
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const files = Array.isArray(body?.files) ? body.files : [];
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided.', uploaded: [], errors: [] }, { status: 400 });
  }

  const uploaded = [];
  const errors = [];

  for (const file of files) {
    const tmpPath = file?.tmpPath;
    const name = file?.name || 'image.jpg';
    const type = file?.type || '';

    if (!tmpPath || typeof tmpPath !== 'string') {
      errors.push(`${name}: missing uploaded file reference.`);
      continue;
    }

    // iPhones upload photos as HEIC by default. Some mobile browsers report
    // an empty file.type for it, so this can't allowlist-check by MIME type
    // alone — it's checked here (before the allowlist) so a real HEIC photo
    // gets converted below instead of rejected as "not an allowed type".
    const heic = isHeicFile(name, type);
    if (!heic && type && !ALLOWED.includes(type)) {
      errors.push(`${name}: ${type} is not an allowed image type.`);
      continue;
    }

    try {
      const { data: fileData, error: downloadError } = await supabase.storage.from(TMP_BUCKET).download(tmpPath);
      if (downloadError) {
        errors.push(`${name}: couldn't read the uploaded file — it may have expired. Try again.`);
        continue;
      }
      let buffer = Buffer.from(await fileData.arrayBuffer());

      if (buffer.length > MAX_BYTES) {
        errors.push(`${name}: larger than 25 MB.`);
        continue;
      }

      let contentType = type || 'application/octet-stream';
      let outName = name;

      if (heic) {
        buffer = Buffer.from(await heicConvert({ buffer, format: 'JPEG', quality: 0.92 }));
        contentType = 'image/jpeg';
        outName = outName.replace(/\.(heic|heif)$/i, '.jpg');
      }

      const base = baseNameFrom(outName);
      const ext = extFrom(outName);
      const uploadResult = await uploadToMedia(supabase, buffer, base, ext, contentType);
      uploaded.push(uploadResult);
      supabase.storage.from(TMP_BUCKET).remove([tmpPath]).catch(() => {});
    } catch (error) {
      const prefix = heic ? 'Could not convert this iPhone photo — ' : '';
      errors.push(`${name}: ${prefix}${error.message}`);
    }
  }

  const status = uploaded.length > 0 ? 200 : 400;
  return NextResponse.json({ uploaded, errors }, { status });
}

// PATCH { from, to } — rename a file in place (so "tell me which photo to
// use" can be a name you just typed, not a camera filename). `to` keeps
// whatever extension `from` had if none is given.
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const from = body?.from;
  let to = (body?.to || '').trim();
  if (!from || typeof from !== 'string') {
    return NextResponse.json({ error: 'Missing source file name.' }, { status: 400 });
  }
  if (!to) {
    return NextResponse.json({ error: 'Enter a name.' }, { status: 400 });
  }

  if (!to.includes('.')) {
    to = `${to}.${extFrom(from)}`;
  }
  to = to.toLowerCase().replace(/\s+/g, '-');

  if (!isSafeObjectName(to)) {
    return NextResponse.json(
      { error: 'Use letters, numbers, dashes and a single file extension only.' },
      { status: 400 }
    );
  }
  if (to === from) {
    return NextResponse.json({ ok: true, name: from });
  }

  const { error } = await supabase.storage.from(BUCKET).move(from, to);
  if (error) {
    const msg = /exist/i.test(error.message || '') ? 'That name is already taken.' : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    name: to,
    url: supabase.storage.from(BUCKET).getPublicUrl(to).data.publicUrl,
  });
}

export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = body?.name;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing file name.' }, { status: 400 });
  }

  const { error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
