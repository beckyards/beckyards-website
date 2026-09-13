'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Skeleton } from './ui';
import { formatPhoneInput } from '../../../../lib/phone';

const SERVICE_LABELS = {
  aeration: 'Aeration Only',
  aeration_overseeding: 'Aeration + Overseeding',
};

function fullDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(n) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

// Click straight on a name, phone, email, or address to edit it in place.
// Saves on blur (or Enter); Escape cancels without saving.
function EditableCell({ value, placeholder, type = 'text', format, disabled, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== (value || '')) onSave(next);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
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

export default function AerationView() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [drafts, setDrafts] = useState({}); // id -> in-progress price text
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const load = useCallback(() => {
    setError('');
    fetch('/api/admin/aeration')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items);
      })
      .catch(() => setError('Could not load the aeration list.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  function draftFor(item) {
    return drafts[item.id] ?? (item.price != null ? String(item.price) : '');
  }

  async function savePrice(item) {
    const raw = draftFor(item);
    const next = raw.trim() === '' ? null : Number(raw);
    if (next != null && (!Number.isFinite(next) || next < 0)) {
      setError('Price must be a positive number.');
      return;
    }
    if (next === item.price) return;

    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/aeration', {
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

  async function saveField(item, field, value) {
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch('/api/admin/aeration', {
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

  async function toggleCompleted(item) {
    setBusyId(item.id);
    setError('');
    const next = !item.completed;
    try {
      const res = await fetch('/api/admin/aeration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, completed: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not update.'); return; }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: next } : i)));
    } finally {
      setBusyId(null);
    }
  }

  async function persistOrder(reordered) {
    setError('');
    try {
      const res = await fetch('/api/admin/aeration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder: reordered.map((i) => i.id) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || 'Could not save the new order.');
        load(); // fall back to the real server order
      }
    } catch {
      setError('Could not save the new order.');
      load();
    }
  }

  function reorderTo(fromIndex, toIndex) {
    if (!items || fromIndex === toIndex || fromIndex == null || toIndex == null) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setItems(reordered);
    persistOrder(reordered);
  }

  async function remove(item) {
    if (!confirm(`Remove ${item.name} from the aeration list? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/aeration', {
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

  const total = (items || []).reduce((sum, i) => sum + (i.price != null ? Number(i.price) : 0), 0);
  const priced = (items || []).filter((i) => i.price != null).length;

  return (
    <div className="admin-page">
      <h1>Aeration List</h1>
      <p className="admin-lead">
        Everyone who signed up for aeration &amp; overseeding through the site. Click any name,
        phone, email, or address to edit it, add what you're charging, check them off once done,
        and drag a row by its handle to reorder the list however you'd like to work through them.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {!items ? (
        <><Skeleton h={48} style={{ marginBottom: 8 }} /><Skeleton h={48} style={{ marginBottom: 8 }} /><Skeleton h={48} /></>
      ) : items.length === 0 ? (
        <p className="admin-empty">No signups yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Done</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Service</th>
                <th>Signed up</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className={
                    (item.completed ? 'is-completed ' : '') +
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
                  <td data-label="Done">
                    <input
                      type="checkbox"
                      checked={!!item.completed}
                      disabled={busyId === item.id}
                      onChange={() => toggleCompleted(item)}
                      aria-label={`Mark ${item.name} as ${item.completed ? 'not done' : 'done'}`}
                    />
                  </td>
                  <td data-label="Name">
                    <EditableCell
                      value={item.name}
                      placeholder="Name"
                      disabled={busyId === item.id}
                      onSave={(v) => saveField(item, 'name', v)}
                    />
                  </td>
                  <td data-label="Phone">
                    <EditableCell
                      value={item.phone}
                      placeholder="Phone"
                      type="tel"
                      format={formatPhoneInput}
                      disabled={busyId === item.id}
                      onSave={(v) => saveField(item, 'phone', v)}
                    />
                  </td>
                  <td data-label="Email">
                    <EditableCell
                      value={item.email}
                      placeholder="+ Add email"
                      type="email"
                      disabled={busyId === item.id}
                      onSave={(v) => saveField(item, 'email', v)}
                    />
                  </td>
                  <td data-label="Address">
                    <EditableCell
                      value={item.address}
                      placeholder="Address"
                      disabled={busyId === item.id}
                      onSave={(v) => saveField(item, 'address', v)}
                    />
                  </td>
                  <td data-label="Service">{SERVICE_LABELS[item.service_type] || item.service_type}</td>
                  <td data-label="Signed up">{fullDate(item.created_at)}</td>
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
                        onBlur={() => savePrice(item)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      />
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-mini admin-mini-danger"
                      disabled={busyId === item.id}
                      onClick={() => remove(item)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={8} className="admin-table-total-label">
                  Total ({priced} of {items.length} priced)
                </td>
                <td colSpan={2} className="admin-table-total-value">{money(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
