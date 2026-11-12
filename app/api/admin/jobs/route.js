import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { PRIORITIES, MAX_MINUTES, MAX_INCOME, compareJobs, parseMoney } from '../../../../lib/jobs';

export const dynamic = 'force-dynamic';

const JOB_COLUMNS =
  'id, title, client_id, client_name, address, estimated_minutes, estimated_income, priority, notes, done, completed_at, sort_order, created_at';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE = 200;
const MAX_NAME = 200;
const MAX_ADDRESS = 500;
const MAX_NOTES = 2000;

const MINUTES_MESSAGE = `Estimated time must be a whole number of minutes between 1 and ${MAX_MINUTES}.`;
const INCOME_MESSAGE = `Estimated income must be a dollar amount between $0 and $${MAX_INCOME.toLocaleString('en-US')}.`;
const PRIORITY_MESSAGE = 'Priority must be High, Medium, or Low.';
const NO_CLIENT_MESSAGE = 'That client no longer exists.';
const NO_JOB_MESSAGE = 'That job no longer exists.';

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

// Blank / missing -> { value: null }. Too long or not text -> { error }.
function cleanText(raw, label, max) {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw !== 'string') return { error: `${label} must be text.` };
  const value = raw.trim();
  if (value.length > max) return { error: `${label} is too long (max ${max} characters).` };
  return { value: value || null };
}

// null / '' / undefined -> null (not set). Numeric strings are accepted.
function cleanMinutes(raw) {
  if (raw === null || raw === undefined) return { value: null };
  let n;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string') {
    const text = raw.trim();
    if (text === '') return { value: null };
    if (!/^\d+$/.test(text)) return { error: MINUTES_MESSAGE };
    n = Number(text);
  } else {
    return { error: MINUTES_MESSAGE };
  }
  if (!Number.isInteger(n) || n < 1 || n > MAX_MINUTES) return { error: MINUTES_MESSAGE };
  return { value: n };
}

// null / '' / undefined -> null (not set). Accepts a number or a "150" / "$1,200.50" string;
// whole cents only. 0 is allowed (a free job).
function cleanIncome(raw) {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw === 'string') {
    if (raw.trim() === '') return { value: null };
    const n = parseMoney(raw);
    return n === null ? { error: INCOME_MESSAGE } : { value: n };
  }
  if (typeof raw !== 'number') return { error: INCOME_MESSAGE };
  if (!Number.isFinite(raw) || raw < 0 || raw > MAX_INCOME) return { error: INCOME_MESSAGE };
  const cents = Math.round(raw * 100);
  // More than two decimal places (e.g. 1.234) is rejected rather than silently rounded.
  if (Math.abs(cents - raw * 100) > 1e-6) return { error: INCOME_MESSAGE };
  return { value: cents / 100 };
}

function cleanPriority(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : raw;
  return PRIORITIES.includes(value) ? value : undefined;
}

// null / '' / undefined -> { value: null } (no client). Otherwise a trimmed id string.
function cleanClientId(raw) {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw !== 'string') return { error: 'Invalid client.' };
  return { value: raw.trim() || null };
}

// Returns { client } for a real client, or { error } (a NextResponse) to send back.
async function lookupClient(supabase, clientId) {
  // A malformed id can't match a row, and would make Postgres throw on the uuid cast.
  if (!UUID_RE.test(clientId)) return { error: fail(NO_CLIENT_MESSAGE) };

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, address')
    .eq('id', clientId)
    .maybeSingle();

  if (error) return { error: fail(error.message, 500) };
  if (!data) return { error: fail(NO_CLIENT_MESSAGE) };
  return { client: data };
}

// A client deleted between our lookup and the write trips the foreign key.
function writeError(error) {
  if (error.code === '23503') return fail(NO_CLIENT_MESSAGE);
  return fail(error.message, 500);
}

// Open jobs first, then High -> Medium -> Low, then manual order, then oldest first.
// Priority text doesn't sort High->Medium->Low in SQL, so that part happens here.
function sortJobs(rows) {
  return [...rows].sort((a, b) => {
    const diff = compareJobs(a, b);
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  // Done last in the query too, so the 2000-row cap trims finished jobs, not open ones.
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_COLUMNS)
    .order('done', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(2000);

  if (error) return fail(error.message, 500);

  return NextResponse.json({ items: sortJobs(data || []) });
}

// { title, client_id?, client_name?, address?, estimated_minutes?, estimated_income?, priority?, notes? }
// With client_id, the client's name + address are copied onto the job unless the body supplies its own.
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const title = cleanText(body.title, 'Title', MAX_TITLE);
  if (title.error) return fail(title.error);
  if (!title.value) return fail('Title is required.');

  const clientId = cleanClientId(body.client_id);
  if (clientId.error) return fail(clientId.error);

  const clientName = cleanText(body.client_name, 'Client name', MAX_NAME);
  if (clientName.error) return fail(clientName.error);

  const address = cleanText(body.address, 'Address', MAX_ADDRESS);
  if (address.error) return fail(address.error);

  const notes = cleanText(body.notes, 'Notes', MAX_NOTES);
  if (notes.error) return fail(notes.error);

  const minutes = cleanMinutes(body.estimated_minutes);
  if (minutes.error) return fail(minutes.error);

  const income = cleanIncome(body.estimated_income);
  if (income.error) return fail(income.error);

  let priority = 'medium';
  if (body.priority !== null && body.priority !== undefined && body.priority !== '') {
    priority = cleanPriority(body.priority);
    if (!priority) return fail(PRIORITY_MESSAGE);
  }

  // A blank name/address next to a real client counts as "not supplied".
  let snapshotName = clientName.value;
  let snapshotAddress = address.value;
  if (clientId.value) {
    const found = await lookupClient(supabase, clientId.value);
    if (found.error) return found.error;
    snapshotName = snapshotName ?? found.client.name ?? null;
    snapshotAddress = snapshotAddress ?? found.client.address ?? null;
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert([{
      title: title.value,
      client_id: clientId.value,
      client_name: snapshotName,
      address: snapshotAddress,
      estimated_minutes: minutes.value,
      estimated_income: income.value,
      priority,
      notes: notes.value,
    }])
    .select(JOB_COLUMNS)
    .single();

  if (error) return writeError(error);

  return NextResponse.json({ item: data });
}

// { id, ...any of: title | client_id | client_name | address | estimated_minutes | estimated_income | priority | notes | done }
//   client_id null  -- unlinks the client; client_name / address stay unless sent too
//   client_id <id>  -- links the client and re-copies name + address unless sent in the same request
//   done            -- true stamps completed_at, false clears it
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  // A malformed id can't match a row, and would make Postgres throw on the uuid cast.
  if (!UUID_RE.test(id)) return fail(NO_JOB_MESSAGE, 404);

  const patch = {};

  if ('title' in body) {
    const title = cleanText(body.title, 'Title', MAX_TITLE);
    if (title.error) return fail(title.error);
    if (!title.value) return fail("Title can't be empty.");
    patch.title = title.value;
  }

  if ('estimated_minutes' in body) {
    const minutes = cleanMinutes(body.estimated_minutes);
    if (minutes.error) return fail(minutes.error);
    patch.estimated_minutes = minutes.value;
  }

  if ('estimated_income' in body) {
    const income = cleanIncome(body.estimated_income);
    if (income.error) return fail(income.error);
    patch.estimated_income = income.value;
  }

  if ('priority' in body) {
    const priority = cleanPriority(body.priority);
    if (!priority) return fail(PRIORITY_MESSAGE);
    patch.priority = priority;
  }

  if ('notes' in body) {
    const notes = cleanText(body.notes, 'Notes', MAX_NOTES);
    if (notes.error) return fail(notes.error);
    patch.notes = notes.value;
  }

  if ('done' in body) {
    if (typeof body.done !== 'boolean') return fail('done must be true or false.');
    patch.done = body.done;
    patch.completed_at = body.done ? new Date().toISOString() : null;
  }

  let clientName;
  if ('client_name' in body) {
    clientName = cleanText(body.client_name, 'Client name', MAX_NAME);
    if (clientName.error) return fail(clientName.error);
  }

  let address;
  if ('address' in body) {
    address = cleanText(body.address, 'Address', MAX_ADDRESS);
    if (address.error) return fail(address.error);
  }

  let clientId;
  if ('client_id' in body) {
    clientId = cleanClientId(body.client_id);
    if (clientId.error) return fail(clientId.error);
    patch.client_id = clientId.value;
  }

  if (clientId?.value) {
    const found = await lookupClient(supabase, clientId.value);
    if (found.error) return found.error;
    patch.client_name = clientName?.value ?? found.client.name ?? null;
    patch.address = address?.value ?? found.client.address ?? null;
  } else {
    if (clientName) patch.client_name = clientName.value;
    if (address) patch.address = address.value;
  }

  if (Object.keys(patch).length === 0) return fail('Nothing to update.');

  const { data, error } = await supabase
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .select(JOB_COLUMNS)
    .maybeSingle();

  if (error) return writeError(error);
  if (!data) return fail(NO_JOB_MESSAGE, 404);

  return NextResponse.json({ item: data });
}

// DELETE { id }                        -- remove one job
// DELETE { clearDone: true }           -- remove every finished job
// DELETE { clearDone: true, ids: [..] } -- remove only those of the listed jobs that are finished
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = (await readBody(request)) || {};

  if (body.id !== undefined && body.id !== null) {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return fail('Missing id.');
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) return fail(error.message, 500);

    return NextResponse.json({ ok: true });
  }

  if (body.clearDone === true) {
    let query = supabase.from('jobs').delete({ count: 'exact' }).eq('done', true);

    if (body.ids !== undefined) {
      if (!Array.isArray(body.ids) || body.ids.length > 2000) return fail('ids must be a list of job ids.');
      const ids = body.ids.filter((x) => typeof x === 'string' && UUID_RE.test(x.trim())).map((x) => x.trim());
      if (ids.length === 0) return NextResponse.json({ ok: true, deleted: 0 });
      query = query.in('id', ids);
    }

    const { error, count } = await query;
    if (error) return fail(error.message, 500);

    return NextResponse.json({ ok: true, deleted: count ?? 0 });
  }

  return fail('Missing id.');
}
