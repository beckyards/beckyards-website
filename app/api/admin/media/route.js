import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import {
  MEDIA_BUCKET as BUCKET,
  MEDIA_MAX_BYTES as MAX_BYTES,
  MEDIA_ALLOWED_TYPES as ALLOWED,
  baseNameFrom,
  extFrom,
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

export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f) => typeof f === 'object' && f.size >= 0);
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
  }

  const uploaded = [];
  const errors = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: larger than 25 MB.`);
      continue;
    }
    if (file.type && !ALLOWED.includes(file.type)) {
      errors.push(`${file.name}: ${file.type} is not an allowed image type.`);
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base = baseNameFrom(file.name || 'image.jpg');
      const ext = extFrom(file.name || 'image.jpg');
      const { name, url } = await uploadToMedia(
        supabase,
        buffer,
        base,
        ext,
        file.type || 'application/octet-stream'
      );
      uploaded.push({ name, url });
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
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
