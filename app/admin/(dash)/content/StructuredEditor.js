'use client';

import { useRef, useState } from 'react';
import ImagePickerModal from './ImagePickerModal';

const IMAGE_KEYS = new Set(['src', 'image', 'cover', 'poster', 'thumb', 'thumbnail']);

function blankLike(sample) {
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === 'object') {
    const out = {};
    for (const k of Object.keys(sample)) out[k] = blankLike(sample[k]);
    return out;
  }
  if (typeof sample === 'number') return 0;
  if (typeof sample === 'boolean') return false;
  return '';
}

function clone(v) {
  return typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

// Immutable set at a path like ['0', 'gallery', '2', 'alt'].
function setAt(root, path, value) {
  const next = clone(root);
  let node = next;
  for (let i = 0; i < path.length - 1; i += 1) node = node[path[i]];
  node[path[path.length - 1]] = value;
  return next;
}

// Uploads dropped/picked files to the media library and hands back
// {name, url} per file — same auto-naming every other upload path uses, so a
// photo dragged straight onto a field shows up in Images immediately too.
async function uploadFiles(files) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const res = await fetch('/api/admin/media', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!data.uploaded?.length) {
    throw new Error(data.error || data.errors?.[0] || 'Upload failed.');
  }
  return data.uploaded;
}

function filesFromDrop(e) {
  return Array.from(e.dataTransfer?.files || []).filter((f) => f.type?.startsWith('image/'));
}

// Drag-to-reposition crop control. Shows the image at cover scale and tracks
// where you click/drag as a 0-100% focal point, live-updating the preview so
// what you see is the crop that ships. Sized to the 4/5 box the photo grid
// actually uses, so this stays a close (not pixel-exact) match everywhere else
// the same image might appear.
function FocalPicker({ src, x = 50, y = 50, onChange }) {
  const ref = useRef(null);
  const dragging = useRef(false);

  function setFromEvent(e) {
    const rect = ref.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = Math.round(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
    const py = Math.round(Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)));
    onChange(px, py);
  }

  return (
    <div
      ref={ref}
      className="admin-focal-picker"
      style={{ backgroundImage: `url(${src})`, backgroundPosition: `${x}% ${y}%` }}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        ref.current?.setPointerCapture(e.pointerId);
        setFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) setFromEvent(e);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      title="Drag to choose what stays in frame when this photo is cropped"
    >
      <span className="admin-focal-dot" style={{ left: `${x}%`, top: `${y}%` }} />
    </div>
  );
}

// An image field's preview doubles as a drop target: drag a file straight
// onto it to replace the photo (uploads + auto-names it, same as Images),
// plus an optional focal-point adjuster for gallery-style {src, alt} entries,
// which is the one place the site actually reads a custom crop from content
// (see app/work/[category]/[project]/page.js).
function ImageField({ str, onPick, onReplace, showPosition, focalX, focalY, onFocalChange }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = filesFromDrop(e);
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const [uploaded] = await uploadFiles([files[0]]);
      onReplace(uploaded.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-image-field">
      {str ? (
        <div
          className={`admin-field-preview-drop${dragOver ? ' is-over' : ''}${busy ? ' is-busy' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <img className="admin-field-preview" src={str} alt="" loading="lazy" />
          <span className="admin-field-preview-hint">{busy ? 'Uploading…' : 'Drop a photo here to replace'}</span>
        </div>
      ) : (
        <div
          className={`admin-drop admin-drop-field${dragOver ? ' is-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span>{busy ? 'Uploading…' : 'Drop a photo here, or use Pick'}</span>
        </div>
      )}
      <div className="admin-field-row" style={{ marginTop: 6 }}>
        <button type="button" className="admin-mini" onClick={onPick}>Pick</button>
        {showPosition && str && (
          <button
            type="button"
            className={`admin-mini${adjusting ? ' is-active' : ''}`}
            onClick={() => setAdjusting((a) => !a)}
          >
            {adjusting ? 'Done adjusting' : 'Adjust position'}
          </button>
        )}
      </div>
      {error && <p className="admin-json-error">{error}</p>}
      {adjusting && str && (
        <>
          <FocalPicker
            src={str}
            x={focalX ?? 50}
            y={focalY ?? 50}
            onChange={onFocalChange}
          />
          <div className="admin-field-row" style={{ marginTop: 6 }}>
            <span className="admin-mini-label">
              Crop focus: {focalX ?? 50}%, {focalY ?? 50}%
            </span>
            <button type="button" className="admin-mini" onClick={() => onFocalChange(50, 50)}>
              Reset to center
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, path, value, parent, onChange, onPick }) {
  const key = path[path.length - 1];
  const id = path.join('.');

  // Primitive: string / number / boolean
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'boolean') {
      return (
        <label className="admin-field admin-field-inline">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(path, e.target.checked)}
          />
          {label}
        </label>
      );
    }

    const isImage = IMAGE_KEYS.has(String(key));
    const str = value == null ? '' : String(value);
    const long = str.length > 70 || str.includes('\n');
    // Only src+alt gallery entries carry a focal point the public pages
    // actually read — showing the control elsewhere would be a dead knob.
    const supportsPosition = key === 'src' && parent && Object.prototype.hasOwnProperty.call(parent, 'alt');
    const parentPath = path.slice(0, -1);

    return (
      <div className="admin-field">
        <label htmlFor={id}>{label}</label>
        {isImage ? (
          <ImageField
            str={str}
            onPick={() => onPick(path)}
            onReplace={(url) => onChange(path, url)}
            showPosition={supportsPosition}
            focalX={parent?.focalX}
            focalY={parent?.focalY}
            onFocalChange={(x, y) => {
              // One combined write, not two onChange calls — each onChange
              // closes over the same pre-update `value`, so calling it twice
              // in a row would let the second call silently clobber the first.
              onChange(parentPath, { ...parent, focalX: x, focalY: y });
            }}
          />
        ) : (
          <div className="admin-field-row">
            {long ? (
              <textarea
                id={id}
                value={str}
                rows={3}
                onChange={(e) => onChange(path, e.target.value)}
              />
            ) : (
              <input
                id={id}
                type={typeof value === 'number' ? 'number' : 'text'}
                value={str}
                onChange={(e) =>
                  onChange(
                    path,
                    typeof value === 'number' ? Number(e.target.value) : e.target.value
                  )
                }
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    const sample = value[0];
    const primitiveItems = value.length === 0 || typeof sample !== 'object' || sample === null;
    // A gallery-shaped array (entries with src+alt) accepts a multi-file drop
    // on its own "+ Add" row to append new photos straight in, auto-named.
    const isGalleryArray =
      !primitiveItems && sample && Object.prototype.hasOwnProperty.call(sample, 'src');
    const [dragOver, setDragOver] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function handleGalleryDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = filesFromDrop(e);
      if (files.length === 0) return;
      setBusy(true);
      setError('');
      try {
        const uploaded = await uploadFiles(files);
        const additions = uploaded.map((u) => ({
          ...blankLike(sample || { src: '', alt: '' }),
          src: u.url,
          alt: '',
          focalX: 50,
          focalY: 50,
        }));
        onChange(path, [...value, ...additions]);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="admin-group">
        <div className="admin-group-head">
          <span>{label}</span>
          <button
            type="button"
            className="admin-mini"
            onClick={() =>
              onChange(path, [
                ...value,
                value.length ? blankLike(sample) : '',
              ])
            }
          >
            + Add
          </button>
        </div>

        {value.map((item, i) => (
          <div className="admin-array-item" key={i}>
            <div className="admin-array-controls">
              <button
                type="button"
                className="admin-mini"
                disabled={i === 0}
                onClick={() =>
                  onChange(
                    path,
                    (() => {
                      const a = [...value];
                      [a[i - 1], a[i]] = [a[i], a[i - 1]];
                      return a;
                    })()
                  )
                }
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-mini"
                disabled={i === value.length - 1}
                onClick={() =>
                  onChange(
                    path,
                    (() => {
                      const a = [...value];
                      [a[i + 1], a[i]] = [a[i], a[i + 1]];
                      return a;
                    })()
                  )
                }
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="admin-mini admin-mini-danger"
                onClick={() => onChange(path, value.filter((_, j) => j !== i))}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>

            {primitiveItems ? (
              <Field
                label={`${i + 1}`}
                path={[...path, String(i)]}
                value={item}
                parent={parent}
                onChange={onChange}
                onPick={onPick}
              />
            ) : (
              <div className="admin-array-fields">
                {Object.keys(item).filter((k) => k !== 'focalX' && k !== 'focalY').map((k) => (
                  <Field
                    key={k}
                    label={k}
                    path={[...path, String(i), k]}
                    value={item[k]}
                    parent={item}
                    onChange={onChange}
                    onPick={onPick}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {isGalleryArray && (
          <div
            className={`admin-drop admin-drop-field${dragOver ? ' is-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleGalleryDrop}
          >
            <span>{busy ? 'Uploading…' : 'Drop photos here to add them to this gallery'}</span>
          </div>
        )}
        {error && <p className="admin-json-error">{error}</p>}
      </div>
    );
  }

  // Plain object
  return (
    <div className="admin-group">
      <div className="admin-group-head">
        <span>{label}</span>
      </div>
      {Object.keys(value).filter((k) => k !== 'focalX' && k !== 'focalY').map((k) => (
        <Field
          key={k}
          label={k}
          path={[...path, k]}
          value={value[k]}
          parent={value}
          onChange={onChange}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

// A page's own copy (home/about/contact/...) is a plain object, not a list —
// render its fields directly instead of the "list of entries" UI below.
function ObjectForm({ value, onChange }) {
  const [pickerPath, setPickerPath] = useState(null);

  function handleChange(path, newValue) {
    onChange(setAt(value, path, newValue));
  }

  return (
    <div className="admin-structured admin-structured-flat">
      {Object.keys(value).map((k) => (
        <Field
          key={k}
          label={k}
          path={[k]}
          value={value[k]}
          parent={value}
          onChange={handleChange}
          onPick={setPickerPath}
        />
      ))}
      <ImagePickerModal
        open={pickerPath !== null}
        onClose={() => setPickerPath(null)}
        onPick={(url) => {
          handleChange(pickerPath, url);
          setPickerPath(null);
        }}
      />
    </div>
  );
}

export default function StructuredEditor({ value, onChange }) {
  const [pickerPath, setPickerPath] = useState(null);

  if (!Array.isArray(value)) {
    if (value && typeof value === 'object') {
      return <ObjectForm value={value} onChange={onChange} />;
    }
    return (
      <p className="admin-json-error">
        This section can only be edited in the Raw JSON tab.
      </p>
    );
  }

  function handleChange(path, newValue) {
    onChange(setAt(value, path, newValue));
  }

  return (
    <div className="admin-structured">
      {value.map((entry, i) => (
        <details className="admin-entry" key={i} open={value.length <= 3}>
          <summary>
            {entry.title || entry.name || entry.eyebrow || `Item ${i + 1}`}
          </summary>
          <div className="admin-entry-body">
            <div className="admin-array-controls admin-array-controls-top">
              <button
                type="button"
                className="admin-mini"
                disabled={i === 0}
                onClick={() =>
                  onChange(
                    (() => {
                      const a = [...value];
                      [a[i - 1], a[i]] = [a[i], a[i - 1]];
                      return a;
                    })()
                  )
                }
              >
                ↑ Move up
              </button>
              <button
                type="button"
                className="admin-mini"
                disabled={i === value.length - 1}
                onClick={() =>
                  onChange(
                    (() => {
                      const a = [...value];
                      [a[i + 1], a[i]] = [a[i], a[i + 1]];
                      return a;
                    })()
                  )
                }
              >
                ↓ Move down
              </button>
              <button
                type="button"
                className="admin-mini admin-mini-danger"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                ✕ Delete this entry
              </button>
            </div>

            {Object.keys(entry).map((k) => (
              <Field
                key={k}
                label={k}
                path={[String(i), k]}
                value={entry[k]}
                parent={entry}
                onChange={handleChange}
                onPick={setPickerPath}
              />
            ))}
          </div>
        </details>
      ))}

      <button
        type="button"
        className="admin-mini"
        onClick={() =>
          onChange([...value, value.length ? blankLike(value[0]) : {}])
        }
      >
        + Add entry
      </button>

      <ImagePickerModal
        open={pickerPath !== null}
        onClose={() => setPickerPath(null)}
        onPick={(url) => {
          handleChange(pickerPath, url);
          setPickerPath(null);
        }}
      />
    </div>
  );
}
