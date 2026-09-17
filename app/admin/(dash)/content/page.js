'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import StructuredEditor from './StructuredEditor';
import JsonEditor from './JsonEditor';
import VisualEditor from '../_components/VisualEditor';

const SECTIONS = [
  { key: 'home', label: 'Homepage' },
  { key: 'about', label: 'About page' },
  { key: 'contact', label: 'Contact page' },
  { key: 'terms', label: 'Terms page' },
  { key: 'promoBar', label: 'Top promo bar' },
  { key: 'footer', label: 'Footer' },
  { key: 'services', label: 'Services' },
  { key: 'programs', label: 'Programs' },
  { key: 'portfolio', label: 'Portfolio' },
];

// Sections with a matching /preview/[key] template — see app/preview/[key]/page.js.
// Services/Programs/Portfolio are lists of cards/photos, not page copy, so
// they stay on the Form + Raw JSON pair only.
const VISUAL_KEYS = new Set(['home', 'about', 'contact', 'terms', 'promoBar', 'footer']);

export default function ContentPage() {
  const [section, setSection] = useState('home');
  const [mode, setMode] = useState('visual'); // 'visual' | 'form' | 'json'

  const [value, setValue] = useState(null); // working copy
  const [jsonValid, setJsonValid] = useState(true);
  const [meta, setMeta] = useState({ isDefault: true, updatedAt: null });
  const [status, setStatus] = useState('loading'); // loading | ready | saving | saved | error
  const [message, setMessage] = useState('');
  const savedSnapshot = useRef(null); // JSON string of `value` as last loaded/saved, for the unsaved-changes guard

  const load = useCallback((key) => {
    setStatus('loading');
    setMessage('');
    fetch(`/api/admin/content?key=${key}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus('error');
          setMessage(data.error);
          return;
        }
        setValue(data.value);
        savedSnapshot.current = JSON.stringify(data.value);
        setMeta({ isDefault: data.isDefault, updatedAt: data.updatedAt });
        setJsonValid(true);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not load this section.');
      });
  }, []);

  useEffect(() => {
    load(section);
    setMode(VISUAL_KEYS.has(section) ? 'visual' : 'form');
  }, [section, load]);

  const isDirty = value != null && JSON.stringify(value) !== savedSnapshot.current;

  // Warn before leaving the tab/window with unsaved edits — this is the one
  // place in the admin where a stray tab close could quietly lose real work.
  useEffect(() => {
    function onBeforeUnload(e) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Cmd/Ctrl+S saves the current section instead of triggering the browser's
  // save-page dialog. Kept in a ref so the listener (attached once) always
  // calls the save() from the latest render, not a stale closure.
  const saveRef = useRef(() => {});
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function changeSection(key) {
    if (key === section) return;
    if (isDirty && !confirm('You have unsaved changes to this section. Switch anyway and lose them?')) {
      return;
    }
    setSection(key);
  }

  async function save() {
    if (status === 'saving' || status === 'loading') return;
    if (mode === 'json' && !jsonValid) return;
    if (value == null) return;
    setStatus('saving');
    setMessage('');
    const res = await fetch('/api/admin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: section, value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus('error');
      setMessage(data.error || 'Save failed.');
      return;
    }
    savedSnapshot.current = JSON.stringify(value);
    setStatus('saved');
    setMeta((m) => ({ ...m, isDefault: false, updatedAt: new Date().toISOString() }));
    setMessage('Saved. Live on the site within about a minute.');
  }
  saveRef.current = save;

  async function resetToDefault() {
    if (!confirm('Discard your saved edits for this section and go back to the built-in content?')) {
      return;
    }
    setStatus('saving');
    const res = await fetch('/api/admin/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: section }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus('error');
      setMessage(data.error || 'Reset failed.');
      return;
    }
    setValue(data.value);
    savedSnapshot.current = JSON.stringify(data.value);
    setMeta({ isDefault: true, updatedAt: null });
    setStatus('saved');
    setMessage('Reset to the built-in content.');
  }

  const canSave =
    status !== 'saving' &&
    value !== undefined &&
    value !== null &&
    (mode !== 'json' || jsonValid);

  const supportsVisual = VISUAL_KEYS.has(section);

  return (
    <div className={`admin-page${mode === 'visual' ? ' admin-page-wide' : ''}`}>
      <h1>Content</h1>
      <p className="admin-lead">
        Edit what the public pages show. Changes are stored in Supabase and picked
        up by the site within about a minute — no deploy needed.
      </p>

      <div className="admin-tabs">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={s.key === section ? 'is-active' : undefined}
            onClick={() => changeSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="admin-subbar">
        <div className="admin-modeswitch">
          {supportsVisual && (
            <button
              type="button"
              className={mode === 'visual' ? 'is-active' : undefined}
              onClick={() => setMode('visual')}
            >
              Visual
            </button>
          )}
          <button
            type="button"
            className={mode === 'form' ? 'is-active' : undefined}
            onClick={() => setMode('form')}
          >
            Form
          </button>
          <button
            type="button"
            className={mode === 'json' ? 'is-active' : undefined}
            onClick={() => setMode('json')}
          >
            Raw JSON
          </button>
        </div>
        <span className="admin-src-tag">
          {meta.isDefault ? 'Showing built-in content' : 'Showing your saved edits'}
          {isDirty && <span className="admin-dirty-dot" title="Unsaved changes — Cmd/Ctrl+S to save"> ● Unsaved</span>}
        </span>
      </div>

      {status === 'loading' && <p>Loading…</p>}

      {status !== 'loading' && value != null && (
        <>
          {mode === 'visual' ? (
            <VisualEditor pageKey={section} value={value} onChange={setValue} />
          ) : mode === 'form' ? (
            <StructuredEditor value={value} onChange={setValue} />
          ) : (
            <JsonEditor
              value={value}
              onValidChange={(parsed) => {
                if (parsed === undefined) {
                  setJsonValid(false);
                } else {
                  setJsonValid(true);
                  setValue(parsed);
                }
              }}
            />
          )}

          <div className="admin-actions">
            <button
              type="button"
              className="admin-primary"
              onClick={save}
              disabled={!canSave}
            >
              {status === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            {!meta.isDefault && (
              <button type="button" className="admin-mini admin-mini-danger" onClick={resetToDefault}>
                Reset to built-in default
              </button>
            )}
          </div>
        </>
      )}

      {message && (
        <p className={status === 'error' ? 'admin-json-error' : 'admin-json-ok'}>{message}</p>
      )}
    </div>
  );
}
