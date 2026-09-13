'use client';

import { useEffect, useRef, useState } from 'react';

// Click straight on a piece of text in the preview to edit it in place. Not
// used anywhere on the real site — this file only ever loads inside
// /preview/[key], which the admin's Visual editor puts in an iframe.
export default function Editable({ value, onCommit, as: Tag = 'span', multiline = false, className, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select?.();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }
  function cancel() {
    setDraft(value || '');
    setEditing(false);
  }

  if (editing) {
    const Field = multiline ? 'textarea' : 'input';
    return (
      <Field
        ref={ref}
        className={`pv-edit-field ${className || ''}`}
        value={draft}
        rows={multiline ? Math.max(2, Math.min(12, Math.ceil((draft.length || 1) / 45))) : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') cancel();
        }}
      />
    );
  }

  return (
    <Tag className={`pv-editable ${className || ''}`} onClick={() => setEditing(true)} title="Click to edit">
      {value ? value : <span className="pv-placeholder">{placeholder || 'Click to add text'}</span>}
    </Tag>
  );
}
