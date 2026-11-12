// Shared by the Jobs admin page and /api/admin/jobs.

export const PRIORITIES = ['high', 'medium', 'low'];
export const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// One-tap estimated-time options for the quick-add bar (minutes).
export const TIME_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
  { label: 'Full day', minutes: 480 },
];

export const MAX_MINUTES = 14400; // 10 days; matches the DB check constraint

// 45 -> "45 min", 60 -> "1 hr", 90 -> "1 hr 30 min", 480 -> "8 hr"
export function formatMinutes(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

// Compact form for tight spaces: 45 -> "45m", 90 -> "1h 30m", 120 -> "2h"
export function formatMinutesShort(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Forgiving free-text -> minutes. Accepts "45", "45m", "45 min", "1h", "1.5h",
// "1 hr 30", "1h30", "2 hours", "1:30". Returns a positive integer, or null when
// the text is empty or can't be understood (callers treat null as "not set").
export function parseDuration(input) {
  if (input === null || input === undefined) return null;
  const text = String(input).trim().toLowerCase();
  if (!text) return null;

  const clock = text.match(/^(\d+):(\d{1,2})$/);
  if (clock) return clampMinutes(Number(clock[1]) * 60 + Number(clock[2]));

  const hm = text.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes)?)?$/);
  if (hm) return clampMinutes(Math.round(Number(hm[1]) * 60 + (hm[2] ? Number(hm[2]) : 0)));

  const mins = text.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)?$/);
  if (mins) return clampMinutes(Math.round(Number(mins[1])));

  return null;
}

function clampMinutes(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, MAX_MINUTES);
}

// Total estimated minutes for a list of jobs (jobs with no estimate count as 0).
export function totalMinutes(jobs) {
  return jobs.reduce((sum, j) => sum + (Number(j.estimated_minutes) > 0 ? Number(j.estimated_minutes) : 0), 0);
}

// ---- Estimated income (dollars) ----

export const MAX_INCOME = 1000000; // matches the DB check constraint

// One-tap amounts for the income picker.
export const INCOME_PRESETS = [50, 100, 150, 200, 300, 500];

const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 150 -> "$150", 150.5 -> "$150.50", 1234 -> "$1,234". Empty for unset.
export function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  // Whole dollars drop the cents; anything else shows both decimals.
  return Math.round(n * 100) % 100 === 0 ? usdWhole.format(n) : usdCents.format(n);
}

// Whole dollars (plain, or with proper thousands commas) plus optional cents.
// "1,50" and "15,50" are rejected rather than read as $150 / $1,550.
const MONEY_RE = /^(\d+|\d{1,3}(,\d{3})+)(\.\d{0,2})?$/;

// Forgiving free-text -> dollars. Accepts "150", "$150", "1,200", "150.50", "$1,200.5", "150.".
// Returns a number rounded to cents, or null when empty / not understood / out of range.
// Shared by the quick-add box and the API so both sides agree on what's valid.
export function parseMoney(input) {
  if (input === null || input === undefined) return null;
  const text = String(input).trim().replace(/^\$\s*/, '');
  if (!MONEY_RE.test(text)) return null;
  const n = Math.round(Number(text.replace(/,/g, '')) * 100) / 100;
  if (!Number.isFinite(n) || n < 0 || n > MAX_INCOME) return null;
  return n;
}

// Total estimated income for a list of jobs (jobs with no amount count as 0).
// Summed in cents so floating-point never shows $0.30000000000000004.
export function totalIncome(jobs) {
  const cents = jobs.reduce((sum, j) => {
    const n = Number(j.estimated_income);
    return sum + (Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0);
  }, 0);
  return cents / 100;
}

// Open jobs first, then High -> Medium -> Low, then manual sort_order / age.
export function compareJobs(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const pr = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  if (pr !== 0) return pr;
  return Number(a.sort_order) - Number(b.sort_order);
}
