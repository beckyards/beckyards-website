'use client';

import { useEffect, useState } from 'react';

// Click straight on a value to edit it in place.
// Saves on blur (or Enter); Escape cancels without saving.
export default function EditableCell({ value, placeholder, type = 'text', format, maxLength, disabled, onSave }) {
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
        maxLength={maxLength}
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
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && setEditing(true)}
      onKeyDown={(e) => {
        // Keyboard users: Enter or Space opens the editor, just like a click.
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditing(true); }
      }}
    >
      {value ? value : <span className="admin-editable-placeholder">{placeholder}</span>}
    </span>
  );
}
