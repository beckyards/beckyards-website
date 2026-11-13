// Shared by the admin Calendar page and /api/admin/calendar.
//
// The calendar shows three kinds of things on one grid:
//   - your own events (jobs, appointments, reminders... stored in `calendar_events`)
//   - ad campaigns starting and ending (read from the Ad Campaigns page, nothing to enter twice)
//   - mowing routes you finished (read from Run Route history)
// Dates are plain "YYYY-MM-DD" strings and months are "YYYY-MM", so time zones can never shift a day.

import { isValidDate } from './advertising';

export const CATEGORIES = [
  { key: 'job', label: 'Job' },
  { key: 'mowing', label: 'Mowing' },
  { key: 'advertising', label: 'Advertising' },
  { key: 'meeting', label: 'Appointment' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'other', label: 'Other' },
];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

export const MAX_LEN = { title: 200, place: 300, notes: 2000 };

export { isValidDate };

// ---- Times ("HH:MM", 24-hour) ----

export function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// "14:30" -> "2:30 PM"
export function formatTime(value) {
  if (!isValidTime(value)) return '';
  const [h, m] = value.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// "9:00 AM" or "9:00 AM – 11:30 AM"; '' for an all-day item.
export function formatTimeRange(start, end) {
  if (!start) return '';
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

// ---- Dates ----

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "2027-03-12" -> "2027-03"
export function monthKey(date) {
  return typeof date === 'string' ? date.slice(0, 7) : '';
}

// "2027-03" -> "March 2027"
export function monthLabel(key) {
  const [y, m] = String(key).split('-').map(Number);
  return MONTH_NAMES[m - 1] ? `${MONTH_NAMES[m - 1]} ${y}` : '';
}

// "2027-03-12" -> 12
export function dayOfMonth(value) {
  return isValidDate(value) ? Number(value.slice(8, 10)) : '';
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function fromISO(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(value, n) {
  const d = fromISO(value);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

// "2027-03" shifted by -1 / +1 ...
export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// The weeks shown for a month: an array of 7-day arrays of "YYYY-MM-DD", Sunday first, padded with the
// neighboring months' days so every row is full.
export function monthGrid(key) {
  const [y, m] = key.split('-').map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  const start = new Date(Date.UTC(y, m - 1, 1 - lead));
  const weeks = [];
  for (let w = 0; w < total / 7; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + w * 7 + i);
      row.push(toISO(d));
    }
    weeks.push(row);
  }
  return weeks;
}

// "Friday, March 12"
export function longDay(value) {
  if (!isValidDate(value)) return '';
  return fromISO(value).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// ---- Putting it all together ----

// Turns your events, the ad campaigns and the finished mowing runs into one list of items:
//   { key, source: 'event' | 'ad' | 'mowing', category, title, sub, start, end, time, endTime, done, event?, href? }
// `end` is never before `start`. Only items from your own events (source 'event') can be edited here.
export function buildItems({ events = [], campaigns = [], runs = [], clientsById = new Map() }) {
  const items = [];

  for (const e of events) {
    const client = e.client_id ? clientsById.get(e.client_id) : null;
    items.push({
      key: `event-${e.id}`,
      source: 'event',
      category: e.category,
      title: e.title,
      sub: [client && client.name, e.place].filter(Boolean).join(' · '),
      start: e.start_date,
      end: e.end_date && e.end_date > e.start_date ? e.end_date : e.start_date,
      time: e.start_time || '',
      endTime: e.end_time || '',
      done: Boolean(e.done),
      event: e,
    });
  }

  for (const c of campaigns) {
    const sub = [c.channel, c.service].filter(Boolean).join(' · ');
    if (c.start_date) {
      items.push({ key: `ad-start-${c.id}`, source: 'ad', category: 'advertising', title: `Ad starts: ${c.name}`, sub, start: c.start_date, end: c.start_date, time: '', endTime: '', done: false, href: '/admin/ad-campaigns' });
    }
    if (c.end_date && c.end_date !== c.start_date) {
      items.push({ key: `ad-end-${c.id}`, source: 'ad', category: 'advertising', title: `Ad ends: ${c.name}`, sub, start: c.end_date, end: c.end_date, time: '', endTime: '', done: false, href: '/admin/ad-campaigns' });
    }
  }

  for (const r of runs) {
    if (!r.run_date) continue;
    items.push({
      key: `mow-${r.id}`,
      source: 'mowing',
      category: 'mowing',
      title: `Mowed Route ${r.route_group}`,
      sub: r.helper ? `With ${r.helper}` : '',
      start: r.run_date,
      end: r.run_date,
      time: '',
      endTime: '',
      done: false,
      href: `/admin/route-run?runId=${r.id}`,
    });
  }

  return items;
}

// Which items fall on each day of a range: Map of "YYYY-MM-DD" -> items, in reading order
// (all-day and multi-day first, then by time, then by title). Multi-day items appear on every day they cover.
export function itemsByDay(items, fromDate, toDate) {
  const map = new Map();
  for (const item of items) {
    const first = item.start < fromDate ? fromDate : item.start;
    const last = item.end > toDate ? toDate : item.end;
    if (first > last) continue;
    let day = first;
    for (let guard = 0; day <= last && guard < 400; guard++) {
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
      day = addDays(day, 1);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) =>
      (a.time ? 1 : 0) - (b.time ? 1 : 0) ||
      String(a.time).localeCompare(String(b.time)) ||
      a.title.localeCompare(b.title),
    );
  }
  return map;
}
