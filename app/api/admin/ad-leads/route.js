import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { UUID_RE } from '../../../../lib/clients';
import {
  LEAD_SERVICES,
  LEAD_STATUSES,
  MAX_LEN,
  isValidDate,
  parseMoney,
} from '../../../../lib/advertising';

export const dynamic = 'force-dynamic';

const COLUMNS = 'id, campaign_id, name, contact, service, status, value, lead_date, notes, created_at';
const NO_LEAD = 'That lead no longer exists.';
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

function cleanCampaign(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  return typeof raw === 'string' && UUID_RE.test(raw.trim()) ? { value: raw.trim() } : { error: NO_CAMPAIGN };
}

// Blank -> no amount yet (not $0).
function cleanValue(raw) {
  if (raw === null || raw === undefined || raw === '') return { value: null };
  const n = parseMoney(typeof raw === 'number' && Number.isFinite(raw) ? raw.toFixed(2) : raw);
  return n === null ? { error: "Value isn't a valid dollar amount (0 to 1,000,000)." } : { value: n };
}

function cleanDate(raw) {
  return isValidDate(raw) ? { value: raw } : { error: "The date isn't valid." };
}

function buildRow(body, create) {
  const row = {};
  const checks = [
    ['name', () => cleanText(body.name, 'Name', MAX_LEN.name, true)],
    ['campaign_id', () => cleanCampaign(body.campaign_id)],
    ['contact', () => cleanText(body.contact, 'Phone or email', MAX_LEN.contact)],
    ['service', () => cleanChoice(body.service, LEAD_SERVICES, 'Service')],
    ['status', () => cleanChoice(body.status, LEAD_STATUSES, 'Status', true)],
    ['value', () => cleanValue(body.value)],
    ['lead_date', () => cleanDate(body.lead_date)],
    ['notes', () => cleanText(body.notes, 'Notes', MAX_LEN.notes)],
  ];
  for (const [field, check] of checks) {
    if (!(field in body)) {
      if (create && field === 'name') return { error: 'Name is required.' };
      continue;
    }
    const r = check();
    if (r.error) return { error: r.error };
    row[field] = r.value;
  }
  return { row };
}

// A campaign id that doesn't exist trips the foreign key (23503); say so plainly.
function dbFail(error) {
  return error.code === '23503' ? fail(NO_CAMPAIGN, 400) : fail(error.message, 500);
}

export async function GET() {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('ad_leads')
    .select(COLUMNS)
    .order('lead_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5000);
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
  if (!('status' in row)) row.status = 'new';

  const { data, error } = await supabase.from('ad_leads').insert([row]).select(COLUMNS).single();
  if (error) return dbFail(error);
  return NextResponse.json({ item: data });
}

export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  if (!body) return fail('Body must be JSON.');

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return fail(NO_LEAD, 404);

  const { row, error: bad } = buildRow(body, false);
  if (bad) return fail(bad);
  if (Object.keys(row).length === 0) return fail('Nothing to update.');

  const { data, error } = await supabase.from('ad_leads').update(row).eq('id', id).select(COLUMNS).maybeSingle();
  if (error) return dbFail(error);
  if (!data) return fail(NO_LEAD, 404);
  return NextResponse.json({ item: data });
}

export async function DELETE(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const body = await readBody(request);
  const id = body && typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return fail('Missing id.');
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

  const { error } = await supabase.from('ad_leads').delete().eq('id', id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}
