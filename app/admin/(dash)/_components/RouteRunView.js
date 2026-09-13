'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from './ui';

function formatHeight(n) {
  if (n == null) return '—';
  return `${Number(Number(n).toFixed(2))}"`;
}

function money(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function fullDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

// The browser's local YYYY-MM-DD, so "today" matches the person mowing
// rather than the server's timezone.
function localDateString() {
  const d = new Date();
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default function RouteRunView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const group = searchParams.get('group');
  const runId = searchParams.get('runId');

  const [run, setRun] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [history, setHistory] = useState(null);
  const [helperDraft, setHelperDraft] = useState('');

  useEffect(() => { setHelperDraft(run?.helper || ''); }, [run?.id, run?.helper]);

  useEffect(() => {
    if (group || runId) return; // only needed on the picker screen
    fetch('/api/admin/route-runs')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setHistory((d.runs || []).filter((r) => r.completed_at));
      })
      .catch(() => {});
  }, [group, runId]);

  const startRoute = useCallback((g) => {
    return fetch('/api/admin/route-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_group: g, date: localDateString() }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setRun(d.run);
        setItems(d.items);
      })
      .catch(() => setError('Could not start the route.'));
  }, []);

  const load = useCallback(() => {
    setError('');
    setItems(null);
    setRun(null);

    if (runId) {
      fetch(`/api/admin/route-runs?runId=${encodeURIComponent(runId)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) setError(d.error);
          else { setRun(d.run); setItems(d.items); }
        })
        .catch(() => setError('Could not load that route.'));
      return;
    }

    if (group) startRoute(group);
  }, [group, runId, startRoute]);

  useEffect(() => { load(); }, [load]);

  async function completeRoute() {
    if (!run) return;
    setCompleting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/route-runs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: run.id, complete: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not complete the route.'); return; }
      // The just-finished run is now locked into history; starting the same
      // group again immediately snapshots a fresh, unchecked route from
      // whatever's currently in Clients.
      await startRoute(group);
    } finally {
      setCompleting(false);
    }
  }

  async function saveHelper() {
    if (!run) return;
    const trimmed = helperDraft.trim();
    if (trimmed === (run.helper || '')) return;
    try {
      const res = await fetch('/api/admin/route-runs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: run.id, helper: trimmed }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not save that.'); return; }
      setRun((prev) => (prev ? { ...prev, helper: trimmed || null } : prev));
    } catch {
      setError('Could not save that.');
    }
  }

  async function toggle(item) {
    const next = !item.checked;
    setBusyId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)));
    try {
      const res = await fetch('/api/admin/route-runs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, checked: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || 'Could not save that.');
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !next } : i)));
      }
    } catch {
      setError('Could not save that.');
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !next } : i)));
    } finally {
      setBusyId(null);
    }
  }

  // No group and no runId yet: ask which route to run, and show past
  // completed routes below.
  if (!group && !runId) {
    return (
      <div className="admin-page">
        <h1>Route</h1>
        <p className="admin-lead">Choose a route to check off clients as you mow.</p>
        <div className="route-picker">
          <button type="button" className="route-picker-btn" onClick={() => router.push('/admin/route-run?group=A')}>
            Route A
          </button>
          <button type="button" className="route-picker-btn" onClick={() => router.push('/admin/route-run?group=B')}>
            Route B
          </button>
        </div>

        <h2 className="route-history-title">History</h2>
        <p className="admin-lead">Every route you've completed, newest first.</p>
        {!history ? (
          <Skeleton h={52} />
        ) : history.length === 0 ? (
          <p className="admin-empty">No completed routes yet — finish a route to see it here.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Progress</th>
                  <th>Earned</th>
                  <th>Helper</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{fullDate(r.run_date)}</td>
                    <td>Route {r.route_group}</td>
                    <td>{r.checked} of {r.total} done</td>
                    <td>{money(r.earned)}</td>
                    <td>{r.helper || '—'}</td>
                    <td>
                      <a className="admin-mini" href={`/admin/route-run?runId=${r.id}`}>View →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const doneCount = items ? items.filter((i) => i.checked).length : 0;
  const total = items ? items.length : 0;
  const totalToMake = items ? items.reduce((sum, i) => sum + (i.price != null ? Number(i.price) : 0), 0) : 0;
  const earned = items ? items.filter((i) => i.checked).reduce((sum, i) => sum + (i.price != null ? Number(i.price) : 0), 0) : 0;

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Route {run?.route_group || group}</h1>
          <p className="admin-lead">
            {run ? fullDate(run.run_date) : 'Loading…'}
            {items && ` · ${doneCount} of ${total} done`}
          </p>
        </div>
        <div className="admin-head-actions">
          {runId ? (
            <a className="admin-mini" href="/admin/route-run">← Back to Route</a>
          ) : (
            <a className="admin-mini" href="/admin/route-run">Switch route</a>
          )}
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {run?.completed_at && (
        <p className="admin-lead" style={{ marginTop: -8 }}>
          Completed {new Date(run.completed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </p>
      )}

      {run && (
        <div className="route-top-row">
          <label className="route-helper-field">
            <span>Who helped on this route?</span>
            <input
              className="admin-plain-input"
              placeholder="e.g. Mike, Dave"
              value={helperDraft}
              onChange={(e) => setHelperDraft(e.target.value)}
              onBlur={saveHelper}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            />
          </label>
          {items && (
            <div className="route-money-row">
              <div className="route-money-stat">
                <span className="route-money-label">Total to make</span>
                <span className="route-money-value">{money(totalToMake)}</span>
              </div>
              <div className="route-money-stat">
                <span className="route-money-label">Earned so far</span>
                <span className="route-money-value">{money(earned)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!items ? (
        <><Skeleton h={56} style={{ marginBottom: 8 }} /><Skeleton h={56} style={{ marginBottom: 8 }} /><Skeleton h={56} /></>
      ) : items.length === 0 ? (
        <p className="admin-empty">No clients on this route.</p>
      ) : (
        <div className="route-checklist">
          {items.map((item) => (
            <label key={item.id} className={`route-check-row${item.checked ? ' is-checked' : ''}`}>
              <input
                type="checkbox"
                checked={!!item.checked}
                disabled={busyId === item.id}
                onChange={() => toggle(item)}
              />
              <span className="route-check-name">{item.name}</span>
              <span className="route-check-height">{formatHeight(item.mowing_height)}</span>
              <span className="route-check-price">{money(item.price)}</span>
            </label>
          ))}
        </div>
      )}

      {group && !runId && items && run && !run.completed_at && (
        <div className="route-complete-wrap">
          <button type="button" className="route-complete-btn" disabled={completing} onClick={completeRoute}>
            {completing ? 'Completing…' : `Complete Route ${run.route_group}`}
          </button>
          <p className="admin-lead" style={{ marginTop: 8, fontSize: 12.5 }}>
            Saves this run to History and resets Route {run.route_group} fresh from Clients.
          </p>
        </div>
      )}
    </div>
  );
}
