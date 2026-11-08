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

// Open jobs first, then High -> Medium -> Low, then manual sort_order / age.
export function compareJobs(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const pr = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  if (pr !== 0) return pr;
  return Number(a.sort_order) - Number(b.sort_order);
}
