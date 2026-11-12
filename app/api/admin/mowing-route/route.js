import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { MAX_LEN, UUID_RE } from '../../../../lib/clients';

export const dynamic = 'force-dynamic';

// Route STOPS. Each row of `mowing_clients` is one client's spot on Route A or Route B, with
// that stop's price, cut height, payment type and driving order. WHO the client is (name, phone,
// address, notes...) lives in `clients`; a database trigger copies name/address/phone onto each
// stop, so reading stops here gives the current details.
const GROUPS = new Set(['A', 'B']);
const EDITABLE_TEXT_FIELDS = ['name', 'phone', 'address', 'frequency'];
const IDENTITY_FIELDS = new Set(['name', 'phone', 'address']); // stored on the client, not the stop
const PAYMENT_TYPES = new Set(['Venmo', 'Cash', 'Check', 'Bill']);
const STOP_COLUMNS =
  'id, client_id, name, address, phone, price, mowing_height, payment_type, frequency, route_group, sort_order, created_at';

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

function bad(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('mowing_clients')
    .select(STOP_COLUMNS)
    .in('route_group', ['A', 'B'])
    .order('sort_order', { ascending: true })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}

// Put someone on a route (at the end), either:
//   { client_id, route_group, price?, mowing_height?, payment_type? }   -- an existing client
//   { name, route_group, address?, phone?, price?, mowing_height?, payment_type? } -- a brand-new client
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Body must be JSON.');
  }

  const routeGroup = body?.route_group;
  if (!GROUPS.has(routeGroup)) return bad('route_group must be "A" or "B".');

  let price = null;
  if (body.price !== null && body.price !== undefined && body.price !== '') {
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return bad('Price must be a positive number.');
  }

  const mowingHeight = validHeight(body.mowing_height);
  if (mowingHeight === undefined) {
    return bad('Mowing height must be between 2 and 5 inches, in 0.25 increments.');
  }

  const paymentType = validPaymentType(body.payment_type);
  if (paymentType === undefined) return bad('Payment type must be Venmo, Cash, Check, or Bill.');

  let clientId = null;
  let createdClientId = null;

  if (body.client_id !== undefined && body.client_id !== null && body.client_id !== '') {
    clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';
    if (!UUID_RE.test(clientId)) return bad('That client no longer exists.');
    const { data: existing, error: findError } = await supabase.from('clients').select('id').eq('id', clientId).maybeSingle();
    if (findError) return bad(findError.message, 500);
    if (!existing) return bad('That client no longer exists.');
  } else {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return bad('Name is required.');
    if (name.length > MAX_LEN.name) return bad(`Name is too long (max ${MAX_LEN.name} characters).`);

    const { data: created, error: createError } = await supabase
      .from('clients')
      .insert([{
        name,
        address: body.address ? String(body.address).trim().slice(0, MAX_LEN.address) : null,
        phone: body.phone ? String(body.phone).trim().slice(0, MAX_LEN.phone) : null,
        client_type: 'Mowing',
      }])
      .select('id')
      .single();
    if (createError) return bad(createError.message, 500);
    clientId = created.id;
    createdClientId = created.id;
  }

  // name is NOT NULL on the stop; the insert trigger overwrites it with the client's details.
  const { data, error } = await supabase
    .from('mowing_clients')
    .insert([{
      client_id: clientId,
      name: '',
      route_group: routeGroup,
      price,
      mowing_height: mowingHeight,
      payment_type: paymentType,
    }])
    .select(STOP_COLUMNS)
    .single();

  if (error) {
    // Don't leave a client behind that we just made for a stop that failed.
    if (createdClientId) await supabase.from('clients').delete().eq('id', createdClientId);
    if (error.code === '23505') return bad(`That client is already on Route ${routeGroup}.`);
    return bad(error.message, 500);
  }

  return NextResponse.json({ item: data });
}

// What this admin edits on a route:
//   { id, price }                  -- what this stop is charged
//   { id, mowing_height }          -- cut height, 2-5" in .25 steps
//   { id, payment_type }           -- Venmo, Cash, Check, or Bill
//   { id, name | phone | address } -- the client's details (saved on the client, so every route they're on updates)
//   { id, frequency }              -- schedule note for this stop
//   { group, reorder: [ids] }      -- the full list for one route, top to bottom, after a manual move
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Body must be JSON.');
  }

  if (Array.isArray(body?.reorder)) {
    const ids = body.reorder;
    if (!GROUPS.has(body.group)) return bad('group must be "A" or "B".');
    if (ids.length === 0 || ids.length > 500) return bad('Invalid reorder list.');
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
  if (!id) return bad('Missing id.');
  if (typeof id !== 'string' || !UUID_RE.test(id)) return bad('That stop no longer exists.', 404);

  const stopPatch = {};
  const clientPatch = {};

  if ('price' in body) {
    let priceValue = null;
    if (body.price !== null && body.price !== undefined && body.price !== '') {
      priceValue = Number(body.price);
      if (!Number.isFinite(priceValue) || priceValue < 0) return bad('Price must be a positive number.');
    }
    stopPatch.price = priceValue;
  }

  if ('mowing_height' in body) {
    const height = validHeight(body.mowing_height);
    if (height === undefined) return bad('Mowing height must be between 2 and 5 inches, in 0.25 increments.');
    stopPatch.mowing_height = height;
  }

  if ('payment_type' in body) {
    const paymentType = validPaymentType(body.payment_type);
    if (paymentType === undefined) return bad('Payment type must be Venmo, Cash, Check, or Bill.');
    stopPatch.payment_type = paymentType;
  }

  for (const field of EDITABLE_TEXT_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw !== null && raw !== undefined && typeof raw !== 'string') return bad(`${field} must be text.`);
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (field === 'name' && !value) return bad("Name can't be empty.");
    if (typeof value === 'string' && value.length > (MAX_LEN[field] ?? 200)) {
      return bad(`${field} is too long (max ${MAX_LEN[field] ?? 200} characters).`);
    }
    (IDENTITY_FIELDS.has(field) ? clientPatch : stopPatch)[field] = value || null;
  }

  if (Object.keys(stopPatch).length === 0 && Object.keys(clientPatch).length === 0) {
    return bad('Nothing to update.');
  }

  const { data: stop, error: findError } = await supabase
    .from('mowing_clients')
    .select('id, client_id')
    .eq('id', id)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!stop) return bad('That stop no longer exists.', 404);

  if (Object.keys(clientPatch).length) {
    if (stop.client_id) {
      // The database copies these onto every stop this client has.
      const { error } = await supabase.from('clients').update(clientPatch).eq('id', stop.client_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      Object.assign(stopPatch, clientPatch); // an old stop with no client record: edit it directly
    }
  }

  if (Object.keys(stopPatch).length) {
    const { error } = await supabase.from('mowing_clients').update(stopPatch).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE { id } -- takes this stop off its route. The client stays in the Clients list
// (delete them there to remove them completely).
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body?.id) return bad('Missing id.');
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return NextResponse.json({ ok: true });

  const { error } = await supabase.from('mowing_clients').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
