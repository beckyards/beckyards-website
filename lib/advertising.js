// Shared by the admin Advertising pages (Campaigns, Leads, Results) and their APIs.
//
// A CAMPAIGN is one advertising effort: a batch of door hangers, a set of yard signs, a month of
// Facebook ads... It has a cost. A LEAD is one person who got in touch. Each lead can be tied to the
// campaign that brought them in, so the totals show what each campaign cost, what it brought in, and
// what it earned. A campaign belongs to the year it STARTS in (its start date), so every year can be
// compared with the last one.

import { parseMoney } from './jobs';

export const CHANNEL_GROUPS = [
  {
    label: 'Online',
    channels: [
      'Facebook / Instagram ads',
      'Google Ads / Local Services',
      'Google Business Profile',
      'Nextdoor',
      'Facebook groups & posts',
      'Website / SEO',
      'Email / text to past clients',
      'Lead sites (Angi, Thumbtack…)',
    ],
  },
  {
    label: 'Print & mail',
    channels: ['Door hangers', 'Flyers', 'Postcards / direct mail', 'Business cards', 'Local newspaper / magazine'],
  },
  {
    label: 'On the ground',
    channels: ['Yard signs', 'Signs at finished jobs', 'Truck / trailer signage', 'Community events & sponsorships'],
  },
  {
    label: 'Referrals & partners',
    channels: ['Referral program', 'Realtor / HOA partnerships', 'Review requests'],
  },
  { label: 'Other', channels: ['Other'] },
];

export const CHANNELS = CHANNEL_GROUPS.flatMap((g) => g.channels);

// What the work is for. Campaigns can aim at one service or all of them.
export const SERVICES = [
  'Mulching',
  'Annual planting',
  'Install jobs',
  'Bed redesign',
  'Mowing',
  'Aeration & overseeding',
  'Leaf cleanup',
  'All services',
];
// A lead asked about one real service (or something else).
export const LEAD_SERVICES = [...SERVICES.filter((s) => s !== 'All services'), 'Other'];

export const CAMPAIGN_STATUSES = ['planned', 'active', 'paused', 'done'];
export const CAMPAIGN_STATUS_LABELS = { planned: 'Planned', active: 'Running', paused: 'Paused', done: 'Finished' };

export const LEAD_STATUSES = ['new', 'quoted', 'won', 'lost'];
export const LEAD_STATUS_LABELS = { new: 'New', quoted: 'Quoted', won: 'Won', lost: 'Lost' };

export const MAX_LEN = { name: 200, channel: 60, service: 60, area: 200, offer: 300, notes: 2000, contact: 200 };
export const MAX_QUANTITY = 10000000;

// Starting points for the "+ New campaign" form: pick one and the form fills in.
// `tip` is a one-line reminder of how to make that kind of ad pay off.
export const IDEAS = [
  { name: 'Spring door hangers', channel: 'Door hangers', service: 'Mulching', offer: 'Book by April 1 for an early-bird price', tip: 'Hit one neighborhood at a time so you can see which streets call.' },
  { name: 'Yard signs at finished jobs', channel: 'Signs at finished jobs', service: 'All services', tip: 'Ask first, and pick the sign up after a week or two. Fresh mulch is your best ad.' },
  { name: 'Yard signs on busy roads', channel: 'Yard signs', service: 'All services', tip: 'Count how many you put out and where, so you can compare roads.' },
  { name: 'Facebook / Instagram spring ads', channel: 'Facebook / Instagram ads', service: 'Bed redesign', tip: 'Use before/after photos. Target a 10-15 mile radius.' },
  { name: 'Google Local Services Ads', channel: 'Google Ads / Local Services', service: 'All services', tip: 'People searching "landscaper near me" are ready to hire.' },
  { name: 'Google Business Profile refresh', channel: 'Google Business Profile', service: 'All services', tip: 'Post photos every week and answer every review.' },
  { name: 'Nextdoor posts', channel: 'Nextdoor', service: 'Mulching', tip: 'Neighbors trust neighbors. Show a nearby job you just finished.' },
  { name: 'Local Facebook group posts', channel: 'Facebook groups & posts', service: 'Annual planting', tip: 'Post photos, not a sales pitch. Reply to everyone who comments.' },
  { name: 'Email / text to past clients', channel: 'Email / text to past clients', service: 'Mulching', offer: 'Past-client spring price', tip: 'Cheapest ad there is. Do it every spring.' },
  { name: 'Referral program', channel: 'Referral program', service: 'All services', offer: '$25 off for you and the friend you send', tip: 'Ask every happy customer in person.' },
  { name: 'Review requests', channel: 'Review requests', service: 'All services', tip: 'Text the review link the day a job finishes.' },
  { name: 'Postcards to a neighborhood', channel: 'Postcards / direct mail', service: 'Bed redesign', tip: 'Mail the same homes twice. The second one works better than the first.' },
  { name: 'Truck & trailer signage', channel: 'Truck / trailer signage', service: 'All services', tip: 'Park where people can see it.' },
  { name: 'Community event or sponsorship', channel: 'Community events & sponsorships', service: 'All services', tip: 'Bring cards and a sign-up sheet.' },
  { name: 'Realtor / HOA partnership', channel: 'Realtor / HOA partnerships', service: 'Install jobs', tip: 'Curb-appeal work before a listing is an easy yes.' },
];

// ---------------------------------------------------------------------------
// Dates ("YYYY-MM-DD" strings; kept as plain strings so time zones can never shift a day)
// ---------------------------------------------------------------------------

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2027-03-15" -> "Mar 15" (or "Mar 15, 2027" when withYear)
export function formatDay(value, withYear = false) {
  if (!isValidDate(value)) return '';
  const [y, m, d] = value.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ''}`;
}

// "Mar 1 – Apr 15", "From Mar 1", "Until Apr 15", or '' when neither is set.
export function formatRange(start, end) {
  if (start && end) return `${formatDay(start)} – ${formatDay(end)}`;
  if (start) return `From ${formatDay(start)}`;
  if (end) return `Until ${formatDay(end)}`;
  return '';
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

// Every money total is added up in cents so it never shows $0.30000000000000004.
function cents(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export function campaignYear(campaign) {
  const d = (campaign && (campaign.start_date || campaign.created_at)) || '';
  const y = Number(String(d).slice(0, 4));
  return Number.isInteger(y) && y > 0 ? y : new Date().getFullYear();
}

// A lead counts toward its campaign's year. A lead with no campaign counts toward the year it came in.
export function leadYear(lead, campaignsById) {
  const c = lead.campaign_id ? campaignsById.get(lead.campaign_id) : null;
  if (c) return campaignYear(c);
  const y = Number(String(lead.lead_date || lead.created_at || '').slice(0, 4));
  return Number.isInteger(y) && y > 0 ? y : new Date().getFullYear();
}

// The numbers for any set of campaigns and the leads that belong to them.
//   revenue   = value of leads marked Won
//   pipeline  = value of leads still New or Quoted (money you might still win)
//   costPerLead / costPerWon / returnPerDollar are null when they can't be worked out yet.
export function rollup(campaigns, leads) {
  let spend = 0;
  for (const c of campaigns) spend += cents(c.cost);
  let revenue = 0;
  let pipeline = 0;
  let won = 0;
  let lost = 0;
  let open = 0;
  for (const l of leads) {
    if (l.status === 'won') { won += 1; revenue += cents(l.value); }
    else if (l.status === 'lost') lost += 1;
    else { open += 1; pipeline += cents(l.value); }
  }
  const count = leads.length;
  return {
    campaigns: campaigns.length,
    spend: spend / 100,
    leads: count,
    won,
    lost,
    open,
    revenue: revenue / 100,
    pipeline: pipeline / 100,
    costPerLead: count > 0 && spend > 0 ? spend / 100 / count : null,
    costPerWon: won > 0 && spend > 0 ? spend / 100 / won : null,
    returnPerDollar: spend > 0 ? revenue / spend : null,
    winRate: won + lost > 0 ? won / (won + lost) : null,
  };
}

// The year of every campaign and lead, sorted newest first.
export function yearsPresent(campaigns, leads) {
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  const years = new Set();
  for (const c of campaigns) years.add(campaignYear(c));
  for (const l of leads) years.add(leadYear(l, byId));
  return [...years].sort((a, b) => b - a);
}

// One campaign's numbers (its own leads only).
export function campaignStats(campaign, leads) {
  return rollup([campaign], leads.filter((l) => l.campaign_id === campaign.id));
}

// Everything for one year, split by channel and by service.
export function yearReport(year, campaigns, leads) {
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  const yc = campaigns.filter((c) => campaignYear(c) === year);
  const yl = leads.filter((l) => leadYear(l, byId) === year);

  const channelNames = new Set(yc.map((c) => c.channel));
  const unknownLeads = yl.filter((l) => !l.campaign_id || !byId.has(l.campaign_id));

  const channels = [...channelNames].map((name) => {
    const cs = yc.filter((c) => c.channel === name);
    const ids = new Set(cs.map((c) => c.id));
    return { name, ...rollup(cs, yl.filter((l) => ids.has(l.campaign_id))) };
  });

  const services = LEAD_SERVICES.map((name) => {
    const ls = yl.filter((l) => (l.service || 'Other') === name);
    return { name, ...rollup([], ls) };
  }).filter((s) => s.leads > 0);
  // Leads with a service we no longer list still show up under Other (above); nothing is dropped.

  return {
    year,
    total: rollup(yc, yl),
    channels,
    services,
    unknown: rollup([], unknownLeads),
  };
}

// 0.5 -> "$0.50", 3.4 -> "$3.40", null -> "—"
export function formatReturn(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

// Whole-number % change from `prev` to `cur`; null when there's nothing to compare to.
export function pctChange(cur, prev) {
  if (prev === null || prev === undefined || !Number.isFinite(prev) || prev === 0) return null;
  if (cur === null || cur === undefined || !Number.isFinite(cur)) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

// Re-exported so the Advertising pages and API read money the same way the Jobs page does.
export { parseMoney };
