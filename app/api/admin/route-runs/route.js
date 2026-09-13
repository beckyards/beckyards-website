import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

const GROUPS = new Set(['A', 'B']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET ?runId=<id>        -- one run + its checklist items (today's or a past one)
// GET (no params)        -- history: every run, newest first, with a checked/total count
export async function GET(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const runId = request.nextUrl.searchParams.get('runId');

  if (runId) {
    const { data: run, error: runError } = await supabase
      .from('route_runs')
      .select('id, route_group, run_date, created_at, completed_at, helper')
      .eq('id', runId)
      .single();
    if (runError) return NextResponse.json({ error: 'Run not found.' }, { status: 404 });

    const { data: items, error: itemsError } = await supabase
      .from('route_run_items')
      .select('id, client_id, name, price, mowing_height, checked, checked_at, sort_order')
      .eq('run_id', runId)
      .order('sort_order', { ascending: true });
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

    return NextResponse.json({ run, items: items || [] });
  }

  const { data: runs, error: runsError } = await supabase
    .from('route_runs')
    .select('id, route_group, run_date, created_at, completed_at, helper')
    .order('run_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });

  const runIds = (runs || []).map((r) => r.id);
  let counts = {};
  if (runIds.length) {
    const { data: allItems, error: countError } = await supabase
      .from('route_run_items')
      .select('run_id, checked, price')
      .in('run_id', runIds);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    counts = (allItems || []).reduce((acc, i) => {
      const c = acc[i.run_id] || { total: 0, checked: 0, earned: 0 };
      c.total += 1;
      if (i.checked) {
        c.checked += 1;
        c.earned += i.price != null ? Number(i.price) : 0;
      }
      acc[i.run_id] = c;
      return acc;
    }, {});
  }

  const withCounts = (runs || []).map((r) => ({
    ...r,
    total: counts[r.id]?.total || 0,
    checked: counts[r.id]?.checked || 0,
    earned: counts[r.id]?.earned || 0,
  }));

  return NextResponse.json({ runs: withCounts });
}

// POST { route_group, date } -- get today's *unfinished* run for that group,
// or create a fresh one (snapshotting the current client list) if there
// isn't one yet -- either because none was started today, or because the
// day's run was already completed (completing a run resets the route: the
// next visit snapshots whatever is currently in Clients). `date` is the
// browser's local YYYY-MM-DD so "today" matches the person mowing, not the
// server's timezone.
export async function POST(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const routeGroup = body?.route_group;
  if (!GROUPS.has(routeGroup)) {
    return NextResponse.json({ error: 'route_group must be "A" or "B".' }, { status: 400 });
  }
  const date = body?.date;
  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD.' }, { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from('route_runs')
    .select('id')
    .eq('route_group', routeGroup)
    .eq('run_date', date)
    .is('completed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });

  let runId = existing?.id;

  if (!runId) {
    const { data: newRun, error: runError } = await supabase
      .from('route_runs')
      .insert([{ route_group: routeGroup, run_date: date }])
      .select('id')
      .single();

    if (runError) {
      // Two requests can race to create today's run (e.g. a fast double-tap).
      // A partial unique index (route_group, run_date) where completed_at is
      // null rejects the loser here -- fall back to the winner's row instead
      // of erroring or creating a duplicate.
      if (runError.code === '23505') {
        const { data: winner, error: winnerError } = await supabase
          .from('route_runs')
          .select('id')
          .eq('route_group', routeGroup)
          .eq('run_date', date)
          .is('completed_at', null)
          .single();
        if (winnerError) return NextResponse.json({ error: winnerError.message }, { status: 500 });
        runId = winner.id;
      } else {
        return NextResponse.json({ error: runError.message }, { status: 500 });
      }
    } else {
      runId = newRun.id;
    }
  }

  // Only snapshot clients into a run that has none yet -- covers both the
  // normal "just created" case and the race-condition fallback above, without
  // needing to track which branch ran.
  const { count, error: countError } = await supabase
    .from('route_run_items')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', runId);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  if (!count) {
    const { data: clients, error: clientsError } = await supabase
      .from('mowing_clients')
      .select('id, name, price, mowing_height')
      .eq('route_group', routeGroup)
      .order('sort_order', { ascending: true });
    if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 500 });

    if (clients?.length) {
      const rows = clients.map((c, i) => ({
        run_id: runId,
        client_id: c.id,
        name: c.name,
        price: c.price,
        mowing_height: c.mowing_height,
        sort_order: i,
      }));
      const { error: insertError } = await supabase.from('route_run_items').insert(rows);
      // A concurrent request may have already snapshotted this run (raced
      // past the count check above) -- a unique (run_id, client_id) violation
      // just means someone beat us to it, which is fine.
      if (insertError && insertError.code !== '23505') {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  const { data: run, error: runFetchError } = await supabase
    .from('route_runs')
    .select('id, route_group, run_date, created_at, completed_at, helper')
    .eq('id', runId)
    .single();
  if (runFetchError) return NextResponse.json({ error: runFetchError.message }, { status: 500 });

  const { data: items, error: itemsError } = await supabase
    .from('route_run_items')
    .select('id, client_id, name, price, mowing_height, checked, checked_at, sort_order')
    .eq('run_id', runId)
    .order('sort_order', { ascending: true });
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json({ run, items: items || [] });
}

// PATCH { item_id, checked } -- mark one client done (or undone) for a run.
// PATCH { run_id, complete: true } -- finalize a run into history. The next
// POST for that group/day then starts a brand new run (see POST above).
// PATCH { run_id, helper } -- note who helped on this run (free text).
export async function PATCH(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  if (body?.run_id) {
    const patch = {};
    if (body.complete) patch.completed_at = new Date().toISOString();
    if ('helper' in body) {
      const helper = typeof body.helper === 'string' ? body.helper.trim() : body.helper;
      patch.helper = helper || null;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }
    const { error } = await supabase.from('route_runs').update(patch).eq('id', body.run_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { item_id: itemId } = body || {};
  if (!itemId) return NextResponse.json({ error: 'Missing item_id.' }, { status: 400 });

  const checked = Boolean(body.checked);
  const { error } = await supabase
    .from('route_run_items')
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq('id', itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
