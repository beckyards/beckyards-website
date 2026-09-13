import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET /api/admin/messages?filter=inbox|archived|all
export async function GET(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const filter = new URL(request.url).searchParams.get('filter') || 'inbox';

  let query = supabase
    .from('messages')
    .select('id, name, phone, email, address, message, created_at, read_at, archived')
    .order('created_at', { ascending: false })
    .limit(300);

  if (filter === 'inbox') query = query.eq('archived', false);
  else if (filter === 'archived') query = query.eq('archived', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unread = (data || []).filter((m) => !m.read_at && !m.archived).length;
  return NextResponse.json({ items: data || [], unread, filter });
}

// PATCH { id, action: 'read' | 'unread' | 'archive' | 'unarchive' }
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const { id, action } = body || {};
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const patch = {
    read: { read_at: new Date().toISOString() },
    unread: { read_at: null },
    archive: { archived: true, read_at: new Date().toISOString() },
    unarchive: { archived: false },
  }[action];

  if (!patch) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  const { error } = await supabase.from('messages').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE { id } — permanent. The UI confirms first; use Archive for the reversible path.
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body?.id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const { error } = await supabase.from('messages').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
