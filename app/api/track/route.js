import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createAdminClient } from '../../../lib/supabase/admin';
import {
  isBot,
  classifyDevice,
  classifyBrowser,
  classifyOS,
  normalizePath,
  referrerHost,
  visitorHash,
  requestMeta,
} from '../../../lib/analytics';

// Public, unauthenticated ingest endpoint for the first-party page-view beacon
// (app/components/Analytics.js). It writes to `analytics_events` with the
// service-role key. Everything here is best-effort: a bad or hostile body just
// gets a 204, never an error the visitor could see or probe.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_HOST || 'beckyards.com').replace(/^www\./, '');

// If ANALYTICS_SALT is not set, derive a stable per-environment secret from the
// service-role key so the visitor hash is never computed with a guessable salt.
function salt() {
  if (process.env.ANALYTICS_SALT) return process.env.ANALYTICS_SALT;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY || 'beckyards';
  return createHash('sha256').update(`analytics|${k}`).digest('hex');
}

const NO_CONTENT = new NextResponse(null, { status: 204 });

export async function POST(request) {
  try {
    const { ip, ua, country } = requestMeta(request.headers);

    // Drop bots and known crawlers before touching the database.
    if (isBot(ua)) return NO_CONTENT;

    let body;
    try {
      body = await request.json();
    } catch {
      return NO_CONTENT;
    }

    const path = normalizePath(body?.path);
    if (!path) return NO_CONTENT;

    const day = new Date().toISOString().slice(0, 10);
    const utm = body?.utm || {};

    const row = {
      type: 'pageview',
      path,
      referrer_host: referrerHost(body?.referrer, SITE_HOST),
      visitor_hash: visitorHash({ salt: salt(), ip, ua, day }),
      device: classifyDevice(ua),
      browser: classifyBrowser(ua),
      os: classifyOS(ua),
      country,
      utm_source: typeof utm.source === 'string' ? utm.source.slice(0, 64) : null,
      utm_medium: typeof utm.medium === 'string' ? utm.medium.slice(0, 64) : null,
      utm_campaign: typeof utm.campaign === 'string' ? utm.campaign.slice(0, 64) : null,
    };

    const supabase = createAdminClient();
    await supabase.from('analytics_events').insert(row);
  } catch {
    // Never surface ingest failures to the client.
  }
  return NO_CONTENT;
}

// Some browsers preflight sendBeacon with an OPTIONS; answer it cheaply.
export function OPTIONS() {
  return NO_CONTENT;
}
