'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, Skeleton } from './ui';
import EditableCell from './EditableCell';
import { formatPhoneInput } from '../../../../lib/phone';
import { ROUTES } from '../../../../lib/clients';

const HEIGHT_OPTIONS = Array.from({ length: 13 }, (_, i) => Math.round((2 + i * 0.25) * 100) / 100);
const PAYMENT_TYPES = ['Venmo', 'Cash', 'Check', 'Bill'];

function formatHeight(n) {
  return `${Number(n.toFixed(2))}"`;
}

function money(n) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

const BLANK_ADD_FORM = { name: '', address: '', phone: '', price: '', mowing_height: '3', payment_type: '' };

function AddClientRow({ onAdd, dropProps }) {
  const [form, setForm] = useState(BLANK_ADD_FORM);
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const ok = await onAdd({
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        price: form.price === '' ? null : Number(form.price),
        mowing_height: Number(form.mowing_height),
        payment_type: form.payment_type || null,
      });
      if (ok) setForm(BLANK_ADD_FORM);
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className={`admin-add-row ${dropProps?.className || ''}`} onDragOver={dropProps?.onDragOver} onDrop={dropProps?.onDrop}>
      <td></td>
      <td data-label="Name">
        <input
          className="admin-plain-input"
          placeholder="+ New client name"
          value={form.name}
          disabled={busy}
          onChange={(e) => set('name', e.target.value)}
        />
      </td>
      <td data-label="Address">
        <input
          className="admin-plain-input"
          placeholder="Address"
          value={form.address}
          disabled={busy}
          onChange={(e) => set('address', e.target.value)}
        />
      </td>
      <td data-label="Phone">
        <input
          className="admin-plain-input"
          type="tel"
          placeholder="Phone"
          value={form.phone}
          disabled={busy}
          onChange={(e) => set('phone', formatPhoneInput(e.target.value))}
        />
      </td>
      <td data-label="Mow height">
        <select
          className="admin-height-select"
          value={form.mowing_height}
          disabled={busy}
          onChange={(e) => set('mowing_height', e.target.value)}
        >
          {HEIGHT_OPTIONS.map((h) => (
            <option key={h} value={h}>{formatHeight(h)}</option>
          ))}
        </select>
      </td>
      <td data-label="Payment">
        <select
          className="admin-height-select"
          value={form.payment_type}
          disabled={busy}
          onChange={(e) => set('payment_type', e.target.value)}
        >
          <option value="">—</option>
          {PAYMENT_TYPES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td data-label="Price">
        <div className="admin-price-field">
          <span>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="—"
            value={form.price}
            disabled={busy}
            onChange={(e) => set('price', e.target.value)}
          />
        </div>
      </td>
      <td>
        <button type="button" className="admin-mini" disabled={busy || !form.name.trim()} onClick={submit}>
          Add
        </button>
      </td>
    </tr>
  );
}

// One route (A or B): its stops in driving order.
function RouteGroup({
  label, items, busyId, existingClients,
  onSaveField, onSavePrice, onSaveHeight, onSavePayment, onTakeOff, onAdd, onAddExisting,
  onCopy, copyTitle,
  dragInfo, onRowDragStart, onRowDrop, onDragEndGlobal,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [drafts, setDrafts] = useState({});

  function draftFor(item) {
    return drafts[item.id] ?? (item.price != null ? String(item.price) : '');
  }

  const total = items.reduce((sum, i) => sum + (i.price != null ? Number(i.price) : 0), 0);
  const isDropTarget = dragInfo != null;

  // Clients who aren't on this route yet.
  const onThisRoute = new Set(items.map((i) => i.client_id).filter(Boolean));
  const eligible = (existingClients || []).filter((c) => !onThisRoute.has(c.id));

  return (
    <Panel
      title={`Route ${label}`}
      meta={`${items.length} client${items.length === 1 ? '' : 's'}`}
      actions={
        <select
          className="admin-height-select routes-add-existing"
          aria-label={`Add an existing client to Route ${label}`}
          value=""
          disabled={eligible.length === 0}
          onChange={(e) => { if (e.target.value) onAddExisting(e.target.value); }}
        >
          <option value="">{eligible.length ? '+ Add an existing client…' : 'Everyone is on this route'}</option>
          {eligible.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.address ? ` — ${c.address}` : ''}</option>
          ))}
        </select>
      }
    >
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Mow height</th>
              <th>Payment</th>
              <th>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={
                  (dragIndex === index ? 'is-dragging ' : '') +
                  (overIndex === index && dragIndex !== index ? 'is-drag-over' : '')
                }
                draggable
                onDragStart={() => { setDragIndex(index); onRowDragStart(index); }}
                onDragOver={(e) => { e.preventDefault(); if (isDropTarget && overIndex !== index) setOverIndex(index); }}
                onDrop={(e) => {
                  e.preventDefault();
                  onRowDrop(index);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); onDragEndGlobal(); }}
              >
                <td>
                  <span className="admin-drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
                </td>
                <td data-label="Name">
                  <EditableCell
                    value={item.name}
                    placeholder="Name"
                    disabled={busyId === item.id}
                    onSave={(v) => onSaveField(item, 'name', v)}
                  />
                </td>
                <td data-label="Address">
                  <EditableCell
                    value={item.address}
                    placeholder="+ Add address"
                    disabled={busyId === item.id}
                    onSave={(v) => onSaveField(item, 'address', v)}
                  />
                </td>
                <td data-label="Phone">
                  <EditableCell
                    value={item.phone}
                    placeholder="+ Add phone"
                    type="tel"
                    format={formatPhoneInput}
                    disabled={busyId === item.id}
                    onSave={(v) => onSaveField(item, 'phone', v)}
                  />
                </td>
                <td data-label="Mow height">
                  <select
                    className="admin-height-select"
                    value={item.mowing_height ?? 3}
                    disabled={busyId === item.id}
                    onChange={(e) => onSaveHeight(item, Number(e.target.value))}
                  >
                    {HEIGHT_OPTIONS.map((h) => (
                      <option key={h} value={h}>{formatHeight(h)}</option>
                    ))}
                  </select>
                </td>
                <td data-label="Payment">
                  <select
                    className="admin-height-select"
                    value={item.payment_type || ''}
                    disabled={busyId === item.id}
                    onChange={(e) => onSavePayment(item, e.target.value || null)}
                  >
                    <option value="">—</option>
                    {PAYMENT_TYPES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>
                <td data-label="Price">
                  <div className="admin-price-field">
                    <span>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="—"
                      value={draftFor(item)}
                      disabled={busyId === item.id}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      onBlur={() => {
                        // Once the save has been tried, show what's really stored (the new price,
                        // or the old one if it was rejected) rather than the typed text.
                        Promise.resolve(onSavePrice(item, draftFor(item))).finally(() => {
                          setDrafts((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          });
                        });
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    />
                  </div>
                </td>
                <td>
                  <div className="admin-row-actions">
                    {onCopy && item.client_id && (
                      <button
                        type="button"
                        className="admin-mini admin-icon-btn"
                        title={copyTitle}
                        aria-label={`${copyTitle}: ${item.name}`}
                        disabled={busyId === item.id}
                        onClick={() => onCopy(item)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="12" height="12" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-mini"
                      title={`Take ${item.name} off Route ${item.route_group} (they stay in your Clients list)`}
                      disabled={busyId === item.id}
                      onClick={() => onTakeOff(item)}
                    >
                      Take off
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <AddClientRow
              onAdd={onAdd}
              dropProps={{
                className: overIndex === items.length && isDropTarget ? 'is-drag-over' : '',
                onDragOver: (e) => { e.preventDefault(); if (isDropTarget && overIndex !== items.length) setOverIndex(items.length); },
                onDrop: (e) => { e.preventDefault(); onRowDrop(items.length); setOverIndex(null); },
              }}
            />
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="admin-table-total-label">Total for Route {label}</td>
              <td colSpan={2} className="admin-table-total-value">{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="admin-route-count">{items.length} client{items.length === 1 ? '' : 's'} on this route.</p>
    </Panel>
  );
}

export default function MowingRouteView() {
  const [items, setItems] = useState(null); // route stops
  const [clients, setClients] = useState([]); // master list, for "add an existing client"
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [drag, setDrag] = useState(null); // { group, index }
  const pendingAdds = useRef(new Set()); // "A:<clientId>" adds currently in flight

  const loadClients = useCallback(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.items)) setClients(d.items); })
      .catch(() => {});
  }, []);

  // keepError: a reload after a failed save must not wipe the message explaining why.
  const load = useCallback((keepError) => {
    if (!keepError) setError('');
    fetch('/api/admin/mowing-route')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items);
      })
      .catch(() => setError('Could not load the routes.'));
    loadClients();
  }, [loadClients]);

  useEffect(() => { load(); }, [load]);

  async function patchStop(item, fields, failMessage) {
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, ...fields }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || failMessage); return false; }
      return true;
    } catch {
      setError(failMessage);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  // Name / phone / address belong to the client, so they change on every route that client is on.
  async function saveField(item, field, value) {
    const ok = await patchStop(item, { [field]: value }, 'Could not save that.');
    if (!ok) return;
    setItems((prev) => prev.map((i) => (
      i.id === item.id || (item.client_id && i.client_id === item.client_id) ? { ...i, [field]: value || null } : i
    )));
    if (field === 'name' || field === 'address') loadClients();
  }

  async function savePrice(item, raw) {
    const next = raw.trim() === '' ? null : Number(raw);
    if (next != null && (!Number.isFinite(next) || next < 0)) {
      setError('Price must be a positive number.');
      return;
    }
    if (next === item.price) return;
    if (await patchStop(item, { price: next }, 'Could not save the price.')) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, price: next } : i)));
    }
  }

  async function saveHeight(item, height) {
    if (await patchStop(item, { mowing_height: height }, 'Could not save the mowing height.')) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, mowing_height: height } : i)));
    }
  }

  async function savePayment(item, paymentType) {
    if (await patchStop(item, { payment_type: paymentType }, 'Could not save the payment type.')) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, payment_type: paymentType } : i)));
    }
  }

  async function persistOrder(group, reordered) {
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, reorder: reordered.map((i) => i.id) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || 'Could not save the new order.');
        load(true);
      }
    } catch {
      setError('Could not save the new order.');
      load(true);
    }
  }

  function reorderGroup(group, reorderedGroupItems) {
    setItems((prev) => {
      const others = prev.filter((i) => i.route_group !== group);
      return [...others, ...reorderedGroupItems].sort((a, b) => {
        if (a.route_group !== b.route_group) return a.route_group < b.route_group ? -1 : 1;
        return 0;
      });
    });
    persistOrder(group, reorderedGroupItems);
  }

  // Takes the client off this route only. They stay in the Clients list (and on their other route).
  async function takeOffRoute(item) {
    if (!confirm(`Take ${item.name} off Route ${item.route_group}? They stay in your Clients list.`)) return;
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not take them off the route.'); return; }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      loadClients();
    } catch {
      setError('Could not take them off the route. Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  }

  // fields: either a brand-new client's details, or { client_id } for an existing one.
  async function add(group, fields) {
    // A second tap on the same "add this client to this route" while the first is in flight does nothing.
    const key = fields.client_id ? `${group}:${fields.client_id}` : null;
    if (key) {
      if (pendingAdds.current.has(key)) return false;
      pendingAdds.current.add(key);
    }
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, route_group: group }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || 'Could not add that client.');
        if (res.status === 400 && /already on Route/.test(d.error || '')) load(true); // we were out of date; resync
        return false;
      }
      setItems((prev) => [...(prev || []), d.item]);
      loadClients();
      return true;
    } catch {
      setError('Could not add that client.');
      return false;
    } finally {
      if (key) pendingAdds.current.delete(key);
    }
  }

  // Put the same client on the other route too, with the same price / height / payment.
  function copyToRoute(item, targetGroup) {
    return add(targetGroup, {
      client_id: item.client_id,
      price: item.price,
      mowing_height: item.mowing_height,
      payment_type: item.payment_type,
    });
  }

  function handleRowDrop(targetGroup, targetIndex) {
    if (!drag || !items) { setDrag(null); return; }
    if (drag.group === targetGroup && drag.index !== targetIndex) {
      const groupItems = items.filter((i) => i.route_group === targetGroup);
      const reordered = [...groupItems];
      const [moved] = reordered.splice(drag.index, 1);
      reordered.splice(Math.min(targetIndex, reordered.length), 0, moved);
      reorderGroup(targetGroup, reordered);
    }
    setDrag(null);
  }

  return (
    <div className="admin-page">
      <h1>Mowing Routes</h1>
      <p className="admin-lead">
        Your two mowing routes. Set the cut height, payment type and price for each stop, and drag
        a row by its handle to put the route in the order you drive it. A client can be on both
        routes. Everyone you work for is listed once on the Clients page, so use the dropdown at
        the top of a route to add someone who's already there.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {!items ? (
        <><Skeleton h={200} style={{ marginBottom: 16 }} /><Skeleton h={200} /></>
      ) : (
        <>
          {ROUTES.map((g, n) => {
            const other = g === 'A' ? 'B' : 'A';
            const otherClientIds = new Set(items.filter((i) => i.route_group === other).map((i) => i.client_id));
            return (
              <div key={g}>
                {n > 0 && <div style={{ height: 20 }} />}
                <RouteGroup
                  label={g}
                  items={items.filter((i) => i.route_group === g)}
                  busyId={busyId}
                  existingClients={clients}
                  onSaveField={saveField}
                  onSavePrice={savePrice}
                  onSaveHeight={saveHeight}
                  onSavePayment={savePayment}
                  onTakeOff={takeOffRoute}
                  onAdd={(fields) => add(g, fields)}
                  onAddExisting={(clientId) => add(g, { client_id: clientId, mowing_height: 3 })}
                  onCopy={(item) => (otherClientIds.has(item.client_id) ? setError(`${item.name} is already on Route ${other}.`) : copyToRoute(item, other))}
                  copyTitle={`Also put on Route ${other}`}
                  dragInfo={drag}
                  onRowDragStart={(index) => setDrag({ group: g, index })}
                  onRowDrop={(index) => handleRowDrop(g, index)}
                  onDragEndGlobal={() => setDrag(null)}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
