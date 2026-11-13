'use client';

import { Panel } from './ui';
import { formatDay } from '../../../../lib/advertising';
import { CATEGORIES, CATEGORY_LABELS, addDays, dayOfMonth, formatTime, formatTimeRange, itemsByDay, longDay } from '../../../../lib/calendar';

const MAX_PER_DAY = 4;
const MAX_LATE = 4;

// "9:00 AM" -> "9a", "2:30 PM" -> "2:30p"
function shortTime(time) {
  return formatTime(time).replace(':00', '').replace(' AM', 'a').replace(' PM', 'p');
}

function tip(item) {
  const when = item.end > item.start ? `${formatDay(item.start)} – ${formatDay(item.end)}` : formatTimeRange(item.time, item.endTime) || 'All day';
  return [item.title, item.sub, when, CATEGORY_LABELS[item.category]].filter(Boolean).join(' · ');
}

// One small colored tag: what it is, with the time first when it has one. Click goes to where it lives.
function Chip({ item }) {
  return (
    <a className={`dash-chip${item.done ? ' is-done' : ''}`} data-cat={item.category} href={item.href} title={tip(item)}>
      {item.time && <i>{shortTime(item.time)}</i>}
      {item.title}
    </a>
  );
}

// A compact week at a glance: seven day columns (today first), built from the Calendar
// (your events, dated jobs, ad campaign dates, mowing runs). Anything past due gets one slim line above.
export default function DashboardWeek({ data }) {
  const byDay = itemsByDay(data.items, data.from, data.to);
  const days = [];
  for (let d = data.from, i = 0; d <= data.to && i < 14; d = addDays(d, 1), i += 1) days.push(d);

  const late = data.overdue.slice(0, MAX_LATE);
  const lateMore = data.overdue.length - late.length;

  return (
    <Panel
      title="Today & the week ahead"
      meta={`${formatDay(data.from)} – ${formatDay(data.to)}`}
      actions={<a className="admin-mini" href="/admin/calendar">Open calendar</a>}
    >
      <div className="cal-page dash-week">
        {late.length > 0 && (
          <div className="dash-late-bar" role="group" aria-label="Past due">
            <strong>Past due</strong>
            {late.map((it) => (
              <a key={it.key} className="dash-late-item" data-cat={it.category} href={it.href} title={tip(it)}>
                {it.title} <i>{formatDay(it.start)}</i>
              </a>
            ))}
            {lateMore > 0 && <a className="dash-late-more" href="/admin/calendar">+{lateMore} more</a>}
          </div>
        )}

        <div className="dash-strip" role="list" aria-label="The next seven days">
          {days.map((day, idx) => {
            const list = byDay.get(day) || [];
            const isToday = idx === 0;
            const long = longDay(day).split(', ');
            const shown = list.slice(0, MAX_PER_DAY);
            return (
              <section
                key={day}
                role="listitem"
                className={`dash-col${isToday ? ' is-today' : ''}${list.length === 0 ? ' is-empty' : ''}`}
                aria-label={`${longDay(day)}${list.length ? `, ${list.length} ${list.length === 1 ? 'item' : 'items'}` : ', nothing planned'}`}
              >
                <header className="dash-col-head">
                  <span className="dash-wd">{isToday ? 'Today' : long[0].slice(0, 3)}</span>
                  <span className="dash-dn">{dayOfMonth(day)}</span>
                </header>
                <div className="dash-col-items">
                  {list.length === 0 ? (
                    <span className="dash-none"><b aria-hidden="true">—</b><em>Nothing planned</em></span>
                  ) : (
                    <>
                      {shown.map((it) => <Chip key={`${it.key}@${day}`} item={it} />)}
                      {list.length > shown.length && <a className="dash-more" href="/admin/calendar">+{list.length - shown.length} more</a>}
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <ul className="dash-legend" aria-label="Colors">
          {CATEGORIES.map((c) => <li key={c.key} data-cat={c.key}><i aria-hidden="true" />{c.label}</li>)}
        </ul>
      </div>
    </Panel>
  );
}
