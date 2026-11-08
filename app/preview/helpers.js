'use client';

// Small helpers shared by the Visual-editor templates in app/preview/views.
// Every template receives the page's content object `c` and a setter; the
// content may be missing any field (an older saved row), so read defensively.

export const set = (c, key, value) => ({ ...c, [key]: value });

export function arr(c, key) {
  return Array.isArray(c?.[key]) ? c[key] : [];
}

// Edit one field of the object at c[key][index], or the string itself when `field` is null.
export function setItem(c, key, index, field, value) {
  const list = arr(c, key).slice();
  list[index] = field == null ? value : { ...list[index], [field]: value };
  return { ...c, [key]: list };
}
export function addItem(c, key, item) {
  return { ...c, [key]: [...arr(c, key), item] };
}
export function removeItem(c, key, index) {
  return { ...c, [key]: arr(c, key).filter((_, i) => i !== index) };
}

// A photo field is { image, alt } (the editor shape) or a bare URL string.
export function photoSrc(field, fallback) {
  const v = typeof field === 'string' ? field : field?.image;
  return (typeof v === 'string' && v.trim()) || fallback;
}

export function Bar({ label }) {
  return (
    <div className="pv-bar">
      <b>Live preview</b>
      <span>{label} — click any highlighted text to edit it. Photos are changed in the Form tab.</span>
    </div>
  );
}

// Wraps a repeating item so it can be removed.
export function Removable({ onRemove, children, className = '' }) {
  return (
    <div className={`pv-card-wrap ${className}`}>
      <button type="button" className="pv-remove-btn" onClick={onRemove} title="Remove" aria-label="Remove">
        ✕
      </button>
      {children}
    </div>
  );
}

export function AddButton({ onClick, children }) {
  return (
    <button type="button" className="pv-add-btn" onClick={onClick}>
      + {children}
    </button>
  );
}
