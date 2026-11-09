'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from './ui';
import { formatPhoneInput } from '../../../../lib/phone';

function fullDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(n) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

// "Fall 2027" -> 2027, so the newest season sorts first.
function seasonYear(label) {
  const m = /\d{4}/.exec(label || '');
  return m ? Number(m[0]) : 0;
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

// One sign-up list (aeration, leaf cleanup…). Everything that differs between
// lists comes in through `config`:
//   endpoint       admin API route, e.g. '/api/admin/aeration'
//   title, lead    page heading and intro
//   listName       used in messages ("the aeration list")
//   currentSeason  the season new sign-ups go to; always shown as a tab
//   serviceLabels  optional { service_type: label }; adds a Service column
//   showNotes      adds an editable Notes column
export default function SignupListView({ config }) {
  const { endpoint, title, lead, listName, currentSeason, serviceLabels, showNotes } = config;

  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [drafts, setDrafts] = useState({}); // id -> in-progress price text
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [season, setSeason] = useState(currentSeason);

  const load = useCallback(() => {
    setError('');
    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items);
      })
      .catch(() => setError(`Could not load the ${listName}.`));
  }, [endpoint, listName]);

  useEffect(() => { load(); }, [load]);

  // Rows from before seasons existed have no label; treat them as the current one.
  const seasonOf = useCallback((item) => item.season || currentSeason, [currentSeason]);

  // Tabs: every season that has rows, plus the current one even when it's empty.
  const tabs = useMemo(() => {
    const counts = new Map([[currentSeason, 0]]);
    for (const i of items || []) counts.set(seasonOf(i), (counts.get(seasonOf(i)) || 0) + 1);
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => seasonYear(b.label) - seasonYear(a.label) || b.label.localeCompare(a.label));
  }, [items, currentSeason, seasonOf]);

  // If the selected season's last row was just deleted its tab disappears; fall
  // back to the current season so a tab is always highlighted.
  const activeSeason = tabs.some((t) => t.label === season) ? season : currentSeason;

  const visible = useMemo(
    () => (items || []).filter((i) => seasonOf(i) === activeSeason),
    [items, activeSeason, seasonOf]
  );

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
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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

  // Drag-reorder only moves rows within the season tab being shown.
  function reorderTo(fromIndex, toIndex) {
    if (!items || fromIndex === toIndex || fromIndex == null || toIndex == null) return;
    const reordered = [...visible];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const shown = new Set(reordered.map((i) => i.id));
    setItems([...reordered, ...items.filter((i) => !shown.has(i.id))]);
    persistOrder(reordered);
  }

  async function remove(item) {
    if (!confirm(`Remove ${item.name} from the ${listName}? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch(endpoint, {
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

  const total = visible.reduce((sum, i) => sum + (i.price != null ? Number(i.price) : 0), 0);
  const priced = visible.filter((i) => i.price != null).length;

  return (
    <div className="admin-page">
      <h1>{title}</h1>
      <p className="admin-lead">{lead}</p>

      {error && <p className="admin-error">{error}</p>}

      {items && (
        <div className="admin-tabs" role="tablist" aria-label="Season">
          {tabs.map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={activeSeason === t.label}
              className={activeSeason === t.label ? 'is-active' : ''}
              onClick={() => setSeason(t.label)}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      )}

      {!items ? (
        <><Skeleton h={48} style={{ marginBottom: 8 }} /><Skeleton h={48} style={{ marginBottom: 8 }} /><Skeleton h={48} /></>
      ) : visible.length === 0 ? (
        <p className="admin-empty">No signups yet for {activeSeason}.</p>
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
                {serviceLabels && <th>Service</th>}
                {showNotes && <th>Notes</th>}
                <th>Signed up</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item, index) => (
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
                  {serviceLabels && (
                    <td data-label="Service">{serviceLabels[item.service_type] || item.service_type}</td>
                  )}
                  {showNotes && (
                    <td data-label="Notes">
                      <EditableCell
                        value={item.notes}
                        placeholder="+ Add note"
                        disabled={busyId === item.id}
                        onSave={(v) => saveField(item, 'notes', v)}
                      />
                    </td>
                  )}
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
                  Total ({priced} of {visible.length} priced)
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
