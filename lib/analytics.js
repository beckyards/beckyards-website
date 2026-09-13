// Shared helpers for the first-party analytics pipeline.
//
//  - classify* / parseRequestMeta / visitorHash   → used by the ingest route
//    (app/api/track/route.js) to turn a raw request into a privacy-safe row.
//  - aggregate                                    → used by the admin routes
//    (app/api/admin/stats + /analytics) to roll raw rows up into the numbers
//    the dashboard shows.
//
// No IP address or raw user-agent string is ever stored. `visitorHash` is a
// one-way hash of (salt + day + ip + ua); it lets us count unique visitors
// within a single day but cannot be reversed to an IP or linked across days.

import { createHash } from 'crypto';

const BOT_RE =
  /bot|crawl|spider|slurp|bing|yandex|duckduck|baidu|preview|facebookexternalhit|embedly|quora|pinterest|whatsapp|telegram|slackbot|discordbot|lighthouse|headless|chrome-lighthouse|monitor|uptime|pingdom|curl|wget|python-requests|node-fetch|axios|go-http|semrush|ahrefs|dataprovider|screaming/i;

export function isBot(ua = '') {
  return !ua || BOT_RE.test(ua);
}

export function classifyDevice(ua = '') {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobi))/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/.test(s)) return 'mobile';
  return 'desktop';
}

export function classifyBrowser(ua = '') {
  const s = ua.toLowerCase();
  if (s.includes('edg/') || s.includes('edga') || s.includes('edgios')) return 'Edge';
  if (s.includes('opr/') || s.includes('opera')) return 'Opera';
  if (s.includes('samsungbrowser')) return 'Samsung';
  if (s.includes('firefox') || s.includes('fxios')) return 'Firefox';
  if (s.includes('crios')) return 'Chrome';
  if (s.includes('chrome') && !s.includes('chromium')) return 'Chrome';
  if (s.includes('safari')) return 'Safari';
  return 'Other';
}

export function classifyOS(ua = '') {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'iOS';
  if (s.includes('android')) return 'Android';
  if (s.includes('windows')) return 'Windows';
  if (s.includes('mac os') || s.includes('macintosh')) return 'macOS';
  if (s.includes('cros')) return 'ChromeOS';
  if (s.includes('linux')) return 'Linux';
  return 'Other';
}

// A page path we are willing to store: absolute, no query string, capped length,
// and never an admin or API route. Returns null to drop the event.
export function normalizePath(raw) {
  if (typeof raw !== 'string') return null;
  let p = raw.trim();
  if (!p.startsWith('/')) return null;
  const q = p.search(/[?#]/);
  if (q !== -1) p = p.slice(0, q);
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p.length > 512) p = p.slice(0, 512);
  if (p.startsWith('/admin') || p.startsWith('/api')) return null;
  return p || '/';
}

// Just the hostname of an external referrer. Same-site referrers (internal
// navigation) and junk collapse to null so "Direct / none" stays meaningful.
export function referrerHost(raw, selfHost) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const h = new URL(raw).hostname.replace(/^www\./, '');
    if (!h || h === selfHost || h === `www.${selfHost}` || h === 'localhost') return null;
    return h.slice(0, 128);
  } catch {
    return null;
  }
}

export function visitorHash({ salt, ip, ua, day }) {
  return createHash('sha256')
    .update(`${salt}|${day}|${ip || ''}|${ua || ''}`)
    .digest('hex')
    .slice(0, 32);
}

// Pull IP / UA / country out of the platform headers (Vercel + generic proxies).
export function requestMeta(headers) {
  const get = (k) => headers.get(k) || '';
  const ip =
    (get('x-forwarded-for').split(',')[0] || '').trim() ||
    get('x-real-ip') ||
    get('x-vercel-forwarded-for') ||
    '';
  const ua = get('user-agent');
  const country =
    get('x-vercel-ip-country') ||
    get('cf-ipcountry') ||
    null;
  return { ip, ua, country: country && country !== 'XX' ? country.toUpperCase() : null };
}

// ---------------------------------------------------------------------------
// Aggregation (admin side)
// ---------------------------------------------------------------------------

function dayKey(iso, tzOffsetMinutes = 0) {
  const d = new Date(new Date(iso).getTime() - tzOffsetMinutes * 60_000);
  return d.toISOString().slice(0, 10);
}

function topBy(rows, field, limit = 8) {
  const views = new Map();
  const visitors = new Map();
  for (const r of rows) {
    const label = (r[field] == null || r[field] === '') ? '(none)' : String(r[field]);
    views.set(label, (views.get(label) || 0) + 1);
    if (r.visitor_hash) {
      if (!visitors.has(label)) visitors.set(label, new Set());
      visitors.get(label).add(r.visitor_hash);
    }
  }
  return [...views.entries()]
    .map(([label, v]) => ({ label, views: v, visitors: visitors.get(label)?.size || 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// rows: raw analytics_events (already filtered to the window and type=pageview).
// windowStart / windowEnd / prevStart: Date objects bounding "this period" and
// the same-length period immediately before it, for the % change chips.
export function aggregate(rows, { windowStart, windowEnd, prevStart, tzOffsetMinutes = 0 }) {
  const inRange = (r) => {
    const t = new Date(r.created_at).getTime();
    return t >= windowStart.getTime() && t < windowEnd.getTime();
  };
  const cur = rows.filter(inRange);
  const prev = rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= prevStart.getTime() && t < windowStart.getTime();
  });

  const uniq = (list) => new Set(list.map((r) => r.visitor_hash).filter(Boolean)).size;

  // Daily series across the current window, one bucket per local calendar day.
  const byDay = new Map();
  const spanDays = Math.round((windowEnd.getTime() - windowStart.getTime()) / 86400000);
  const startLocalMs = windowStart.getTime() - tzOffsetMinutes * 60000;
  for (let i = 0; i <= spanDays; i++) {
    const key = new Date(startLocalMs + i * 86400000).toISOString().slice(0, 10);
    byDay.set(key, { views: 0, visitorSet: new Set() });
  }
  for (const r of cur) {
    const k = dayKey(r.created_at, tzOffsetMinutes);
    const slot = byDay.get(k);
    if (!slot) continue;
    slot.views += 1;
    if (r.visitor_hash) slot.visitorSet.add(r.visitor_hash);
  }
  const series = [...byDay.entries()].map(([day, s]) => ({
    day,
    views: s.views,
    visitors: s.visitorSet.size,
  }));

  const pct = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

  return {
    totals: {
      views: cur.length,
      visitors: uniq(cur),
      viewsPrev: prev.length,
      visitorsPrev: uniq(prev),
      viewsDelta: pct(cur.length, prev.length),
      visitorsDelta: pct(uniq(cur), uniq(prev)),
      viewsPerVisitor: uniq(cur) ? +(cur.length / uniq(cur)).toFixed(1) : 0,
    },
    series,
    topPages: topBy(cur, 'path', 10),
    referrers: topBy(cur, 'referrer_host', 8),
    devices: topBy(cur, 'device', 5),
    browsers: topBy(cur, 'browser', 6),
    operatingSystems: topBy(cur, 'os', 6),
    countries: topBy(cur.filter((r) => r.country), 'country', 10),
  };
}
