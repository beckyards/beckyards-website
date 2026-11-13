import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { UUID_RE } from '../../../../lib/clients';
import { CATEGORY_KEYS, MAX_LEN, isValidDate, isValidTime } from '../../../../lib/calendar';

export const dynamic = 'force-dynamic';

const COLUMNS = 'id, title, category, start_date, end_date, start_time, end_time, client_id, campaign_id, place, notes, done, created_at';
const NO_EVENT = 'That event no longer exists.';
const NO_LINK = 'That client or campaign no longer exists.';
const NUL = '\u0000'; // the database can't store this character

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

// The database hands times back as "09:30:00"; the app works in "09:30".
function shape(row) {
  return { ...row, start_time: row.start_time ? row.start_time.slice(0, 5) : null, end_time: row.end_time ? row.end_time.slice(0, 5) : null };
}

function cleanText(raw, label, max, required = false) {
  if (raw === null || raw === undefined) return required ? { error: `${label} is required.` } : { value: null };
  if (typeof raw !== 'string') return { error: `${label} must be text.` };
  const value = raw.trim();
  if (!value) return required ? { error: `${label} is required.` } : { value: null };
  if (value.includes(NUL)) return { error: `${label} has a character that can't be saved.` };
  if (value.length > max) return { error: `${label} is too long (max ${max} characters).` };
  return { value };
}

function cleanId(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  return typeof raw === 'string' && UUID_RE.test(raw.trim()) ? { value: raw.trim() } : { error: NO_LINK };
}

function cleanTime(raw, label) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  return isValidTime(raw) ? { value: raw } : { error: `${label} isn't a valid time.` };
}

// Reads every field present in `body`. `create` makes title + start date required.
function buildRow(body, create) {
  const row = {};
  const checks = [
    ['title', () => cleanText(body.title, 'Title', MAX_LEN.title, true)],
    ['category', () => (CATEGORY_KEYS.includes(body.category) ? { value: body.category } : { error: "Type isn't one of the choices." })],
    ['start_date', () => (isValidDate(body.start_date) ? { value: body.start_date } : { error: "The date isn't valid." })],
    ['end_date', () => (body.end_date === null || body.end_date === '' ? { value: null } : isValidDate(body.end_date) ? { value: body.end_date } : { error: "The end date isn't valid." })],
    ['start_time', () => cleanTime(body.start_time, 'Start time')],
    ['end_time', () => cleanTime(body.end_time, 'End time')],
    ['client_id', () => cleanId(body.client_id)],
    ['campaign_id', () => cleanId(body.campaign_id)],
    ['place', () => cleanText(body.place, 'Where', MAX_LEN.place)],
    ['notes', () => cleanText(body.notes, 'Notes', MAX_LEN.notes)],
    ['done', () => (typeof body.done === 'boolean' ? { value: body.done } : { error: 'done must be true or false.' })],
  ];
  for (const [field, check] of checks) {
    if (!(field in body)) {
      if (create && (field === 'title' || field === 'start_date')) return { error: field === 'title' ? 'Title is required.' : 'Pick a date.' };
      continue;
    }
    const r = check();
    if (r.error) return { error: r.error };
    row[field] = r.value;
  }
  return { row };
}

// The date/time pieces have to make sense together.
function checkTogether(m) {
  if (m.end_date && m.end_date < m.start_date) return 'The end date is before the start date.';
  if (m.end_time && !m.start_time) return 'Add a start time before an end time.';
  const sameDay = !m.end_date || m.end_date === m.start_date;
  if (sameDay && m.start_time && m.end_time && m.end_time <= m.start_time) return 'The end time has to be after the start time.';
  return null;
}

function dbFail(error) {
  return error.code === '23503' ? fail(NO_LINK, 400) : fail(error.message, 500);
}

// Your events, the jobs that have a date (plus every open job, so one can be scheduled from the calendar),
// and the mowing runs you've finished.
export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const [events, runs, jobs] = await Promise.all([
    supabase.from('calendar_events').select(COLUMNS).order('start_date', { ascending: true }).order('start_time', { ascending: true, nullsFirst: true }).limit(5000),
    supabase.from('route_runs').select('id, route_group, run_date, helper').not('completed_at', 'is', null).order('run_date', { ascending: false }).limit(2000),
    supabase.from('jobs').select('id, title, client_name, address, scheduled_date, done').or('scheduled_date.not.is.null,done.eq.false').limit(2000),
  ]);
  if (events.error) return fail(events.error.message, 500);
  if (runs.error) return fail(runs.error.message, 500);
  if (jobs.error) return fail(jobs.error.message, 500);
  return NextResponse.json({ items: (events.data || []).map(shape), runs: runs.data || [], jobs: jobs.data || [] });
}

export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const { row, error: bad } = buildRow(body, true);
  if (bad) return fail(bad);
  if (!('category' in row)) row.category = 'other';
  const together = checkTogether(row);
  if (together) return fail(together);

  const { data, error } = await supabase.from('calendar_events').insert([row]).select(COLUMNS).single();
  if (error) return dbFail(error);
  return NextResponse.json({ item: shape(data) });
}

export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return fail(NO_EVENT, 404);

  const { row, error: bad } = buildRow(body, false);
  if (bad) return fail(bad);
  if (Object.keys(row).length === 0) return fail('Nothing to update.');

  // Check dates and times against what's already saved, counting the ones not being changed.
  if (['start_date', 'end_date', 'start_time', 'end_time'].some((f) => f in row)) {
    const { data: cur, error: curError } = await supabase.from('calendar_events').select('start_date, end_date, start_time, end_time').eq('id', id).maybeSingle();
    if (curError) return fail(curError.message, 500);
    if (!cur) return fail(NO_EVENT, 404);
    const merged = shape({ ...cur, ...row });
    const together = checkTogether({ ...merged, start_time: row.start_time !== undefined ? row.start_time : merged.start_time, end_time: row.end_time !== undefined ? row.end_time : merged.end_time });
    if (together) return fail(together);
  }

  const { data, error } = await supabase.from('calendar_events').update(row).eq('id', id).select(COLUMNS).maybeSingle();
  if (error) return dbFail(error);
  if (!data) return fail(NO_EVENT, 404);
  return NextResponse.json({ item: shape(data) });
}

export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  const id = body && typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}
