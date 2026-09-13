'use client';

import { useEffect, useState } from 'react';

// Modal that lists everything in the Supabase `media` bucket and calls
// onPick(url) when the user chooses one.
export default function ImagePickerModal({ open, onPick, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    fetch('/api/admin/media')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data.items || []);
      })
      .catch(() => setError('Could not load images.'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <h3>Pick an image</h3>
          <button type="button" onClick={onClose}>Close</button>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="admin-json-error">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p>
            No images yet. Upload some on the{' '}
            <a href="/admin/images" target="_blank" rel="noreferrer">Images</a> page.
          </p>
        )}

        <div className="admin-picker-grid">
          {items.map((item) => (
            <button
              type="button"
              key={item.name}
              className="admin-picker-item"
              onClick={() => onPick(item.url)}
              title={item.name}
            >
              <img src={item.url} alt="" loading="lazy" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
