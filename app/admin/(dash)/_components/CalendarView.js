'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from './ui';
import { adRequest, campaignOptions } from './adShared';
import { formatDay, todayISO } from '../../../../lib/advertising';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  MAX_LEN,
  buildItems,
  dayOfMonth,
  formatTime,
  formatTimeRange,
  itemsByDay,
  longDay,
  monthGrid,
  monthKey,
  monthLabel,
  shiftMonth,
} from '../../../../lib/calendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// One form for adding an event and for editing one.
function EventForm({ initial, clients, campaigns, submitLabel, busy, onSubmit, onCancel, onDelete }) {
  const [f, setF] = useState(initial);
  const [problem, setProblem] = useState('');
  const [more, setMore] = useState(Boolean(initial.end_date || initial.end_time || initial.client_id || initial.campaign_id || initial.place || initial.notes));

  function set(field, value) {
    setF((prev) => ({ ...prev, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (busy) return;
    const title = f.title.trim();
    if (!title) return setProblem('Say what it is.');
    if (!f.start_date) return setProblem('Pick a date.');
    if (f.end_date && f.end_date < f.start_date) { setMore(true); return setProblem('The end date is before the start date.'); }
    if (f.end_time && !f.start_time) return setProblem('Add a start time too, or clear the end time.');
    if (f.start_time && f.end_time && (!f.end_date || f.end_date === f.start_date) && f.end_time <= f.start_time) return setProblem('The end time has to be after the start time.');
    setProblem('');
    onSubmit({
      title,
      category: f.category,
      start_date: f.start_date,
      end_date: f.end_date || null,
      start_time: f.start_time || null,
      end_time: f.end_time || null,
      client_id: f.client_id || null,
      campaign_id: f.campaign_id || null,
      place: f.place.trim() || null,
      notes: f.notes.trim() || null,
    });
  }

  return (
    <form className="ad-form" onSubmit={submit} aria-label={submitLabel}>
      <div className="ad-form-grid">
        <label className="ad-field ad-f-full">
          <span>What is it?</span>
          <input className="admin-plain-input" value={f.title} maxLength={MAX_LEN.title} placeholder="e.g. Mulch install at the Lee house" autoComplete="off" onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="ad-field ad-f-third">
          <span>Type</span>
          <select className="admin-height-select" value={f.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label className="ad-field ad-f-third">
          <span>Date</span>
          <input className="admin-plain-input" type="date" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </label>
        <label className="ad-field ad-f-third">
          <span>Time (blank = all day)</span>
          <input className="admin-plain-input" type="time" value={f.start_time} onChange={(e) => set('start_time', e.target.value)} />
        </label>
      </div>

      <details className="ad-more" open={more} onToggle={(e) => setMore(e.currentTarget.open)}>
        <summary>More details (optional)</summary>
        <div className="ad-form-grid">
          <label className="ad-field ad-f-third">
            <span>Ends on (if it spans days)</span>
            <input className="admin-plain-input" type="date" value={f.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </label>
          <label className="ad-field ad-f-third">
            <span>Ends at</span>
            <input className="admin-plain-input" type="time" value={f.end_time} onChange={(e) => set('end_time', e.target.value)} />
          </label>
          <label className="ad-field ad-f-third">
            <span>Client</span>
            <select className="admin-height-select" value={f.client_id} onChange={(e) => set('client_id', e.target.value)}>
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="ad-field ad-f-half">
            <span>Where</span>
            <input className="admin-plain-input" value={f.place} maxLength={MAX_LEN.place} placeholder="Address or place" autoComplete="off" onChange={(e) => set('place', e.target.value)} />
          </label>
          <label className="ad-field ad-f-half">
            <span>Related ad</span>
            <select className="admin-height-select" value={f.campaign_id} onChange={(e) => set('campaign_id', e.target.value)}>
              <option value="">None</option>
              {campaignOptions(campaigns).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <label className="ad-field ad-f-full">
            <span>Notes</span>
            <textarea className="admin-plain-input ad-notes" rows={2} value={f.notes} maxLength={MAX_LEN.notes} placeholder="Gate code, what to bring…" onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>
      </details>

      {problem && <p className="admin-error" role="alert">{problem}</p>}

      <div className="ad-form-actions">
        <button type="submit" className="admin-primary" disabled={busy || !f.title.trim()}>{busy ? 'Saving…' : submitLabel}</button>
        <button type="button" className="admin-mini" onClick={onCancel} disabled={busy}>Cancel</button>
        {onDelete && <button type="button" className="admin-mini admin-mini-danger ad-form-delete" onClick={onDelete} disabled={busy}>Delete</button>}
      </div>
    </form>
  );
}

function blankEvent(date) {
  return { title: '', category: 'job', start_date: date, end_date: '', start_time: '', end_time: '', client_id: '', campaign_id: '', place: '', notes: '' };
}

function eventToForm(e) {
  return {
    title: e.title,
    category: e.category,
    start_date: e.start_date,
    end_date: e.end_date || '',
    start_time: e.start_time || '',
    end_time: e.end_time || '',
    client_id: e.client_id || '',
    campaign_id: e.campaign_id || '',
    place: e.place || '',
    notes: e.notes || '',
  };
}

export default function CalendarView() {
  const [events, setEvents] = useState(null);
  const [runs, setRuns] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [campaigns, setCampaigns] = useState(null);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');

  const [today, setToday] = useState(''); // set after load so the server and browser never disagree about the date
  const [month, setMonth] = useState('');
  const [selected, setSelected] = useState('');
  const [view, setView] = useState('month');
  const [hidden, setHidden] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const load = useCallback(() => {
    setError('');
    Promise.all([
      adRequest('/api/admin/calendar', 'GET'),
      adRequest('/api/admin/ad-campaigns', 'GET'),
      adRequest('/api/admin/clients', 'GET').catch(() => ({ items: [] })), // the client list is a nice-to-have
    ])
      .then(([cal, ads, cl]) => {
        setEvents(cal.items || []);
        setRuns(cal.runs || []);
        setJobs(cal.jobs || []);
        setCampaigns(ads.items || []);
        setClients([...(cl.items || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })));
      })
      .catch((e) => setError(e.message || 'Could not load the calendar.'));
  }, []);

  useEffect(() => {
    load();
    const t = todayISO();
    setToday(t);
    setMonth(monthKey(t));
    setSelected(t);
  }, [load]);

  const ready = events !== null && campaigns !== null && today !== '';
  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const allItems = useMemo(
    () => (ready ? buildItems({ events, campaigns, runs, jobs, clientsById }) : []),
    [ready, events, campaigns, runs, jobs, clientsById],
  );
  const items = useMemo(() => allItems.filter((i) => !hidden.has(i.category)), [allItems, hidden]);

  const weeks = useMemo(() => (month ? monthGrid(month) : []), [month]);
  const dayMap = useMemo(
    () => (weeks.length ? itemsByDay(items, weeks[0][0], weeks[weeks.length - 1][6]) : new Map()),
    [items, weeks],
  );
  const selectedItems = useMemo(
    () => (selected ? itemsByDay(items, selected, selected).get(selected) || [] : []),
    [items, selected],
  );
  const listDays = useMemo(() => [...dayMap.keys()].filter((d) => monthKey(d) === month).sort(), [dayMap, month]);

  function openAdd(date) {
    setAddDate(date || selected || today);
    setFormKey((k) => k + 1);
    setAdding(true);
    setEditingId(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function goToday() {
    setMonth(monthKey(today));
    setSelected(today);
  }

  function toggleCategory(key) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function create(fields) {
    setSaving(true);
    setError('');
    try {
      const d = await adRequest('/api/admin/calendar', 'POST', fields);
      setEvents((prev) => [...(prev || []), d.item]);
      setAdding(false);
      setHidden((prev) => { const n = new Set(prev); n.delete(d.item.category); return n; }); // make sure it shows
      setMonth(monthKey(d.item.start_date));
      setSelected(d.item.start_date);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function save(event, fields) {
    setBusyId(event.id);
    setError('');
    try {
      const d = await adRequest('/api/admin/calendar', 'PATCH', { id: event.id, ...fields });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? d.item : e)));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function remove(event) {
    if (!confirm(`Delete “${event.title}” from the calendar? This can't be undone.`)) return;
    setBusyId(event.id);
    setError('');
    try {
      await adRequest('/api/admin/calendar', 'DELETE', { id: event.id });
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  // Jobs live on the Jobs page; from here you can tick one off, take it off the calendar, or give an undated job a day.
  async function patchJob(id, fields) {
    setBusyId(id);
    setError('');
    try {
      const d = await adRequest('/api/admin/jobs', 'PATCH', { id, ...fields });
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...d.item } : j)));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  // Open jobs with no date: the ones that can be put on the calendar.
  const unscheduledJobs = useMemo(
    () => jobs.filter((j) => !j.done && !j.scheduled_date).sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })),
    [jobs],
  );

  // One row in the day panel or the list view. A plain function (not a component) so a row keeps
  // any half-typed edit across re-renders.
  function renderRow(item, showDate) {
    const ev = item.event;
    const job = item.job;
    const busy = (ev && busyId === ev.id) || (job && busyId === job.id);
    const open = ev && editingId === ev.id;
    const when = item.end > item.start
      ? `${formatDay(item.start)} – ${formatDay(item.end)}`
      : formatTimeRange(item.time, item.endTime) || 'All day';
    return (
      <li key={`${item.key}${showDate ? `@${showDate}` : ''}`} className={`cal-row${item.done ? ' is-done' : ''}`} data-cat={item.category}>
        <div className="cal-row-line">
          {ev ? (
            <input
              type="checkbox"
              className="ad-check"
              checked={item.done}
              disabled={busy}
              aria-label={`Done: ${item.title}`}
              onChange={() => save(ev, { done: !ev.done })}
            />
          ) : job ? (
            <input
              type="checkbox"
              className="ad-check"
              checked={item.done}
              disabled={busy}
              aria-label={`Done: ${item.title}`}
              onChange={() => patchJob(job.id, { done: !job.done })}
            />
          ) : (
            <span className="cal-auto-dot" aria-hidden="true" />
          )}
          <div className="cal-row-main">
            <span className="cal-when">{when}</span>
            <strong>{item.title}</strong>
            {item.sub && <span className="ad-c-sub">{item.sub}</span>}
            <span className="cal-tag">{CATEGORY_LABELS[item.category]}{ev ? '' : job ? ' · from Jobs' : ' · from your other pages'}</span>
          </div>
          {ev ? (
            <button type="button" className="admin-mini" aria-expanded={open} disabled={busy} onClick={() => setEditingId(open ? null : ev.id)}>
              {open ? 'Close' : 'Edit'}
            </button>
          ) : job ? (
            <div className="cal-row-btns">
              <a className="admin-mini" href={item.href}>Open</a>
              <button type="button" className="admin-mini" disabled={busy} title="Keeps the job, just removes its date" onClick={() => patchJob(job.id, { scheduled_date: null })}>Take off</button>
            </div>
          ) : (
            <a className="admin-mini" href={item.href}>View</a>
          )}
        </div>
        {open && (
          <div className="cal-row-edit">
            <EventForm
              initial={eventToForm(ev)}
              clients={clients}
              campaigns={campaigns}
              submitLabel="Save changes"
              busy={busy}
              onCancel={() => setEditingId(null)}
              onDelete={() => remove(ev)}
              onSubmit={async (fields) => { if (await save(ev, fields)) setEditingId(null); }}
            />
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="admin-page ad-page cal-page">
      <h1>Calendar</h1>
      <p className="admin-lead">
        Your whole business on one calendar. Give a job a date and it shows up here, or add
        appointments, deadlines and reminders. Ad campaign dates and finished mowing routes appear on their own.
      </p>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {!ready ? (
        error ? <button type="button" className="admin-mini" onClick={load}>Try again</button> : <Skeleton h={420} />
      ) : (
        <>
          <div className="cal-toolbar">
            <div className="cal-nav" role="group" aria-label="Change month">
              <button type="button" className="admin-mini" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
              <button type="button" className="admin-mini" onClick={goToday}>Today</button>
              <button type="button" className="admin-mini" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
            </div>
            <h2 className="cal-month">{monthLabel(month)}</h2>
            <div className="cal-toolbar-right">
              <div className="seg" role="group" aria-label="How to show it">
                <button type="button" className={view === 'month' ? 'is-active' : undefined} aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button>
                <button type="button" className={view === 'list' ? 'is-active' : undefined} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
              </div>
              <button type="button" className="admin-primary ad-new-btn" onClick={() => openAdd(selected)}>+ Add event</button>
            </div>
          </div>

          <div className="cal-filters" role="group" aria-label="Show or hide types">
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" className="cal-filter" data-cat={c.key} aria-pressed={!hidden.has(c.key)} onClick={() => toggleCategory(c.key)}>
                <i aria-hidden="true" />{c.label}
              </button>
            ))}
          </div>

          {adding && (
            <div className="ad-card" ref={formRef}>
              <EventForm
                key={`${formKey}-${addDate}`}
                initial={blankEvent(addDate)}
                clients={clients}
                campaigns={campaigns}
                submitLabel="Add to calendar"
                busy={saving}
                onCancel={() => setAdding(false)}
                onSubmit={create}
              />
            </div>
          )}

          {view === 'month' ? (
            <>
              <div className="cal-grid" role="grid" aria-label={monthLabel(month)}>
                {WEEKDAYS.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
                {weeks.flat().map((date) => {
                  const list = dayMap.get(date) || [];
                  const outside = monthKey(date) !== month;
                  return (
                    <button
                      key={date}
                      type="button"
                      role="gridcell"
                      className={`cal-cell${outside ? ' is-outside' : ''}${date === today ? ' is-today' : ''}${date === selected ? ' is-selected' : ''}`}
                      aria-label={`${longDay(date)}${list.length ? `, ${list.length} ${list.length === 1 ? 'item' : 'items'}` : ''}`}
                      aria-pressed={date === selected}
                      onClick={() => { setSelected(date); if (outside) setMonth(monthKey(date)); }}
                      onDoubleClick={() => openAdd(date)}
                    >
                      <span className="cal-daynum">{dayOfMonth(date)}</span>
                      <span className="cal-chips">
                        {list.slice(0, 3).map((it) => (
                          <span key={it.key} className={`cal-chip${it.done ? ' is-done' : ''}`} data-cat={it.category}>
                            {it.time && <i>{formatTime(it.time).replace(':00', '').replace(' ', '').toLowerCase()}</i>}
                            {it.title}
                          </span>
                        ))}
                        {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
                      </span>
                      {list.length > 0 && (
                        <span className="cal-dots" aria-hidden="true">
                          {list.slice(0, 4).map((it) => <i key={it.key} data-cat={it.category} />)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <section className="cal-day" aria-label={longDay(selected)}>
                <header className="cal-day-head">
                  <h2>{longDay(selected)}{selected === today && <span className="ad-chip is-ok">Today</span>}</h2>
                  <div className="cal-day-actions">
                    {unscheduledJobs.length > 0 && (
                      <select
                        className="admin-height-select cal-job-select"
                        aria-label="Schedule a job on this day"
                        value=""
                        onChange={(e) => { if (e.target.value) patchJob(e.target.value, { scheduled_date: selected }); }}
                      >
                        <option value="">Schedule a job on this day…</option>
                        {unscheduledJobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.client_name ? ` (${j.client_name})` : ''}</option>)}
                      </select>
                    )}
                    <button type="button" className="admin-mini" onClick={() => openAdd(selected)}>+ Add on this day</button>
                  </div>
                </header>
                {selectedItems.length === 0 ? (
                  <p className="ad-empty-line">Nothing planned for this day.</p>
                ) : (
                  <ul className="cal-list">{selectedItems.map((it) => renderRow(it))}</ul>
                )}
              </section>
            </>
          ) : (
            <div className="cal-agenda">
              {listDays.length === 0 ? (
                <p className="ad-empty ad-empty-big">Nothing on the calendar in {monthLabel(month)}.</p>
              ) : (
                listDays.map((date) => (
                  <section key={date} className="cal-day" aria-label={longDay(date)}>
                    <header className="cal-day-head">
                      <h2>{longDay(date)}{date === today && <span className="ad-chip is-ok">Today</span>}</h2>
                    </header>
                    <ul className="cal-list">{(dayMap.get(date) || []).map((it) => renderRow(it, date))}</ul>
                  </section>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
