import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('aeration_signups')
    .select('id, name, phone, email, address, service_type, price, completed, sort_order, created_at')
    .order('sort_order', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}

// Three things this admin edits on the list:
//   { id, price }        -- what they're being charged
//   { id, completed }    -- done or not
//   { reorder: [ids] }   -- the full list, top to bottom, after a manual move
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  if (Array.isArray(body?.reorder)) {
    const ids = body.reorder;
    if (ids.length === 0 || ids.length > 500) {
      return NextResponse.json({ error: 'Invalid reorder list.' }, { status: 400 });
    }
    // First item keeps the highest sort_order (shown first, since the list
    // orders sort_order descending), counting down from there.
    const base = Date.now();
    const updates = ids.map((id, i) => ({ id, sort_order: base - i }));
    for (const u of updates) {
      const { error } = await supabase
        .from('aeration_signups')
        .update({ sort_order: u.sort_order })
        .eq('id', u.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { id } = body || {};
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const patch = {};

  if ('price' in body) {
    let priceValue = null;
    if (body.price !== null && body.price !== undefined && body.price !== '') {
      priceValue = Number(body.price);
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
      }
    }
    patch.price = priceValue;
  }

  if ('completed' in body) {
    patch.completed = Boolean(body.completed);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await supabase.from('aeration_signups').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE { id } — permanent, for a duplicate or mistaken signup.
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

  const { error } = await supabase.from('aeration_signups').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
