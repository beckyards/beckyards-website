// Server-only. Shared by the admin dashboard + analytics routes. The
// analytics_events table has RLS enabled with no policies, so it is only ever
// read through a service-role client — callers get one from
// requireAdminClient() and pass it in here rather than each making their own.

const MAX_ROWS = 100000;

export function parseRangeDays(raw) {
  const map = { '24h': 1, '1d': 1, '7d': 7, '14d': 14, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };
  const d = map[String(raw || '').toLowerCase()] || 30;
  return Math.max(1, Math.min(365, d));
}

export async function fetchEvents(supabase, since) {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('created_at,path,referrer_host,visitor_hash,device,browser,os,country')
    .eq('type', 'pageview')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);

  if (error) throw new Error(error.message);
  return data || [];
}
