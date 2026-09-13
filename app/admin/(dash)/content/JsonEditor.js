'use client';

import { useEffect, useState } from 'react';

// Raw-JSON escape hatch for a content section. Parents pass the current value and
// get a parsed value back only when it is valid JSON.
export default function JsonEditor({ value, onValidChange }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  // Re-seed when the parent swaps the value (section change, reset-to-default).
  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setError('');
  }, [value]);

  function handleChange(next) {
    setText(next);
    try {
      const parsed = JSON.parse(next);
      setError('');
      onValidChange(parsed);
    } catch (e) {
      setError(e.message);
      onValidChange(undefined); // signal "not saveable"
    }
  }

  return (
    <div className="admin-json">
      <textarea
        spellCheck={false}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={24}
      />
      {error ? (
        <p className="admin-json-error">Invalid JSON: {error}</p>
      ) : (
        <p className="admin-json-ok">JSON is valid.</p>
      )}
    </div>
  );
}
