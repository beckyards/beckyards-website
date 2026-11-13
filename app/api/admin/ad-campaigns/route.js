import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { UUID_RE } from '../../../../lib/clients';
import {
  CAMPAIGN_STATUSES,
  CHANNELS,
  MAX_LEN,
  MAX_QUANTITY,
  SERVICES,
  isValidDate,
  parseMoney,
} from '../../../../lib/advertising';

export const dynamic = 'force-dynamic';

const COLUMNS = 'id, name, channel, service, status, start_date, end_date, cost, quantity, area, offer, notes, created_at';
const NO_CAMPAIGN = 'That campaign no longer exists.';
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

// Blank / missing -> { value: null }. Wrong type, too long, or a bad character -> { error }.
function cleanText(raw, label, max, required = false) {
  if (raw === null || raw === undefined) return required ? { error: `${label} is required.` } : { value: null };
  if (typeof raw !== 'string') return { error: `${label} must be text.` };
  const value = raw.trim();
  if (!value) return required ? { error: `${label} is required.` } : { value: null };
  if (value.includes(NUL)) return { error: `${label} has a character that can't be saved.` };
  if (value.length > max) return { error: `${label} is too long (max ${max} characters).` };
  return { value };
}

function cleanChoice(raw, list, label, required = false) {
  if (raw === null || raw === undefined || raw === '') return required ? { error: `${label} is required.` } : { value: null };
  return typeof raw === 'string' && list.includes(raw) ? { value: raw } : { error: `${label} isn't one of the choices.` };
}

function cleanDate(raw, label) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  return isValidDate(raw) ? { value: raw } : { error: `${label} isn't a valid date.` };
}

// '' / null -> 0 dollars. Numbers and "$1,200.50" text are both fine.
function cleanCost(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: 0 };
  const n = parseMoney(typeof raw === 'number' && Number.isFinite(raw) ? raw.toFixed(2) : raw);
  return n === null ? { error: "Cost isn't a valid dollar amount (0 to 1,000,000)." } : { value: n };
}

function cleanQuantity(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  const n = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : raw;
  if (!Number.isInteger(n) || n < 0 || n > MAX_QUANTITY) return { error: 'How many must be a whole number.' };
  return { value: n };
}

// Reads every field present in `body` into a row. `create` makes name + channel required.
function buildRow(body, create) {
  const row = {};
  const checks = [
    ['name', () => cleanText(body.name, 'Name', MAX_LEN.name, true)],
    ['channel', () => cleanChoice(body.channel, CHANNELS, 'Channel', true)],
    ['service', () => cleanChoice(body.service, SERVICES, 'Service')],
    ['status', () => cleanChoice(body.status, CAMPAIGN_STATUSES, 'Status', true)],
    ['start_date', () => cleanDate(body.start_date, 'Start date')],
    ['end_date', () => cleanDate(body.end_date, 'End date')],
    ['cost', () => cleanCost(body.cost)],
    ['quantity', () => cleanQuantity(body.quantity)],
    ['area', () => cleanText(body.area, 'Area', MAX_LEN.area)],
    ['offer', () => cleanText(body.offer, 'Offer', MAX_LEN.offer)],
    ['notes', () => cleanText(body.notes, 'Notes', MAX_LEN.notes)],
  ];
  for (const [field, check] of checks) {
    if (!(field in body)) {
      if (create && (field === 'name' || field === 'channel')) return { error: `${field === 'name' ? 'Name' : 'Channel'} is required.` };
      continue;
    }
    const r = check();
    if (r.error) return { error: r.error };
    row[field] = r.value;
  }
  return { row };
}

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('ad_campaigns')
    .select(COLUMNS)
    .order('start_date', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const { row, error: bad } = buildRow(body, true);
  if (bad) return fail(bad);
  if (!('status' in row)) row.status = 'planned';
  if (row.start_date && row.end_date && row.end_date < row.start_date) return fail('The end date is before the start date.');

  const { data, error } = await supabase.from('ad_campaigns').insert([row]).select(COLUMNS).single();
  if (error) return fail(error.message, 500);
  return NextResponse.json({ item: data });
}

export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return fail(NO_CAMPAIGN, 404);

  const { row, error: bad } = buildRow(body, false);
  if (bad) return fail(bad);
  if (Object.keys(row).length === 0) return fail('Nothing to update.');

  // The end date must not be before the start date, counting dates that aren't being changed.
  if (('start_date' in row || 'end_date' in row)) {
    const { data: cur, error: curError } = await supabase.from('ad_campaigns').select('start_date, end_date').eq('id', id).maybeSingle();
    if (curError) return fail(curError.message, 500);
    if (!cur) return fail(NO_CAMPAIGN, 404);
    const start = 'start_date' in row ? row.start_date : cur.start_date;
    const end = 'end_date' in row ? row.end_date : cur.end_date;
    if (start && end && end < start) return fail('The end date is before the start date.');
  }

  const { data, error } = await supabase.from('ad_campaigns').update(row).eq('id', id).select(COLUMNS).maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail(NO_CAMPAIGN, 404);
  return NextResponse.json({ item: data });
}

// Leads the campaign brought in are kept (they become "no campaign"), so deleting never loses a lead.
export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  const id = body && typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

  const { error } = await supabase.from('ad_campaigns').delete().eq('id', id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}
