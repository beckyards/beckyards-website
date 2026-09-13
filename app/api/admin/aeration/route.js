import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('aeration_signups')
    .select('id, name, phone, address, service_type, price, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}

// PATCH { id, price } — the only thing the admin edits on a signup: what
// they're being charged.
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const { id, price } = body || {};
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  let priceValue = null;
  if (price !== null && price !== undefined && price !== '') {
    priceValue = Number(price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from('aeration_signups')
    .update({ price: priceValue })
    .eq('id', id);

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
