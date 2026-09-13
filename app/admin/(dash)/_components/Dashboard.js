'use client';

import { useEffect, useState } from 'react';
import { StatTile, Panel, BarList, Skeleton, fmt } from './ui';
import TrafficChart from './TrafficChart';

const KEY_LABEL = { work: 'Work galleries', services: 'Services', offers: 'Offers' };

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const tz = new Date().getTimezoneOffset();
    Promise.all([
      fetch(`/api/admin/stats?tz=${tz}`).then((r) => r.json()),
      fetch('/api/admin/messages?filter=inbox').then((r) => r.json()),
    ])
      .then(([s, m]) => {
        if (s.error) setError(s.error);
        else setStats(s);
        if (!m.error) setMessages(m);
      })
      .catch(() => setError('Could not load the dashboard.'));
  }, []);

  const t = stats?.traffic;

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Dashboard</h1>
          <p className="admin-lead">
            Traffic, inquiries and content at a glance. Edits elsewhere in the panel go live within about a minute.
          </p>
        </div>
        <div className="admin-head-actions">
          <a className="admin-mini" href="/" target="_blank" rel="noreferrer">View site ↗</a>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="stat-row">
        {!stats ? (
          <>
            <Skeleton h={112} /><Skeleton h={112} /><Skeleton h={112} /><Skeleton h={112} />
          </>
        ) : (
          <>
            <StatTile
              label="Page views · 14d"
              value={fmt(t?.totals.views ?? 0)}
              delta={t?.totals.viewsDelta}
              spark={t?.series}
            />
            <StatTile
              label="Unique visitors · 14d"
              value={fmt(t?.totals.visitors ?? 0)}
              delta={t?.totals.visitorsDelta}
              sub={t?.totals.viewsPerVisitor ? `${t.totals.viewsPerVisitor} pages/visit` : undefined}
            />
            <StatTile
              label="Unread messages"
              value={fmt(stats.messages.unread)}
              sub={`${fmt(stats.messages.total)} total`}
            />
            <StatTile
              label="Images stored"
              value={fmt(stats.images.count)}
              sub={stats.overrides.length ? `${stats.overrides.length} content override${stats.overrides.length > 1 ? 's' : ''}` : 'No overrides'}
            />
          </>
        )}
      </div>

      <Panel title="Traffic" meta="Last 14 days">
        {!stats ? <Skeleton h={240} /> : <TrafficChart series={t?.series || []} />}
      </Panel>

      <div className="panel-grid">
        <Panel title="Top pages" meta="14 days">
          {!stats ? <Skeleton h={160} /> : (
            <BarList
              rows={t?.topPages || []}
              href={(label) => label}
              empty="No page views yet."
            />
          )}
        </Panel>
        <Panel title="Referrers" meta="14 days">
          {!stats ? <Skeleton h={160} /> : (
            <BarList
              rows={t?.referrers || []}
              href={(label) => `https://${label}`}
              empty="No external referrers yet."
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Recent inquiries"
        actions={<a className="admin-mini" href="/admin/messages">Open inbox</a>}
      >
        {!messages ? (
          <Skeleton h={120} />
        ) : messages.items.length === 0 ? (
          <p className="admin-empty">No messages in the inbox.</p>
        ) : (
          <div className="msg-list">
            {messages.items.slice(0, 4).map((m) => (
              <div key={m.id} className={`msg${!m.read_at ? ' is-unread' : ''}`}>
                <div className="msg-top">
                  <span className="msg-who">{m.name}</span>
                  <span className="msg-date">{timeAgo(m.created_at)}</span>
                </div>
                <p className="msg-body clamp">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="admin-cards">
        <a className="admin-card" href="/admin/analytics">
          <h2>Analytics →</h2>
          <p>Traffic trends, top pages, referrers, devices and countries over 7–90 days.</p>
        </a>
        <a className="admin-card" href="/admin/aeration">
          <h2>Aeration List →</h2>
          <p>Everyone who signed up for aeration & overseeding, with a spot to set their price.</p>
        </a>
        <a className="admin-card" href="/admin/images">
          <h2>Images →</h2>
          <p>Upload photos, rename them to something you'll recognize, copy URLs, or delete.</p>
        </a>
        <a className="admin-card" href="/admin/content">
          <h2>Content →</h2>
          <p>Edit every page's words — headlines, intros, team bios, terms — form or raw JSON.</p>
        </a>
      </div>

      {stats?.overrides?.length > 0 && (
        <div className="admin-note">
          <h3>Content overrides in effect</h3>
          <ul>
            {stats.overrides.map((o) => (
              <li key={o.key}>
                <strong>{KEY_LABEL[o.key] || o.key}</strong> — edited {timeAgo(o.updatedAt)}. “Reset to built-in default” on the Content page reverts it.
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats?.warnings?.length > 0 && (
        <p className="admin-lead" style={{ marginTop: 16, fontSize: 12 }}>
          Note: {stats.warnings.join(' · ')}
        </p>
      )}
    </div>
  );
}
