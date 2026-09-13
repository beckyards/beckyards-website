import { NextResponse } from 'next/server';
import { requireAdminClient } from '../../../../lib/adminAuth';
import { CONTENT_KEYS } from '../../../../lib/siteContent';
import { fetchEvents } from '../../../../lib/analyticsQuery';
import { aggregate } from '../../../../lib/analytics';

export const dynamic = 'force-dynamic';

const BUCKET = 'media';

// GET /api/admin/stats?tz=<minutes>
// One call that powers the whole dashboard landing page: a 14-day traffic
// snapshot plus counts for messages, stored images and active content overrides.
export async function GET(request) {
  const { client: supabase, error: authError } = await requireAdminClient();
  if (authError) return authError;

  const tzOffsetMinutes = Math.max(
    -840,
    Math.min(840, parseInt(new URL(request.url).searchParams.get('tz') || '0', 10) || 0)
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - 14 * 86400000); // last 14 days
  const prevStart = new Date(windowStart.getTime() - 14 * 86400000);

  const out = {
    generatedAt: now.toISOString(),
    traffic: null,
    messages: { total: 0, unread: 0 },
    images: { count: 0 },
    overrides: [],
    warnings: [],
  };

  // --- Traffic (never fatal: a fresh analytics table just means zeros) ---
  try {
    const rows = await fetchEvents(supabase, prevStart);
    const agg = aggregate(rows, {
      windowStart,
      windowEnd: now,
      prevStart,
      tzOffsetMinutes,
    });
    out.traffic = {
      totals: agg.totals,
      series: agg.series,
      topPages: agg.topPages.slice(0, 6),
      referrers: agg.referrers.slice(0, 5),
    };
  } catch (e) {
    out.warnings.push(`analytics: ${e.message}`);
  }

  // --- Messages ---
  try {
    const total = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true });
    const unread = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
      .eq('archived', false);
    out.messages = { total: total.count || 0, unread: unread.count || 0 };
  } catch (e) {
    out.warnings.push(`messages: ${e.message}`);
  }

  // --- Stored images ---
  try {
    const { data } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
    out.images.count = (data || []).filter((r) => r.id && !r.name.startsWith('.')).length;
  } catch (e) {
    out.warnings.push(`images: ${e.message}`);
  }

  // --- Content overrides in effect ---
  try {
    const { data } = await supabase
      .from('site_content')
      .select('key, updated_at')
      .in('key', CONTENT_KEYS);
    out.overrides = (data || []).map((r) => ({ key: r.key, updatedAt: r.updated_at }));
  } catch (e) {
    out.warnings.push(`overrides: ${e.message}`);
  }

  return NextResponse.json(out);
}
