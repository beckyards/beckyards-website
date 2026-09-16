'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Lightbox from '../_components/Lightbox';

function baseName(name) {
  const dot = name.lastIndexOf('.');
  return dot > -1 ? name.slice(0, dot) : name;
}

export default function ImagesPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [copiedName, setCopiedName] = useState('');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState(null); // name currently being edited
  const [renameValue, setRenameValue] = useState('');
  const [justUploaded, setJustUploaded] = useState(() => new Set());
  const [zoomedUrl, setZoomedUrl] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const fileInput = useRef(null);

  function refresh() {
    setStatus('loading');
    fetch('/api/admin/media')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus('error');
          setMessage(data.error);
        } else {
          setItems(data.items || []);
          setStatus('ready');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not load images.');
      });
  }

  useEffect(refresh, []);

  async function upload(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setStatus('uploading');
    setMessage('');

    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    const res = await fetch('/api/admin/media', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));

    if (data.errors?.length) {
      setMessage(
        `${data.uploaded?.length || 0} uploaded. Problems: ${data.errors.join(' ')}`
      );
    } else {
      setMessage(
        `${data.uploaded?.length || 0} image(s) uploaded — click a name below to rename it to something you'll recognize.`
      );
    }
    setJustUploaded(new Set((data.uploaded || []).map((u) => u.name)));
    refresh();
  }

  async function remove(name) {
    if (!confirm(`Delete "${name}"? Pages still using its URL will show a broken image.`)) {
      return;
    }
    const res = await fetch('/api/admin/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'Delete failed.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.name !== name));
  }

  function startRename(item) {
    setRenaming(item.name);
    setRenameValue(baseName(item.name));
    setJustUploaded((prev) => {
      const next = new Set(prev);
      next.delete(item.name);
      return next;
    });
  }

  async function commitRename(name) {
    const typed = renameValue.trim();
    setRenaming(null);
    if (!typed || typed === baseName(name)) return;

    const res = await fetch('/api/admin/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: name, to: typed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'Rename failed.');
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.name === name ? { ...i, name: data.name, url: data.url || i.url } : i))
    );
    setMessage(`Renamed to "${data.name}".`);
  }

  function toggleSelected(name) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function removeSelected() {
    const names = Array.from(selected);
    if (names.length === 0) return;
    if (!confirm(`Delete ${names.length} image${names.length === 1 ? '' : 's'}? Pages still using their URLs will show a broken image.`)) {
      return;
    }
    setMessage('');
    const results = await Promise.all(
      names.map((name) =>
        fetch('/api/admin/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }).then((r) => ({ name, ok: r.ok }))
      )
    );
    const deleted = new Set(results.filter((r) => r.ok).map((r) => r.name));
    const failed = results.filter((r) => !r.ok).map((r) => r.name);
    setItems((prev) => prev.filter((i) => !deleted.has(i.name)));
    setSelected(new Set());
    setMessage(
      failed.length > 0
        ? `Deleted ${deleted.size}. Failed: ${failed.join(', ')}.`
        : `Deleted ${deleted.size} image${deleted.size === 1 ? '' : 's'}.`
    );
  }

  async function copyUrl(url, name) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedName(name);
      setTimeout(() => setCopiedName(''), 1500);
    } catch {
      setMessage('Copy failed — select the URL text manually.');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="admin-page">
      <h1>Images</h1>
      <p className="admin-lead">
        Upload photos here, then use “Copy URL” — or the “Pick” buttons on the
        Content page — to place them on the site. Click any name to rename it
        to something you'll recognize later.
      </p>

      <div
        className={`admin-drop${dragOver ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation(); // this page has its own upload flow — don't also trigger the global drop zone
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => fileInput.current?.click()}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
        <p>{status === 'uploading' ? 'Uploading…' : 'Drop images here, or click to choose'}</p>
        <span>JPG, PNG, WebP, GIF, AVIF or iPhone (HEIC) photos · up to 25 MB each</span>
      </div>

      {message && <p className="admin-json-ok">{message}</p>}
      {status === 'error' && <p className="admin-json-error">{message}</p>}

      {items.length > 0 && (
        <div className="admin-field-row" style={{ marginBottom: 4 }}>
          <input
            type="text"
            className="admin-search"
            placeholder={`Search ${items.length} image name${items.length === 1 ? '' : 's'}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          {!selectMode ? (
            <button type="button" className="admin-mini" onClick={() => setSelectMode(true)}>
              Select
            </button>
          ) : (
            <button type="button" className="admin-mini" onClick={exitSelectMode}>
              Cancel
            </button>
          )}
        </div>
      )}

      {selectMode && (
        <div className="admin-select-bar">
          <span>{selected.size} selected</span>
          <button
            type="button"
            className="admin-mini"
            onClick={() => setSelected(new Set(filtered.map((i) => i.name)))}
          >
            Select all {filtered.length !== items.length ? `(${filtered.length} shown)` : ''}
          </button>
          <button
            type="button"
            className="admin-mini admin-mini-danger"
            disabled={selected.size === 0}
            onClick={removeSelected}
          >
            Delete selected
          </button>
        </div>
      )}

      <div className="admin-media-grid">
        {filtered.map((item) => (
          <figure
            className={`admin-media${justUploaded.has(item.name) ? ' is-new' : ''}${selected.has(item.name) ? ' is-selected' : ''}`}
            key={item.name}
          >
            {selectMode && (
              <label className="admin-media-select">
                <input
                  type="checkbox"
                  checked={selected.has(item.name)}
                  onChange={() => toggleSelected(item.name)}
                />
              </label>
            )}
            <img
              className="is-zoomable"
              src={item.url}
              alt=""
              loading="lazy"
              onClick={() => (selectMode ? toggleSelected(item.name) : setZoomedUrl(item.url))}
            />
            <figcaption>
              {renaming === item.name ? (
                <input
                  className="admin-media-rename"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(item.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="admin-media-name"
                  title="Click to rename"
                  onClick={() => startRename(item)}
                >
                  {item.name}
                </button>
              )}
              <div className="admin-media-actions">
                <button type="button" className="admin-mini" onClick={() => copyUrl(item.url, item.name)}>
                  {copiedName === item.name ? 'Copied!' : 'Copy URL'}
                </button>
                <button
                  type="button"
                  className="admin-mini admin-mini-danger"
                  onClick={() => remove(item.name)}
                >
                  Delete
                </button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      {status === 'ready' && items.length === 0 && (
        <p className="admin-empty">No images uploaded yet.</p>
      )}
      {status === 'ready' && items.length > 0 && filtered.length === 0 && (
        <p className="admin-empty">No images match "{query}".</p>
      )}

      {zoomedUrl && <Lightbox src={zoomedUrl} onClose={() => setZoomedUrl(null)} />}
    </div>
  );
}
