'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from './ui';
import EditableCell from './EditableCell';
import { Icon } from './JobsIcons';
import { MAX_TODO_LENGTH } from '../../../../lib/todos';

class ApiError extends Error {}

async function api(method, body) {
  let res;
  try {
    res = await fetch('/api/admin/todos', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(d.error || 'Something went wrong. Please try again.');
  return d;
}

function clip(text, n = 50) {
  const t = String(text || '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default function TodosView() {
  const [items, setItems] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState(null);
  const [showDone, setShowDone] = useState(true);
  const [clearing, setClearing] = useState(false);

  // itemsRef always holds the latest list so async handlers never read a stale closure.
  const itemsRef = useRef(null);
  const inflight = useRef(0);
  const mutations = useRef(0);
  const lastLoad = useRef(0);
  const tempSeq = useRef(0);
  const noticeTimer = useRef(null);
  const inputRef = useRef(null);
  const pendingFocus = useRef(null); // { list: 'open' | 'done', index } -- where to put keyboard focus after a row moves

  const setAll = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(itemsRef.current || []) : updater;
    itemsRef.current = next;
    setItems(next);
  }, []);

  const load = useCallback(async (silent) => {
    const startedAt = mutations.current;
    lastLoad.current = Date.now();
    try {
      const res = await fetch('/api/admin/todos');
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || 'Request failed.');
      const list = Array.isArray(d.items) ? d.items : [];
      const recovered = itemsRef.current === null;
      // Don't overwrite the screen with a list fetched before an edit that has since happened.
      if (itemsRef.current === null || (mutations.current === startedAt && inflight.current === 0)) {
        setAll(list);
      }
      if (!silent || recovered) { setLoadFailed(false); setError(''); }
    } catch (e) {
      if (!silent) {
        setLoadFailed(true);
        setError(e.message && e.message !== 'Request failed.' ? e.message : 'Could not load your to-dos.');
      }
    }
  }, [setAll]);

  useEffect(() => { load(false); }, [load]);

  // Coming back to the tab (e.g. from your phone) quietly refreshes the list.
  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'visible') return;
      if (inflight.current > 0 || Date.now() - lastLoad.current < 5000) return;
      load(true);
    }
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  // After a row is ticked, un-ticked or deleted it leaves where it was, which would drop keyboard
  // focus to the page. Put focus on the row that took its place (or the one before, or the add box).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const rows = document.querySelectorAll(`.todos-list[data-list="${target.list}"] .todos-check`);
    const next = rows[Math.min(target.index, rows.length - 1)];
    (next || inputRef.current)?.focus();
  }, [items]);

  function rememberFocus(todo) {
    const list = todo.done ? 'done' : 'open';
    const index = (list === 'done' ? done : open).findIndex((t) => t.id === todo.id);
    if (document.activeElement && document.activeElement.closest?.('.todos-row')) {
      pendingFocus.current = { list, index: Math.max(index, 0) };
    }
  }
  const noticeSeq = useRef(0);
  function showNotice(message, undo) {
    clearTimeout(noticeTimer.current);
    const id = ++noticeSeq.current;
    setNotice({ id, message, undo });
    noticeTimer.current = setTimeout(() => setNotice((cur) => (cur && cur.id === id ? null : cur)), 7000);
    return id;
  }

  // Runs one change against a to-do: shows `optimistic` right away, sends `fields`, and puts
  // back only the fields we touched (and only if nobody changed them since) if it fails.
  async function updateTodo(id, fields, optimistic = fields) {
    const cur = itemsRef.current?.find((t) => t.id === id);
    if (!cur || cur._pending) return false;
    mutations.current += 1;
    inflight.current += 1;
    setError('');

    const prev = {};
    for (const k of Object.keys(optimistic)) prev[k] = cur[k];
    setAll((list) => list.map((t) => (t.id === id ? { ...t, ...optimistic, _pending: true } : t)));

    try {
      const d = await api('PATCH', { id, ...fields });
      setAll((list) => list.map((t) => (t.id === id ? { ...d.item } : t)));
      return true;
    } catch (e) {
      setError(e.message);
      setAll((list) => list.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, _pending: false };
        for (const k of Object.keys(prev)) if (next[k] === optimistic[k]) next[k] = prev[k];
        return next;
      }));
      return false;
    } finally {
      inflight.current -= 1;
    }
  }

  async function addTodo(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || !itemsRef.current) { inputRef.current?.focus(); return; }

    mutations.current += 1;
    inflight.current += 1;
    setError('');
    const tempId = `tmp-${Date.now()}-${++tempSeq.current}`;
    setAll((list) => [...list, {
      id: tempId, text: value, done: false, completed_at: null, sort_order: Date.now(), created_at: new Date().toISOString(), _pending: true,
    }]);
    setText('');
    inputRef.current?.focus();

    try {
      const d = await api('POST', { text: value });
      setAll((list) => list.map((t) => (t.id === tempId ? d.item : t)));
    } catch (err) {
      setAll((list) => list.filter((t) => t.id !== tempId));
      setText((cur) => cur || value); // give the text back unless they've already started the next one
      setError(err.message);
    } finally {
      inflight.current -= 1;
    }
  }

  function toggle(todo) {
    const done = !todo.done;
    rememberFocus(todo);
    updateTodo(todo.id, { done }, { done, completed_at: done ? new Date().toISOString() : null });
  }

  function remove(todo) {
    const original = todo;
    rememberFocus(todo);
    mutations.current += 1;
    inflight.current += 1;
    setError('');
    setAll((list) => list.filter((t) => t.id !== todo.id));

    let noticeId = null;
    const deleting = api('DELETE', { id: todo.id })
      .catch((err) => {
        setError(err.message);
        setAll((list) => (list.some((t) => t.id === original.id) ? list : [...list, original]));
        // Only take down this delete's own "Undo" message, never a later delete's.
        setNotice((cur) => (cur && cur.id === noticeId ? null : cur));
        return false;
      })
      .finally(() => { inflight.current -= 1; });

    noticeId = showNotice(`Deleted “${clip(todo.text)}”`, async () => {
      if ((await deleting) === false) return; // the delete failed and it's already back
      mutations.current += 1;
      inflight.current += 1;
      try {
        // Put it back exactly where (and as) it was, including when it was finished.
        const d = await api('POST', {
          text: original.text,
          done: original.done,
          completed_at: original.done ? original.completed_at : undefined,
          sort_order: original.sort_order,
        });
        setAll((list) => [...list, d.item]);
      } catch (err) {
        setError(err.message);
      } finally {
        mutations.current += 1; // a refresh that started during the restore must not overwrite it
        inflight.current -= 1;
      }
    });
  }

  async function clearDone() {
    setClearing(true);
    inflight.current += 1;
    let locked = new Set();
    try {
      const ids = (itemsRef.current || []).filter((t) => t.done && !t._pending).map((t) => t.id);
      if (!ids.length) return;
      if (!confirm(`Permanently delete ${plural(ids.length, 'finished to-do')}? This can't be undone.`)) return;
      mutations.current += 1;
      setError('');
      // Lock these rows while the delete runs, so one can't be un-ticked mid-way and left behind.
      locked = new Set(ids);
      setAll((list) => list.map((t) => (locked.has(t.id) ? { ...t, _pending: true } : t)));
      // Sending the ids means anything ticked off on another device since the last refresh is left alone.
      await api('DELETE', { clearDone: true, ids });
      setAll((list) => list.filter((t) => !locked.has(t.id)));
    } catch (err) {
      setError(err.message);
      setAll((list) => list.map((t) => (locked.has(t.id) ? { ...t, _pending: false } : t)));
    } finally {
      inflight.current -= 1;
      setClearing(false);
    }
  }

  const { open, done } = useMemo(() => {
    const list = items || [];
    return {
      open: list.filter((t) => !t.done).sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
      done: list.filter((t) => t.done).sort((a, b) => (Date.parse(b.completed_at) || 0) - (Date.parse(a.completed_at) || 0)),
    };
  }, [items]);

  // A plain function (not a component) so rows keep their identity, and any half-typed edit, across re-renders.
  function renderRow(todo) {
    const locked = Boolean(todo._pending);
    return (
      <li key={todo.id} className={`todos-row${todo.done ? ' is-done' : ''}${locked ? ' is-pending' : ''}`}>
        <button
          type="button"
          role="checkbox"
          aria-checked={todo.done}
          aria-label={todo.text}
          className="todos-check"
          aria-disabled={locked || undefined}
          onClick={() => { if (!locked) toggle(todo); }}
        >
          <span className="todos-check-dot">{Icon.check}</span>
        </button>
        <div className="todos-text">
          <EditableCell
            value={todo.text}
            placeholder="To-do"
            maxLength={MAX_TODO_LENGTH}
            disabled={locked}
            onSave={(v) => v && updateTodo(todo.id, { text: v })}
          />
        </div>
        <button
          type="button"
          className="todos-del"
          aria-label={`Delete ${todo.text}`}
          title="Delete"
          aria-disabled={locked || undefined}
          onClick={() => { if (!locked) remove(todo); }}
        >
          {Icon.trash}
        </button>
      </li>
    );
  }

  return (
    <div className="admin-page todos-page">
      <h1>To-Do</h1>
      <p className="admin-lead">
        Your running list of things to remember. Type it, hit Enter, tick it off when it's done.
        Click any item to reword it. For work tied to a client (with time, priority and expected
        income), use Jobs.
      </p>

      {error && (
        <p className="admin-error" role="alert">{error}</p>
      )}

      <form className="todos-add" onSubmit={addTodo} aria-label="Add a to-do">
        <input
          ref={inputRef}
          className="todos-input"
          value={text}
          maxLength={MAX_TODO_LENGTH}
          placeholder="e.g. Order mulch for the Lee job"
          aria-label="New to-do"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="admin-primary todos-add-btn" disabled={!text.trim() || !items}>
          {Icon.plus}
          Add
        </button>
      </form>

      {!items ? (
        loadFailed ? (
          <button type="button" className="admin-mini" onClick={() => load(false)}>Try again</button>
        ) : (
          <>
            <Skeleton h={52} style={{ marginBottom: 8 }} />
            <Skeleton h={52} style={{ marginBottom: 8 }} />
            <Skeleton h={52} />
          </>
        )
      ) : (
        <>
          <p className="todos-count" aria-live="polite">
            {plural(open.length, 'to-do')} left{done.length > 0 ? ` · ${done.length} done` : ''}
          </p>

          {open.length === 0 ? (
            <p className="todos-empty">
              {done.length > 0 ? 'Nothing left. Nice work.' : 'Nothing on your list yet. Add your first to-do above.'}
            </p>
          ) : (
            <ul className="todos-list" data-list="open">
              {open.map(renderRow)}
            </ul>
          )}

          {done.length > 0 && (
            <section className="todos-done" aria-label="Finished to-dos">
              <header className="todos-done-head">
                <button
                  type="button"
                  className="todos-done-toggle"
                  aria-expanded={showDone}
                  onClick={() => setShowDone((v) => !v)}
                >
                  <svg className={`todos-chev${showDone ? ' is-open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                  Done ({done.length})
                </button>
                {showDone && (
                  <button type="button" className="admin-mini admin-mini-danger" disabled={clearing} onClick={clearDone}>
                    {clearing ? 'Clearing…' : 'Clear completed'}
                  </button>
                )}
              </header>
              {showDone && (
                <ul className="todos-list" data-list="done">
                  {done.map(renderRow)}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <div className="jobs-toast-region" role="status" aria-live="polite">
        {notice && (
          <div className="jobs-toast">
            <span>{notice.message}</span>
            {notice.undo && (
              <button type="button" className="jobs-undo" onClick={() => { notice.undo(); setNotice(null); }}>Undo</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
