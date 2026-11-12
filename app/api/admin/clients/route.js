import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import {
  CLIENT_TYPES,
  DEFAULT_MOW_HEIGHT,
  MAX_LEN,
  ROUTES,
  UUID_RE,
  validEmail,
} from '../../../../lib/clients';

export const dynamic = 'force-dynamic';

// The master client list (one row per person). Route spots live on `mowing_clients`
// ("stops") and are managed from /api/admin/mowing-route; here a client just reports
// which routes they are on, and can be added to / taken off a route.
const COLUMNS = 'id, name, address, phone, email, notes, client_type, created_at';

const NO_CLIENT = 'That client no longer exists.';
const BAD_TYPE = `Type must be one of: ${CLIENT_TYPES.join(', ')}.`;
const BAD_ROUTES = 'Routes must be a list of "A" and/or "B".';
const BAD_EMAIL = "That email address doesn't look right.";

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

// Blank / missing -> { value: null }. Wrong type or too long -> { error }.
function cleanText(raw, label, max) {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw !== 'string') return { error: `${label} must be text.` };
  const value = raw.trim();
  if (value.length > max) return { error: `${label} is too long (max ${max} characters).` };
  return { value: value || null };
}

function cleanEmail(raw) {
  const t = cleanText(raw, 'Email', MAX_LEN.email);
  if (t.error) return t;
  if (t.value && !validEmail(t.value)) return { error: BAD_EMAIL };
  return t;
}

// '' / null / undefined -> null (no type).
function cleanType(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  return CLIENT_TYPES.includes(raw) ? { value: raw } : { error: BAD_TYPE };
}

// An array of 'A' / 'B', no repeats. Anything else is an error.
function cleanRoutes(raw) {
  if (!Array.isArray(raw)) return { error: BAD_ROUTES };
  if (raw.some((r) => !ROUTES.includes(r))) return { error: BAD_ROUTES };
  return { value: ROUTES.filter((r) => raw.includes(r)) };
}

// Attach each client's list of routes (['A'], ['A','B'], or []) from the stops table.
async function withRoutes(supabase, clients) {
  if (clients.length === 0) return { items: [] };
  const { data: stops, error } = await supabase
    .from('mowing_clients')
    .select('client_id, route_group')
    .in('route_group', ROUTES)
    .not('client_id', 'is', null)
    .limit(10000);
  if (error) return { error };

  const byClient = new Map();
  for (const s of stops || []) {
    if (!byClient.has(s.client_id)) byClient.set(s.client_id, []);
    byClient.get(s.client_id).push(s.route_group);
  }
  return {
    items: clients.map((c) => ({ ...c, routes: ROUTES.filter((r) => (byClient.get(c.id) || []).includes(r)) })),
  };
}

// Make the client's stops match `routes`: add a stop for each newly-chosen route (at the end,
// standard cut height), delete the stop for each route they were taken off.
async function setRoutes(supabase, clientId, routes) {
  const { data: stops, error } = await supabase
    .from('mowing_clients')
    .select('id, route_group')
    .eq('client_id', clientId)
    .in('route_group', ROUTES);
  if (error) return { error };

  const have = new Set((stops || []).map((s) => s.route_group));
  const toAdd = routes.filter((r) => !have.has(r));
  const toRemove = (stops || []).filter((s) => !routes.includes(s.route_group)).map((s) => s.id);

  // One insert per route, so a stop that a concurrent request already added (23505) can't
  // block the others. name is NOT NULL on the stop; the insert trigger overwrites it with the client's details.
  const base = Date.now();
  for (const [i, route_group] of toAdd.entries()) {
    const { error: addError } = await supabase.from('mowing_clients').insert([{
      client_id: clientId,
      route_group,
      name: '',
      mowing_height: DEFAULT_MOW_HEIGHT,
      sort_order: base + i,
    }]);
    // 23505: someone already added that stop. Same end state, so fine.
    if (addError && addError.code !== '23505') return { error: addError };
  }
  if (toRemove.length) {
    const { error: delError } = await supabase.from('mowing_clients').delete().in('id', toRemove);
    if (delError) return { error: delError };
  }
  return {};
}

async function loadOne(supabase, id) {
  const { data, error } = await supabase.from('clients').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) return { error };
  if (!data) return { missing: true };
  const result = await withRoutes(supabase, [data]);
  if (result.error) return { error: result.error };
  return { item: result.items[0] };
}

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('clients')
    .select(COLUMNS)
    .order('name', { ascending: true })
    .limit(5000);
  if (error) return fail(error.message, 500);

  const result = await withRoutes(supabase, data || []);
  if (result.error) return fail(result.error.message, 500);
  return NextResponse.json({ items: result.items });
}

// { name, address?, phone?, email?, notes?, client_type?, routes?: ['A','B'] }
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const name = cleanText(body.name, 'Name', MAX_LEN.name);
  if (name.error) return fail(name.error);
  if (!name.value) return fail('Name is required.');

  const address = cleanText(body.address, 'Address', MAX_LEN.address);
  if (address.error) return fail(address.error);
  const phone = cleanText(body.phone, 'Phone', MAX_LEN.phone);
  if (phone.error) return fail(phone.error);
  const email = cleanEmail(body.email);
  if (email.error) return fail(email.error);
  const notes = cleanText(body.notes, 'Notes', MAX_LEN.notes);
  if (notes.error) return fail(notes.error);
  const type = cleanType(body.client_type);
  if (type.error) return fail(type.error);

  let routes = { value: [] };
  if (body.routes !== undefined && body.routes !== null) {
    routes = cleanRoutes(body.routes);
    if (routes.error) return fail(routes.error);
  }

  const { data, error } = await supabase
    .from('clients')
    .insert([{
      name: name.value,
      address: address.value,
      phone: phone.value,
      email: email.value,
      notes: notes.value,
      client_type: type.value,
    }])
    .select(COLUMNS)
    .single();
  if (error) return fail(error.message, 500);

  if (routes.value.length) {
    const added = await setRoutes(supabase, data.id, routes.value);
    if (added.error) {
      // Don't leave a route-less client behind for a request we're reporting as failed.
      await supabase.from('clients').delete().eq('id', data.id);
      return fail(added.error.message, 500);
    }
  }

  const loaded = await loadOne(supabase, data.id);
  if (loaded.error) return fail(loaded.error.message, 500);
  return NextResponse.json({ item: loaded.item });
}

// { id, ...any of: name | address | phone | email | notes | client_type | routes }
//   routes: the full list of routes they should be on (['A'], ['A','B'], []). Adds / removes route stops to match.
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return fail(NO_CLIENT, 404);

  const patch = {};

  if ('name' in body) {
    const name = cleanText(body.name, 'Name', MAX_LEN.name);
    if (name.error) return fail(name.error);
    if (!name.value) return fail("Name can't be empty.");
    patch.name = name.value;
  }
  for (const [field, label] of [['address', 'Address'], ['phone', 'Phone'], ['notes', 'Notes']]) {
    if (!(field in body)) continue;
    const v = cleanText(body[field], label, MAX_LEN[field]);
    if (v.error) return fail(v.error);
    patch[field] = v.value;
  }
  if ('email' in body) {
    const email = cleanEmail(body.email);
    if (email.error) return fail(email.error);
    patch.email = email.value;
  }
  if ('client_type' in body) {
    const type = cleanType(body.client_type);
    if (type.error) return fail(type.error);
    patch.client_type = type.value;
  }

  let routes;
  if ('routes' in body) {
    routes = cleanRoutes(body.routes);
    if (routes.error) return fail(routes.error);
  }

  if (Object.keys(patch).length === 0 && !routes) return fail('Nothing to update.');

  if (Object.keys(patch).length) {
    const { data, error } = await supabase.from('clients').update(patch).eq('id', id).select('id').maybeSingle();
    if (error) return fail(error.message, 500);
    if (!data) return fail(NO_CLIENT, 404);
  } else {
    const { data, error } = await supabase.from('clients').select('id').eq('id', id).maybeSingle();
    if (error) return fail(error.message, 500);
    if (!data) return fail(NO_CLIENT, 404);
  }

  if (routes) {
    const changed = await setRoutes(supabase, id, routes.value);
    if (changed.error) return fail(changed.error.message, 500);
  }

  const loaded = await loadOne(supabase, id);
  if (loaded.error) return fail(loaded.error.message, 500);
  if (loaded.missing) return fail(NO_CLIENT, 404);
  return NextResponse.json({ item: loaded.item });
}

// DELETE { id } -- permanent. Their route stops go with them. Jobs and past route runs keep
// their text; they just lose the link.
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = (await readBody(request)) || {};
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return fail(error.message, 500);

  return NextResponse.json({ ok: true });
}
