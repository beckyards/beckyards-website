'use client';

// Shared by the three Advertising pages: talking to the API, loading both lists, and a few
// small display pieces.

import { useCallback, useEffect, useState } from 'react';
import { formatMoney } from '../../../../lib/jobs';
import { campaignYear } from '../../../../lib/advertising';

export async function adRequest(url, method, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
  return d;
}

// Loads campaigns and leads together. `ready` is false until both have arrived, so a page never
// shows totals built from half the data.
export function useAdData() {
  const [campaigns, setCampaigns] = useState(null);
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([adRequest('/api/admin/ad-campaigns', 'GET'), adRequest('/api/admin/ad-leads', 'GET')])
      .then(([c, l]) => {
        setCampaigns(c.items || []);
        setLeads(l.items || []);
      })
      .catch((e) => setError(e.message || 'Could not load your advertising.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { campaigns, leads, setCampaigns, setLeads, error, setError, load, ready: campaigns !== null && leads !== null };
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// $ amounts: whole dollars when there are no cents; "—" when there's nothing.
export function money(v) {
  const s = formatMoney(v);
  return s || '—';
}

// Shows $0 as "$0" (formatMoney treats null/'' as blank but 0 as a real amount).
export function moneyZero(v) {
  return formatMoney(Number(v) || 0);
}

export function yearLabel(y) {
  return y === 'all' ? 'All years' : String(y);
}

export function Summary({ items }) {
  return (
    <div className="ad-summary">
      {items.map((it) => (
        <div className={`ad-sum-item${it.tone ? ` is-${it.tone}` : ''}`} key={it.label}>
          <span className="ad-sum-label">{it.label}</span>
          <span className="ad-sum-num">{it.value}</span>
          {it.sub ? <span className="ad-sum-sub">{it.sub}</span> : null}
        </div>
      ))}
    </div>
  );
}

// The "which ad" dropdown entries. Each reads "Name (2027)" so two years of the same ad never look alike.
export function campaignOptions(campaigns) {
  return [...campaigns]
    .sort((a, b) => (b.start_date || b.created_at || '').localeCompare(a.start_date || a.created_at || ''))
    .map((c) => ({ id: c.id, label: `${c.name} (${campaignYear(c)})` }));
}
