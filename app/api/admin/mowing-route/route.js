import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

const GROUPS = new Set(['A', 'B', 'misc']);
const EDITABLE_TEXT_FIELDS = ['name', 'phone', 'address', 'frequency'];
const PAYMENT_TYPES = new Set(['Venmo', 'Cash', 'Check', 'Bill']);

function validHeight(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 2 || n > 5) return undefined;
  // Must land on a .25 increment (2, 2.25, 2.5, ... 5).
  if (Math.round(n * 4) !== n * 4) return undefined;
  return n;
}

function validPaymentType(value) {
  if (value === null || value === undefined || value === '') return null;
  return PAYMENT_TYPES.has(value) ? value : undefined;
}

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('mowing_clients')
    .select('id, name, address, phone, price, mowing_height, payment_type, frequency, route_group, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}

// { name, route_group, address?, phone?, price?, mowing_height? } -- add a client to a route group.
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const routeGroup = body?.route_group;
  if (!GROUPS.has(routeGroup)) {
    return NextResponse.json({ error: 'route_group must be "A", "B", or "misc".' }, { status: 400 });
  }

  let price = null;
  if (body.price !== null && body.price !== undefined && body.price !== '') {
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
    }
  }

  const mowingHeight = validHeight(body.mowing_height);
  if (mowingHeight === undefined) {
    return NextResponse.json({ error: 'Mowing height must be between 2 and 5 inches, in 0.25 increments.' }, { status: 400 });
  }

  const paymentType = validPaymentType(body.payment_type);
  if (paymentType === undefined) {
    return NextResponse.json({ error: 'Payment type must be Venmo, Cash, Check, or Bill.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mowing_clients')
    .insert([{
      name,
      route_group: routeGroup,
      address: body.address ? String(body.address).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      price,
      mowing_height: mowingHeight,
      payment_type: paymentType,
      frequency: body.frequency ? String(body.frequency).trim() : null,
    }])
    .select('id, name, address, phone, price, mowing_height, payment_type, frequency, route_group, sort_order, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data });
}

// What this admin edits on a route:
//   { id, name | phone | address | frequency } -- any contact/schedule detail, in place
//   { id, price }                  -- what they're being charged
//   { id, mowing_height }          -- cut height, 2-5" in .25 steps
//   { id, payment_type }           -- Venmo, Cash, Check, or Bill
//   { id, route_group }            -- move the client to "A", "B", or "misc" (appended to the end)
//   { group, reorder: [ids] }      -- the full list for one group, top to bottom, after a manual move
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
    if (!GROUPS.has(body.group)) {
      return NextResponse.json({ error: 'group must be "A", "B", or "misc".' }, { status: 400 });
    }
    if (ids.length === 0 || ids.length > 500) {
      return NextResponse.json({ error: 'Invalid reorder list.' }, { status: 400 });
    }
    const base = Date.now();
    const updates = ids.map((id, i) => ({ id, sort_order: base + i }));
    for (const u of updates) {
      const { error } = await supabase
        .from('mowing_clients')
        .update({ sort_order: u.sort_order })
        .eq('id', u.id)
        .eq('route_group', body.group);
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

  if ('mowing_height' in body) {
    const height = validHeight(body.mowing_height);
    if (height === undefined) {
      return NextResponse.json({ error: 'Mowing height must be between 2 and 5 inches, in 0.25 increments.' }, { status: 400 });
    }
    patch.mowing_height = height;
  }

  if ('payment_type' in body) {
    const paymentType = validPaymentType(body.payment_type);
    if (paymentType === undefined) {
      return NextResponse.json({ error: 'Payment type must be Venmo, Cash, Check, or Bill.' }, { status: 400 });
    }
    patch.payment_type = paymentType;
  }

  if ('route_group' in body) {
    if (!GROUPS.has(body.route_group)) {
      return NextResponse.json({ error: 'route_group must be "A", "B", or "misc".' }, { status: 400 });
    }
    patch.route_group = body.route_group;
    // Land at the end of the new group by default; a follow-up reorder call
    // (sent by the client right after a cross-group drag) refines the exact spot.
    patch.sort_order = Date.now();
  }

  for (const field of EDITABLE_TEXT_FIELDS) {
    if (!(field in body)) continue;
    const value = typeof body[field] === 'string' ? body[field].trim() : body[field];
    if (field === 'name' && !value) {
      return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    }
    patch[field] = value || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await supabase.from('mowing_clients').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE { id } -- permanent, for a duplicate or a client leaving the route.
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

  const { error } = await supabase.from('mowing_clients').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
