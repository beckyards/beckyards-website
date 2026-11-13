'use client';

import { Panel } from './ui';
import { formatDay } from '../../../../lib/advertising';
import { CATEGORY_LABELS, addDays, formatTimeRange, itemsByDay, longDay } from '../../../../lib/calendar';

// One line on the dashboard: a colored bar for the type, when, what, and who/where. Click goes to where it lives.
function Row({ item }) {
  const when = item.end > item.start ? `${formatDay(item.start)} – ${formatDay(item.end)}` : formatTimeRange(item.time, item.endTime) || 'All day';
  return (
    <li className={`cal-row dash-row${item.done ? ' is-done' : ''}`} data-cat={item.category}>
      <a className="cal-row-line dash-link" href={item.href}>
        <div className="cal-row-main">
          <span className="cal-when">{when}</span>
          <strong>{item.title}</strong>
          {item.sub && <span className="ad-c-sub">{item.sub}</span>}
        </div>
        <span className="cal-tag dash-tag">{CATEGORY_LABELS[item.category]}</span>
      </a>
    </li>
  );
}

// "Today and the week ahead", built from the Calendar (your events, dated jobs, ad dates, mowing runs).
export default function DashboardWeek({ data }) {
  const byDay = itemsByDay(data.items, data.from, data.to);
  const today = byDay.get(data.from) || [];
  const laterDays = [...byDay.keys()].filter((d) => d > data.from).sort();
  const tomorrow = addDays(data.from, 1);

  return (
    <Panel
      title="Today & the week ahead"
      meta={`${formatDay(data.from)} – ${formatDay(data.to)}`}
      actions={<a className="admin-mini" href="/admin/calendar">Open calendar</a>}
    >
      <div className="cal-page dash-week">
        {data.overdue.length > 0 && (
          <section className="dash-late" aria-label="Past due">
            <h3 className="dash-day">Past due <span>Dated jobs and reminders not ticked off yet</span></h3>
            <ul className="cal-list">
              {data.overdue.map((it) => (
                <li key={it.key} className="cal-row dash-row" data-cat={it.category}>
                  <a className="cal-row-line dash-link" href={it.href}>
                    <div className="cal-row-main">
                      <span className="cal-when">{longDay(it.start)}</span>
                      <strong>{it.title}</strong>
                      {it.sub && <span className="ad-c-sub">{it.sub}</span>}
                    </div>
                    <span className="cal-tag dash-tag">{CATEGORY_LABELS[it.category]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Today">
          <h3 className="dash-day">Today <span>{longDay(data.from)}</span></h3>
          {today.length === 0 ? (
            <p className="ad-empty-line">Nothing planned today.</p>
          ) : (
            <ul className="cal-list">{today.map((it) => <Row key={it.key} item={it} />)}</ul>
          )}
        </section>

        <section aria-label="The week ahead">
          {laterDays.length === 0 ? (
            <>
              <h3 className="dash-day">Coming up <span>Next 7 days</span></h3>
              <p className="ad-empty-line">Nothing else on the calendar this week.</p>
            </>
          ) : (
            laterDays.map((day) => (
              <div key={day} className="dash-daygroup">
                <h3 className="dash-day">
                  {day === tomorrow ? 'Tomorrow' : longDay(day).split(', ')[0]}
                  <span>{day === tomorrow ? longDay(day) : longDay(day).split(', ').slice(1).join(', ')}</span>
                </h3>
                <ul className="cal-list">{(byDay.get(day) || []).map((it) => <Row key={`${it.key}@${day}`} item={it} />)}</ul>
              </div>
            ))
          )}
        </section>
      </div>
    </Panel>
  );
}
