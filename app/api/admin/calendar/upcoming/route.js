import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../../lib/adminAuth';
import { addDays, buildItems, isValidDate } from '../../../../../lib/calendar';

export const dynamic = 'force-dynamic';

const EVENT_COLUMNS = 'id, title, category, start_date, end_date, start_time, end_time, client_id, place, done';
const JOB_COLUMNS = 'id, title, client_name, address, scheduled_date, done';

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function shapeTimes(row) {
  return { ...row, start_time: row.start_time ? row.start_time.slice(0, 5) : null, end_time: row.end_time ? row.end_time.slice(0, 5) : null };
}

// The Dashboard's "today and the week ahead": everything on the calendar from `from` through `from + days`,
// plus what's past due (dated jobs and reminders that are behind and not ticked off).
// GET ?from=YYYY-MM-DD&days=7   -- `from` is the browser's own "today", so the right day shows whatever the server's clock says.
export async function GET(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const from = request.nextUrl.searchParams.get('from');
  if (!isValidDate(from)) return fail('Pass from=YYYY-MM-DD.');
  const daysRaw = request.nextUrl.searchParams.get('days');
  const days = daysRaw === null ? 7 : Number(daysRaw);
  if (!Number.isInteger(days) || days < 1 || days > 31) return fail('days must be 1 to 31.');
  const to = addDays(from, days);
  const lookback = addDays(from, -60); // past due only reaches back two months, so old leftovers don't pile up

  const [events, jobs, campaigns, runs, lateJobs, lateReminders] = await Promise.all([
    supabase.from('calendar_events').select(EVENT_COLUMNS).lte('start_date', to).or(`end_date.gte.${from},and(end_date.is.null,start_date.gte.${from})`).limit(500),
    supabase.from('jobs').select(JOB_COLUMNS).gte('scheduled_date', from).lte('scheduled_date', to).limit(500),
    supabase.from('ad_campaigns').select('id, name, channel, service, start_date, end_date')
      .or(`and(start_date.gte.${from},start_date.lte.${to}),and(end_date.gte.${from},end_date.lte.${to})`).limit(200),
    supabase.from('route_runs').select('id, route_group, run_date, helper').not('completed_at', 'is', null).gte('run_date', from).lte('run_date', to).limit(100),
    supabase.from('jobs').select(JOB_COLUMNS).eq('done', false).lt('scheduled_date', from).gte('scheduled_date', lookback).order('scheduled_date', { ascending: true }).limit(50),
    supabase.from('calendar_events').select(EVENT_COLUMNS).eq('category', 'reminder').eq('done', false).lt('start_date', from).gte('start_date', lookback).order('start_date', { ascending: true }).limit(50),
  ]);

  for (const r of [events, jobs, campaigns, runs, lateJobs, lateReminders]) {
    if (r.error) return fail(r.error.message, 500);
  }

  // Client names for events that have one.
  const clientIds = [...new Set([...(events.data || []), ...(lateReminders.data || [])].map((e) => e.client_id).filter(Boolean))];
  const clientsById = new Map();
  if (clientIds.length) {
    const { data: clients, error } = await supabase.from('clients').select('id, name').in('id', clientIds);
    if (error) return fail(error.message, 500);
    for (const c of clients || []) clientsById.set(c.id, c);
  }

  // Plain items for the page: no raw rows, and each one says where to click through to.
  const plain = (item) => {
    const { event, job, ...rest } = item; // eslint-disable-line no-unused-vars
    return { ...rest, href: item.href || '/admin/calendar' };
  };

  const items = buildItems({
    events: (events.data || []).map(shapeTimes),
    campaigns: (campaigns.data || []).filter((c) => (c.start_date >= from && c.start_date <= to) || (c.end_date >= from && c.end_date <= to)),
    runs: runs.data || [],
    jobs: jobs.data || [],
    clientsById,
  })
    // buildItems lists a campaign's start and end whenever it has them; keep only the ones that fall in this window.
    .filter((i) => i.end >= from && i.start <= to)
    .map(plain);

  const overdue = buildItems({
    events: (lateReminders.data || []).map(shapeTimes),
    jobs: lateJobs.data || [],
    clientsById,
  }).map(plain).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  return NextResponse.json({ from, to, items, overdue });
}
