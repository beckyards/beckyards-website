'use client';

import { useCallback, useEffect, useState } from 'react';
import { Panel, Skeleton } from './ui';
import { formatPhoneInput } from '../../../../lib/phone';

const HEIGHT_OPTIONS = Array.from({ length: 13 }, (_, i) => Math.round((2 + i * 0.25) * 100) / 100);
const PAYMENT_TYPES = ['Venmo', 'Cash', 'Check', 'Bill'];

function formatHeight(n) {
  return `${Number(n.toFixed(2))}"`;
}

function money(n) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

// Click straight on a name, phone, or address to edit it in place. Saves on
// blur (or Enter); Escape cancels without saving.
function EditableCell({ value, placeholder, type = 'text', format, disabled, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== (value || '')) onSave(next);
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="admin-inline-input"
        type={type}
        value={draft}
        onChange={(e) => setDraft(format ? format(e.target.value) : e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      className="admin-editable-text"
      title="Click to edit"
      onClick={() => !disabled && setEditing(true)}
    >
      {value ? value : <span className="admin-editable-placeholder">{placeholder}</span>}
    </span>
  );
}

const BLANK_ADD_FORM = { name: '', address: '', phone: '', price: '', mowing_height: '3', payment_type: '' };

function AddClientRow({ onAdd }) {
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
    <tr className="admin-add-row">
      <td></td>
      <td>
        <input
          className="admin-plain-input"
          placeholder="+ Name"
          value={form.name}
          disabled={busy}
          onChange={(e) => set('name', e.target.value)}
        />
      </td>
      <td>
        <input
          className="admin-plain-input"
          placeholder="Address"
          value={form.address}
          disabled={busy}
          onChange={(e) => set('address', e.target.value)}
        />
      </td>
      <td>
        <input
          className="admin-plain-input"
          type="tel"
          placeholder="Phone"
          value={form.phone}
          disabled={busy}
          onChange={(e) => set('phone', formatPhoneInput(e.target.value))}
        />
      </td>
      <td>
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
      <td>
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
      <td>
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

function RouteGroup({ label, items, busyId, onSaveField, onSavePrice, onSaveHeight, onSavePayment, onReorder, onRemove, onAdd, onDuplicate, duplicateTitle }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [drafts, setDrafts] = useState({});

  function draftFor(item) {
    return drafts[item.id] ?? (item.price != null ? String(item.price) : '');
  }

  function reorderTo(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorder(reordered);
  }

  const total = items.reduce((sum, i) => sum + (i.price != null ? Number(i.price) : 0), 0);

  return (
    <Panel title={`Group ${label}`} meta={`${items.length} client${items.length === 1 ? '' : 's'}`}>
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
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => { e.preventDefault(); if (overIndex !== index) setOverIndex(index); }}
                onDrop={(e) => {
                  e.preventDefault();
                  reorderTo(dragIndex, index);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              >
                <td>
                  <span className="admin-drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
                </td>
                <td>
                  <EditableCell
                    value={item.name}
                    placeholder="Name"
                    disabled={busyId === item.id}
                    onSave={(v) => onSaveField(item, 'name', v)}
                  />
                </td>
                <td>
                  <EditableCell
                    value={item.address}
                    placeholder="+ Add address"
                    disabled={busyId === item.id}
                    onSave={(v) => onSaveField(item, 'address', v)}
                  />
                </td>
                <td>
                  <EditableCell
                    value={item.phone}
                    placeholder="+ Add phone"
                    type="tel"
                    format={formatPhoneInput}
                    disabled={busyId === item.id}
                    onSave={(v) => onSaveField(item, 'phone', v)}
                  />
                </td>
                <td>
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
                <td>
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
                <td>
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
                      onBlur={() => onSavePrice(item, draftFor(item))}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    />
                  </div>
                </td>
                <td>
                  <div className="admin-row-actions">
                    {onDuplicate && (
                      <button
                        type="button"
                        className="admin-mini admin-icon-btn"
                        title={duplicateTitle}
                        aria-label={duplicateTitle}
                        disabled={busyId === item.id}
                        onClick={() => onDuplicate(item)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="12" height="12" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-mini admin-mini-danger"
                      disabled={busyId === item.id}
                      onClick={() => onRemove(item)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <AddClientRow onAdd={onAdd} />
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} className="admin-table-total-label">Total for Group {label}</td>
                <td colSpan={2} className="admin-table-total-value">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Panel>
  );
}

export default function MowingRouteView() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setError('');
    fetch('/api/admin/mowing-route')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items);
      })
      .catch(() => setError('Could not load the route.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveField(item, field, value) {
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, [field]: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not save that.'); return; }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: value || null } : i)));
    } finally {
      setBusyId(null);
    }
  }

  async function savePrice(item, raw) {
    const next = raw.trim() === '' ? null : Number(raw);
    if (next != null && (!Number.isFinite(next) || next < 0)) {
      setError('Price must be a positive number.');
      return;
    }
    if (next === item.price) return;
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, price: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not save the price.'); return; }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, price: next } : i)));
    } finally {
      setBusyId(null);
    }
  }

  async function saveHeight(item, height) {
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, mowing_height: height }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not save the mowing height.'); return; }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, mowing_height: height } : i)));
    } finally {
      setBusyId(null);
    }
  }

  async function savePayment(item, paymentType) {
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, payment_type: paymentType }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not save the payment type.'); return; }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, payment_type: paymentType } : i)));
    } finally {
      setBusyId(null);
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
        load();
      }
    } catch {
      setError('Could not save the new order.');
      load();
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

  async function remove(item) {
    if (!confirm(`Remove ${item.name} from the route? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Delete failed.'); return; }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateToGroup(item, targetGroup) {
    return add(targetGroup, {
      name: item.name,
      address: item.address,
      phone: item.phone,
      price: item.price,
      mowing_height: item.mowing_height,
      payment_type: item.payment_type,
    });
  }

  async function add(group, fields) {
    setError('');
    try {
      const res = await fetch('/api/admin/mowing-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, route_group: group }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not add that client.'); return false; }
      setItems((prev) => [...(prev || []), d.item]);
      return true;
    } catch {
      setError('Could not add that client.');
      return false;
    }
  }

  return (
    <div className="admin-page">
      <h1>Route</h1>
      <p className="admin-lead">
        Your two mowing crews' routes. Add clients to either group, click any name, address, or
        phone to edit it, set the cut height, payment type, and price, and drag a row by its
        handle to reorder the route however you drive it.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {!items ? (
        <><Skeleton h={200} style={{ marginBottom: 16 }} /><Skeleton h={200} /></>
      ) : (
        <>
          <RouteGroup
            label="A"
            items={items.filter((i) => i.route_group === 'A')}
            busyId={busyId}
            onSaveField={saveField}
            onSavePrice={savePrice}
            onSaveHeight={saveHeight}
            onSavePayment={savePayment}
            onReorder={(reordered) => reorderGroup('A', reordered)}
            onRemove={remove}
            onAdd={(fields) => add('A', fields)}
            onDuplicate={(item) => duplicateToGroup(item, 'B')}
            duplicateTitle="Copy to Group B"
          />
          <div style={{ height: 20 }} />
          <RouteGroup
            label="B"
            items={items.filter((i) => i.route_group === 'B')}
            busyId={busyId}
            onSaveField={saveField}
            onSavePrice={savePrice}
            onSaveHeight={saveHeight}
            onSavePayment={savePayment}
            onReorder={(reordered) => reorderGroup('B', reordered)}
            onRemove={remove}
            onAdd={(fields) => add('B', fields)}
          />
        </>
      )}
    </div>
  );
}
