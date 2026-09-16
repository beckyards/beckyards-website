'use client';

import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from './ui';

const FILTERS = [
  ['inbox', 'Inbox'],
  ['archived', 'Archived'],
  ['all', 'All'],
];

function fullDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function MessagesView() {
  const [filter, setFilter] = useState('inbox');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [openReplyId, setOpenReplyId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [sendError, setSendError] = useState({});

  const load = useCallback((f) => {
    setItems(null);
    setError('');
    fetch(`/api/admin/messages?filter=${f}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items);
      })
      .catch(() => setError('Could not load messages.'));
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  async function act(id, action) {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Update failed.'); return; }

      setItems((prev) =>
        prev
          .map((m) => {
            if (m.id !== id) return m;
            if (action === 'read') return { ...m, read_at: new Date().toISOString() };
            if (action === 'unread') return { ...m, read_at: null };
            if (action === 'archive') return { ...m, archived: true, read_at: m.read_at || new Date().toISOString() };
            if (action === 'unarchive') return { ...m, archived: false };
            return m;
          })
          .filter((m) =>
            filter === 'all' ? true : filter === 'inbox' ? !m.archived : m.archived
          )
      );
    } finally {
      setBusyId(null);
    }
  }

  async function sendReply(id) {
    const text = (drafts[id] || '').trim();
    if (!text) return;
    setSendingId(id);
    setSendError((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, body: text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError((prev) => ({ ...prev, [id]: d.error || 'Could not send the reply.' }));
        return;
      }
      setItems((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, read_at: m.read_at || new Date().toISOString(), message_replies: [...(m.message_replies || []), d.reply] }
            : m
        )
      );
      setDrafts((prev) => ({ ...prev, [id]: '' }));
      setOpenReplyId(null);
    } finally {
      setSendingId(null);
    }
  }

  async function remove(id) {
    if (!confirm('Permanently delete this message? This cannot be undone — use Archive to keep it out of the way instead.')) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Delete failed.'); return; }
      setItems((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  const unread = items?.filter((m) => !m.read_at && !m.archived).length || 0;

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Messages</h1>
          <p className="admin-lead">
            Every submission from the site contact form. {unread > 0 ? `${unread} unread in the inbox.` : 'Inbox is clear.'}
          </p>
        </div>
        <div className="admin-head-actions">
          <div className="seg">
            {FILTERS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={v === filter ? 'is-active' : undefined}
                onClick={() => setFilter(v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {!items ? (
        <><Skeleton h={92} style={{ marginBottom: 10 }} /><Skeleton h={92} style={{ marginBottom: 10 }} /><Skeleton h={92} /></>
      ) : items.length === 0 ? (
        <p className="admin-empty">Nothing here.</p>
      ) : (
        <div className="msg-list">
          {items.map((m) => (
            <article key={m.id} className={`msg${!m.read_at && !m.archived ? ' is-unread' : ''}`}>
              <div className="msg-top">
                <div>
                  <span className="msg-who">{m.name}</span>{' '}
                  <a className="msg-mail" href={`mailto:${m.email}`}>{m.email}</a>
                  {m.phone && <span className="msg-mail"> · {m.phone}</span>}
                </div>
                <span className="msg-date">{fullDate(m.created_at)}</span>
              </div>
              {m.address && <p className="msg-body" style={{ color: 'var(--a-dim)', fontSize: 13 }}>{m.address}</p>}
              <p className="msg-body">{m.message}</p>

              {m.message_replies?.length > 0 && (
                <div className="msg-replies">
                  {m.message_replies.map((r) => (
                    <div key={r.id} className="msg-reply">
                      <span className="msg-reply-meta">You replied · {fullDate(r.sent_at)}</span>
                      <p className="msg-body">{r.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {openReplyId === m.id && (
                <div className="msg-reply-composer">
                  <textarea
                    rows={4}
                    placeholder={`Reply to ${m.name}…`}
                    value={drafts[m.id] || ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    disabled={sendingId === m.id}
                  />
                  {sendError[m.id] && <p className="admin-json-error">{sendError[m.id]}</p>}
                  <div className="msg-actions">
                    <button
                      className="admin-mini admin-mini-primary"
                      disabled={sendingId === m.id || !(drafts[m.id] || '').trim()}
                      onClick={() => sendReply(m.id)}
                    >
                      {sendingId === m.id ? 'Sending…' : 'Send reply'}
                    </button>
                    <button className="admin-mini" disabled={sendingId === m.id} onClick={() => setOpenReplyId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="msg-actions">
                {openReplyId !== m.id && (
                  <button className="admin-mini" onClick={() => setOpenReplyId(m.id)}>
                    Reply
                  </button>
                )}
                <a
                  className="admin-mini"
                  href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your BeckYards quote request')}`}
                >
                  Open in email app
                </a>
                {m.read_at ? (
                  <button className="admin-mini" disabled={busyId === m.id} onClick={() => act(m.id, 'unread')}>
                    Mark unread
                  </button>
                ) : (
                  <button className="admin-mini" disabled={busyId === m.id} onClick={() => act(m.id, 'read')}>
                    Mark read
                  </button>
                )}
                {m.archived ? (
                  <button className="admin-mini" disabled={busyId === m.id} onClick={() => act(m.id, 'unarchive')}>
                    Move to inbox
                  </button>
                ) : (
                  <button className="admin-mini" disabled={busyId === m.id} onClick={() => act(m.id, 'archive')}>
                    Archive
                  </button>
                )}
                <button
                  className="admin-mini admin-mini-danger"
                  disabled={busyId === m.id}
                  onClick={() => remove(m.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
