'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel, Skeleton } from './ui';
import EditableCell from './EditableCell';
import { formatPhoneInput } from '../../../../lib/phone';
import { CLIENT_TYPES, MAX_LEN, ROUTES, ROUTE_LABELS } from '../../../../lib/clients';

const ROUTE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'A', label: 'Route A' },
  { key: 'B', label: 'Route B' },
  { key: 'none', label: 'No route' },
];

const BLANK = { name: '', phone: '', email: '', address: '', client_type: '', routes: [], notes: '' };

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function byName(a, b) {
  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
}

async function request(method, body) {
  let res;
  try {
    res = await fetch('/api/admin/clients', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
  return d;
}

function matches(client, q) {
  if (!q) return true;
  return [client.name, client.phone, client.email, client.address, client.notes].some(
    (v) => v && v.toLowerCase().includes(q),
  );
}

function inFilter(client, key) {
  if (key === 'all') return true;
  if (key === 'none') return client.routes.length === 0;
  return client.routes.includes(key);
}

// Route A / Route B on-off buttons. `routes` is the list the client is on.
function RouteToggles({ routes, disabled, name, onChange }) {
  return (
    <div className="clients-routes" role="group" aria-label={name ? `Mowing routes for ${name}` : 'Mowing routes'}>
      {ROUTES.map((r) => {
        const on = routes.includes(r);
        return (
          <button
            key={r}
            type="button"
            className={`clients-route-btn${on ? ' is-on' : ''}`}
            data-g={r}
            aria-pressed={on}
            title={on ? `On ${ROUTE_LABELS[r]}. Click to take off.` : `Put on ${ROUTE_LABELS[r]}`}
            disabled={disabled}
            onClick={() => onChange(on ? routes.filter((x) => x !== r) : ROUTES.filter((x) => x === r || routes.includes(x)))}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}

export default function ClientsView() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    setError('');
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items || []);
      })
      .catch(() => setError('Could not load your clients.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function addClient(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || adding) return;
    setAdding(true);
    setError('');
    try {
      const d = await request('POST', { ...form, name });
      setItems((prev) => [...(prev || []), d.item].sort(byName));
      // Keep type and routes for the next one; clear the person-specific fields.
      setForm((prev) => ({ ...BLANK, client_type: prev.client_type, routes: prev.routes }));
      setQuery('');
      setRouteFilter('all');
      setTypeFilter('all');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function save(item, fields) {
    setBusyId(item.id);
    setError('');
    try {
      const d = await request('PATCH', { id: item.id, ...fields });
      setItems((prev) => prev.map((c) => (c.id === item.id ? d.item : c)).sort(byName));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item) {
    const where = item.routes.length ? ` They're on ${item.routes.length === 2 ? 'both routes' : `Route ${item.routes[0]}`}, so they'll come off ${item.routes.length === 2 ? 'them' : 'it'} too.` : '';
    if (!confirm(`Permanently delete ${item.name}?${where} This can't be undone.`)) return;
    setBusyId(item.id);
    setError('');
    try {
      await request('DELETE', { id: item.id });
      setItems((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const c = { all: 0, A: 0, B: 0, none: 0 };
    for (const i of items || []) {
      c.all += 1;
      if (i.routes.length === 0) c.none += 1;
      for (const r of i.routes) c[r] += 1;
    }
    return c;
  }, [items]);

  const q = query.trim().toLowerCase();
  const shown = (items || []).filter(
    (c) =>
      inFilter(c, routeFilter) &&
      (typeFilter === 'all' || (typeFilter === 'none' ? !c.client_type : c.client_type === typeFilter)) &&
      matches(c, q),
  );
  const filtering = q !== '' || routeFilter !== 'all' || typeFilter !== 'all';
  const panelTitle = routeFilter === 'all' ? 'All clients' : routeFilter === 'none' ? 'Not on a route' : ROUTE_LABELS[routeFilter];

  return (
    <div className="admin-page clients-page">
      <h1>Clients</h1>
      <p className="admin-lead">
        Everyone you work for, in one place: weekly mowing, landscaping, one-time jobs, yearly
        jobs. Each person is listed once. Click any name, phone, email, address or note to edit it.
        Tap A or B to put someone on a mowing route (then set their price and driving order under
        Mowing Routes).
      </p>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {/* Only once the list has loaded, so adding can never replace a list we failed to fetch. */}
      {items && (
      <div className="clients-add-bar">
        <button
          type="button"
          className="admin-primary clients-add-toggle"
          aria-expanded={showAdd}
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? 'Close' : '+ Add client'}
        </button>
      </div>
      )}

      {items && showAdd && (
      <form className="clients-add" onSubmit={addClient} aria-label="Add a client">
        <div className="clients-add-grid">
          <label className="clients-field clients-f-name">
            <span>Name</span>
            <input autoFocus className="admin-plain-input" value={form.name} maxLength={MAX_LEN.name} placeholder="e.g. Sam Rivera" autoComplete="off" onChange={(e) => setField('name', e.target.value)} />
          </label>
          <label className="clients-field">
            <span>Phone</span>
            <input className="admin-plain-input" type="tel" value={form.phone} placeholder="(555) 123-4567" autoComplete="off" onChange={(e) => setField('phone', formatPhoneInput(e.target.value))} />
          </label>
          <label className="clients-field">
            <span>Email</span>
            <input className="admin-plain-input" type="email" value={form.email} maxLength={MAX_LEN.email} placeholder="name@example.com" autoComplete="off" onChange={(e) => setField('email', e.target.value)} />
          </label>
          <label className="clients-field clients-f-address">
            <span>Address</span>
            <input className="admin-plain-input" value={form.address} maxLength={MAX_LEN.address} placeholder="Street address" autoComplete="off" onChange={(e) => setField('address', e.target.value)} />
          </label>
          <label className="clients-field">
            <span>Type</span>
            <select className="admin-height-select" value={form.client_type} onChange={(e) => setField('client_type', e.target.value)}>
              <option value="">—</option>
              {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div className="clients-field">
            <span>Mowing route</span>
            <RouteToggles routes={form.routes} onChange={(r) => setField('routes', r)} />
          </div>
          <label className="clients-field clients-f-notes">
            <span>Notes</span>
            <input className="admin-plain-input" value={form.notes} maxLength={MAX_LEN.notes} placeholder="Gate code, what they want done…" autoComplete="off" onChange={(e) => setField('notes', e.target.value)} />
          </label>
          <button type="submit" className="admin-primary clients-add-btn" disabled={adding || !form.name.trim()}>
            {adding ? 'Adding…' : 'Add client'}
          </button>
        </div>
      </form>
      )}

      {!items ? (
        error ? (
          <button type="button" className="admin-mini" onClick={load}>Try again</button>
        ) : (
          <Skeleton h={260} />
        )
      ) : (
        <>
          <div className="clients-toolbar">
            <div className="seg" role="group" aria-label="Filter by route">
              {ROUTE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={routeFilter === f.key ? 'is-active' : undefined}
                  aria-pressed={routeFilter === f.key}
                  onClick={() => setRouteFilter(f.key)}
                >
                  {f.label} <span className="clients-count">{counts[f.key]}</span>
                </button>
              ))}
            </div>
            <select className="admin-height-select clients-type-filter" aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value="none">No type</option>
            </select>
            <input
              className="admin-search clients-search"
              type="search"
              placeholder="Search name, phone, email, address, notes"
              aria-label="Search clients"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Panel
            title={panelTitle}
            meta={filtering ? `${shown.length} of ${plural(counts.all, 'client')}` : plural(counts.all, 'client')}
          >
            {shown.length === 0 ? (
              <p className="clients-empty">
                {counts.all === 0
                  ? 'No clients yet. Add your first one above.'
                  : 'No clients match. Clear the search or filters to see everyone.'}
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table clients-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Address</th>
                      <th>Type</th>
                      <th>Mowing route</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c) => {
                      const busy = busyId === c.id;
                      return (
                        <tr key={c.id}>
                          <td data-label="Name" className="clients-c-name">
                            <EditableCell value={c.name} placeholder="Name" maxLength={MAX_LEN.name} disabled={busy} onSave={(v) => v && save(c, { name: v })} />
                          </td>
                          <td data-label="Phone">
                            <EditableCell value={c.phone} placeholder="+ Add phone" type="tel" format={formatPhoneInput} disabled={busy} onSave={(v) => save(c, { phone: v })} />
                          </td>
                          <td data-label="Email">
                            <EditableCell value={c.email} placeholder="+ Add email" type="email" maxLength={MAX_LEN.email} disabled={busy} onSave={(v) => save(c, { email: v })} />
                          </td>
                          <td data-label="Address" className="clients-c-wrap">
                            <EditableCell value={c.address} placeholder="+ Add address" maxLength={MAX_LEN.address} disabled={busy} onSave={(v) => save(c, { address: v })} />
                          </td>
                          <td data-label="Type">
                            <select className="admin-height-select" value={c.client_type || ''} disabled={busy} aria-label={`Type for ${c.name}`} onChange={(e) => save(c, { client_type: e.target.value || null })}>
                              <option value="">—</option>
                              {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td data-label="Mowing route">
                            <RouteToggles routes={c.routes} name={c.name} disabled={busy} onChange={(routes) => save(c, { routes })} />
                          </td>
                          <td data-label="Notes" className="clients-c-wrap clients-c-notes">
                            <EditableCell value={c.notes} placeholder="+ Add note" maxLength={MAX_LEN.notes} disabled={busy} onSave={(v) => save(c, { notes: v })} />
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              <button type="button" className="admin-mini admin-mini-danger" disabled={busy} onClick={() => remove(c)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
