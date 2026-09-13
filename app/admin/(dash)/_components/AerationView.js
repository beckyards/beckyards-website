'use client';

import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from './ui';

const SERVICE_LABELS = {
  aeration: 'Aeration Only',
  aeration_overseeding: 'Aeration + Overseeding',
};

function fullDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AerationView() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [drafts, setDrafts] = useState({}); // id -> in-progress price text

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

  return (
    <div className="admin-page">
      <h1>Aeration List</h1>
      <p className="admin-lead">
        Everyone who signed up for aeration &amp; overseeding through the site. Add what you're
        charging each person — it's saved as soon as you click away from the field.
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
                <th>Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Service</th>
                <th>Signed up</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><a className="admin-table-link" href={`tel:${item.phone}`}>{item.phone}</a></td>
                  <td>{item.address}</td>
                  <td>{SERVICE_LABELS[item.service_type] || item.service_type}</td>
                  <td>{fullDate(item.created_at)}</td>
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
          </table>
        </div>
      )}
    </div>
  );
}
