'use client';

import { Fragment, useMemo, useState } from 'react';
import { Panel, Skeleton } from './ui';
import { Summary, adRequest, moneyZero, plural, useAdData } from './adShared';
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  CHANNEL_GROUPS,
  IDEAS,
  MAX_LEN,
  SERVICES,
  campaignStats,
  campaignYear,
  formatRange,
  parseMoney,
  rollup,
} from '../../../../lib/advertising';

const BLANK = {
  name: '', channel: '', service: '', status: 'planned', start_date: '', end_date: '',
  cost: '', quantity: '', area: '', offer: '', notes: '',
};

function toForm(c) {
  return {
    name: c.name || '',
    channel: c.channel || '',
    service: c.service || '',
    status: c.status || 'planned',
    start_date: c.start_date || '',
    end_date: c.end_date || '',
    cost: Number(c.cost) ? String(Number(c.cost)) : '',
    quantity: c.quantity === null || c.quantity === undefined ? '' : String(c.quantity),
    area: c.area || '',
    offer: c.offer || '',
    notes: c.notes || '',
  };
}

// The form for a new campaign and for editing one. Only the four things that matter are showing;
// the rest is under "More details". Nothing is saved until the button is pressed.
function CampaignForm({ initial, submitLabel, busy, onSubmit, onCancel, onDelete, showIdeas, startOpen }) {
  const [f, setF] = useState(initial);
  const [problem, setProblem] = useState('');
  const [tip, setTip] = useState('');
  const [more, setMore] = useState(Boolean(startOpen));

  function set(field, value) {
    setF((prev) => ({ ...prev, [field]: value }));
  }

  function applyIdea(name) {
    const idea = IDEAS.find((i) => i.name === name);
    if (!idea) return;
    setF((prev) => ({
      ...prev,
      name: idea.name,
      channel: idea.channel,
      service: idea.service || prev.service,
      offer: idea.offer || prev.offer,
    }));
    setTip(idea.tip || '');
    setProblem('');
  }

  function submit(e) {
    e.preventDefault();
    if (busy) return;
    const name = f.name.trim();
    if (!name) return setProblem('Give the campaign a name.');
    if (!f.channel) return setProblem('Pick where it runs (door hangers, Facebook, yard signs…).');
    const cost = f.cost.trim() === '' ? 0 : parseMoney(f.cost);
    if (cost === null) return setProblem('What it costs should be a dollar amount, like 250 or 249.99.');
    const qtyText = f.quantity.trim();
    if (qtyText !== '' && !/^\d+$/.test(qtyText)) { setMore(true); return setProblem('"How many" should be a whole number, like 500.'); }
    if (f.start_date && f.end_date && f.end_date < f.start_date) { setMore(true); return setProblem('The end date is before the start date.'); }
    setProblem('');
    onSubmit({
      name,
      channel: f.channel,
      service: f.service || null,
      status: f.status,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      cost,
      quantity: qtyText === '' ? null : Number(qtyText),
      area: f.area.trim() || null,
      offer: f.offer.trim() || null,
      notes: f.notes.trim() || null,
    });
  }

  return (
    <form className="ad-form" onSubmit={submit} aria-label={submitLabel}>
      {showIdeas && (
        <div className="ad-ideas">
          <label className="ad-field">
            <span>Not sure where to start?</span>
            <select className="admin-height-select ad-ideas-select" value="" onChange={(e) => applyIdea(e.target.value)}>
              <option value="">Pick an idea and I'll fill it in…</option>
              {IDEAS.map((idea) => <option key={idea.name} value={idea.name}>{idea.name}</option>)}
            </select>
          </label>
          {tip && <p className="ad-tip">Tip: {tip}</p>}
        </div>
      )}

      <div className="ad-form-grid">
        <label className="ad-field ad-f-full">
          <span>What is it called?</span>
          <input className="admin-plain-input" value={f.name} maxLength={MAX_LEN.name} placeholder="e.g. Spring 2027 door hangers" autoComplete="off" onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="ad-field ad-f-third">
          <span>Where does it run?</span>
          <select className="admin-height-select" value={f.channel} onChange={(e) => set('channel', e.target.value)}>
            <option value="">Choose…</option>
            {CHANNEL_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="ad-field ad-f-third">
          <span>When does it start?</span>
          <input className="admin-plain-input" type="date" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </label>
        <label className="ad-field ad-f-third">
          <span>What does it cost?</span>
          <span className="admin-price-field ad-money-in">$<input inputMode="decimal" value={f.cost} placeholder="0" autoComplete="off" onChange={(e) => set('cost', e.target.value)} /></span>
        </label>
      </div>
      <p className="ad-hint">The start date puts it in the right year when you compare years later.</p>

      <details className="ad-more" open={more} onToggle={(e) => setMore(e.currentTarget.open)}>
        <summary>More details (optional)</summary>
        <div className="ad-form-grid">
          <label className="ad-field ad-f-third">
            <span>Pushing which service?</span>
            <select className="admin-height-select" value={f.service} onChange={(e) => set('service', e.target.value)}>
              <option value="">Not set</option>
              {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="ad-field ad-f-third">
            <span>Status</span>
            <select className="admin-height-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <label className="ad-field ad-f-third">
            <span>When does it end?</span>
            <input className="admin-plain-input" type="date" value={f.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </label>
          <label className="ad-field ad-f-third">
            <span>How many? (hangers, signs…)</span>
            <input className="admin-plain-input" inputMode="numeric" value={f.quantity} placeholder="e.g. 500" autoComplete="off" onChange={(e) => set('quantity', e.target.value)} />
          </label>
          <label className="ad-field ad-f-twothirds">
            <span>Where? (neighborhood or area)</span>
            <input className="admin-plain-input" value={f.area} maxLength={MAX_LEN.area} placeholder="e.g. Maple Ridge, or 15 miles around town" autoComplete="off" onChange={(e) => set('area', e.target.value)} />
          </label>
          <label className="ad-field ad-f-full">
            <span>Offer or code (what you ask people to mention)</span>
            <input className="admin-plain-input" value={f.offer} maxLength={MAX_LEN.offer} placeholder='e.g. "SPRING10" or "mention the door hanger"' autoComplete="off" onChange={(e) => set('offer', e.target.value)} />
          </label>
          <label className="ad-field ad-f-full">
            <span>Notes</span>
            <textarea className="admin-plain-input ad-notes" rows={2} value={f.notes} maxLength={MAX_LEN.notes} placeholder="What you'd do differently next time…" onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>
      </details>

      {problem && <p className="admin-error" role="alert">{problem}</p>}

      <div className="ad-form-actions">
        <button type="submit" className="admin-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        <button type="button" className="admin-mini" onClick={onCancel} disabled={busy}>Cancel</button>
        {onDelete && (
          <button type="button" className="admin-mini admin-mini-danger ad-form-delete" onClick={onDelete} disabled={busy}>Delete campaign</button>
        )}
      </div>
    </form>
  );
}

export default function AdCampaignsView() {
  const { campaigns, leads, setCampaigns, setLeads, error, setError, load, ready } = useAdData();
  const [yearPick, setYearPick] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);

  // Only years that actually have campaigns; the newest one shows first.
  const years = useMemo(
    () => [...new Set((campaigns || []).map(campaignYear))].sort((a, b) => b - a),
    [campaigns],
  );
  const year = yearPick !== null && (yearPick === 'all' || years.includes(yearPick)) ? yearPick : (years[0] ?? null);

  const rows = useMemo(() => {
    if (!ready) return [];
    return campaigns
      .filter((c) => year === 'all' || campaignYear(c) === year)
      .map((c) => ({ c, stats: campaignStats(c, leads) }))
      .sort((a, b) => {
        const da = a.c.start_date || '';
        const db = b.c.start_date || '';
        if (da !== db) return da < db ? 1 : -1; // newest start first, undated last
        return (b.c.created_at || '').localeCompare(a.c.created_at || '');
      });
  }, [ready, campaigns, leads, year]);

  const totals = useMemo(() => {
    if (!ready) return null;
    const ids = new Set(rows.map((r) => r.c.id));
    return rollup(rows.map((r) => r.c), leads.filter((l) => ids.has(l.campaign_id)));
  }, [ready, rows, leads]);

  async function create(fields) {
    setCreating(true);
    setError('');
    try {
      const d = await adRequest('/api/admin/ad-campaigns', 'POST', fields);
      setCampaigns((prev) => [d.item, ...(prev || [])]);
      setShowNew(false);
      setYearPick(campaignYear(d.item)); // show the year it landed in
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function save(id, fields) {
    setBusyId(id);
    setError('');
    try {
      const d = await adRequest('/api/admin/ad-campaigns', 'PATCH', { id, ...fields });
      setCampaigns((prev) => prev.map((c) => (c.id === id ? d.item : c)));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c) {
    const n = (leads || []).filter((l) => l.campaign_id === c.id).length;
    const keep = n ? ` Its ${plural(n, 'lead')} will stay in your Leads list but won't be tied to an ad anymore.` : '';
    if (!confirm(`Permanently delete “${c.name}”?${keep} This can't be undone.`)) return;
    setBusyId(c.id);
    setError('');
    try {
      await adRequest('/api/admin/ad-campaigns', 'DELETE', { id: c.id });
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      setLeads((prev) => prev.map((l) => (l.campaign_id === c.id ? { ...l, campaign_id: null } : l)));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const newForm = (
    <div className="ad-card">
      <CampaignForm initial={BLANK} submitLabel="Add campaign" busy={creating} showIdeas onSubmit={create} onCancel={() => setShowNew(false)} />
    </div>
  );

  return (
    <div className="admin-page ad-page">
      <h1>Ad Campaigns</h1>
      <p className="admin-lead">Each ad you run, and what it costs: door hangers, yard signs, Facebook, Google, referrals.</p>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {!ready ? (
        error ? <button type="button" className="admin-mini" onClick={load}>Try again</button> : <Skeleton h={260} />
      ) : campaigns.length === 0 ? (
        // First time here: explain the three steps instead of showing a screen of zeros.
        showNew ? newForm : (
          <div className="ad-welcome">
            <h2>Keep all your advertising in one place</h2>
            <p>Here's how it works. It takes a minute to set up, and it gets more useful every time you use it.</p>
            <ol className="ad-steps">
              <li><span className="ad-step-n">1</span><div><b>Add each ad you run</b><span>A batch of door hangers, a set of yard signs, a month of Facebook ads. Note what it cost.</span></div></li>
              <li><span className="ad-step-n">2</span><div><b>Log who contacts you</b><span>When someone calls or signs up, note which ad brought them in (the Ad Leads page).</span></div></li>
              <li><span className="ad-step-n">3</span><div><b>See what's working</b><span>The Ad Results page shows which ads paid off, and compares this year with last year.</span></div></li>
            </ol>
            <button type="button" className="admin-primary ad-new-btn" onClick={() => setShowNew(true)}>+ Add your first campaign</button>
          </div>
        )
      ) : (
        <>
          <div className="ad-bar">
            <button type="button" className="admin-primary ad-new-btn" aria-expanded={showNew} onClick={() => setShowNew((v) => !v)}>
              {showNew ? 'Close' : '+ New campaign'}
            </button>
            {years.length > 1 && (
              <div className="seg" role="group" aria-label="Show a year">
                {years.map((y) => (
                  <button key={y} type="button" className={year === y ? 'is-active' : undefined} aria-pressed={year === y} onClick={() => setYearPick(y)}>{y}</button>
                ))}
                <button type="button" className={year === 'all' ? 'is-active' : undefined} aria-pressed={year === 'all'} onClick={() => setYearPick('all')}>All</button>
              </div>
            )}
          </div>

          {showNew && newForm}

          <Summary
            items={[
              { label: 'Spent', value: moneyZero(totals.spend) },
              { label: 'Leads', value: totals.leads },
              { label: 'Jobs won', value: totals.won },
              { label: 'Earned', value: moneyZero(totals.revenue), tone: 'good' },
            ]}
          />

          <Panel title={year === 'all' ? 'All campaigns' : `${year} campaigns`} meta={plural(rows.length, 'campaign')}>
            <div className="admin-table-wrap">
              <table className="admin-table ad-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Spent</th>
                    <th>Leads</th>
                    <th>Earned</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ c, stats }) => {
                    const busy = busyId === c.id;
                    const open = editingId === c.id;
                    const when = formatRange(c.start_date, c.end_date);
                    return (
                      <Fragment key={c.id}>
                        <tr className={open ? 'is-open' : undefined}>
                          <td data-label="Campaign" className="ad-c-name">
                            <strong>{c.name}</strong>
                            <span className="ad-c-sub">{c.channel}{c.service ? ` · ${c.service}` : ''}</span>
                            {(when || c.quantity) && (
                              <span className="ad-c-sub">{[when, c.quantity ? `${c.quantity.toLocaleString()} pieces` : ''].filter(Boolean).join(' · ')}</span>
                            )}
                          </td>
                          <td data-label="Status">
                            <select
                              className="admin-height-select ad-status"
                              data-s={c.status}
                              aria-label={`Status of ${c.name}`}
                              value={c.status}
                              disabled={busy}
                              onChange={(e) => save(c.id, { status: e.target.value })}
                            >
                              {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</option>)}
                            </select>
                          </td>
                          <td data-label="Spent">{moneyZero(c.cost)}</td>
                          <td data-label="Leads">
                            {stats.leads > 0 ? <a className="admin-table-link" href={`/admin/ad-leads?campaign=${c.id}`}>{stats.leads}</a> : <span className="ad-faint">0</span>}
                          </td>
                          <td data-label="Earned">{moneyZero(stats.revenue)}</td>
                          <td>
                            <div className="admin-row-actions">
                              <button type="button" className="admin-mini" aria-expanded={open} disabled={busy} onClick={() => setEditingId(open ? null : c.id)}>
                                {open ? 'Close' : 'Edit'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="ad-edit-row">
                            <td colSpan={6}>
                              <CampaignForm
                                initial={toForm(c)}
                                submitLabel="Save changes"
                                busy={busy}
                                startOpen
                                onCancel={() => setEditingId(null)}
                                onDelete={() => remove(c)}
                                onSubmit={async (fields) => { if (await save(c.id, fields)) setEditingId(null); }}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
