'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Panel, Skeleton } from './ui';
import EditableCell from './EditableCell';
import { Summary, adRequest, campaignOptions, moneyZero, plural, useAdData } from './adShared';
import { formatMoney } from '../../../../lib/jobs';
import {
  LEAD_SERVICES,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  MAX_LEN,
  formatDay,
  parseMoney,
  rollup,
  todayISO,
} from '../../../../lib/advertising';

const STATUS_FILTERS = [{ key: 'all', label: 'All' }, ...LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_LABELS[s] }))];

function newestFirst(a, b) {
  if (a.lead_date !== b.lead_date) return a.lead_date < b.lead_date ? 1 : -1;
  return (b.created_at || '').localeCompare(a.created_at || '');
}

function matches(l, q, campaignName) {
  if (!q) return true;
  return [l.name, l.contact, l.notes, l.service, campaignName].some((v) => v && v.toLowerCase().includes(q));
}

// One form for logging a new lead and for editing the less-used details of an existing one.
function LeadForm({ initial, options, submitLabel, busy, onSubmit, onCancel, onDelete, isNew }) {
  const [f, setF] = useState(initial);
  const [problem, setProblem] = useState('');
  const [more, setMore] = useState(!isNew);

  function set(field, value) {
    setF((prev) => ({ ...prev, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (busy) return;
    const name = f.name.trim();
    if (!name) return setProblem("Add the person's name.");
    let value = null;
    if (isNew && f.value.trim() !== '') {
      value = parseMoney(f.value);
      if (value === null) { setMore(true); return setProblem('Job value should be a dollar amount, like 250.'); }
    }
    setProblem('');
    const fields = {
      name,
      contact: f.contact.trim() || null,
      service: f.service || null,
      lead_date: f.lead_date || todayISO(),
      notes: f.notes.trim() || null,
    };
    if (isNew) { fields.campaign_id = f.campaign_id || null; fields.value = value; }
    onSubmit(fields);
  }

  return (
    <form className="ad-form" onSubmit={submit} aria-label={submitLabel}>
      <div className="ad-form-grid">
        <label className="ad-field ad-f-half">
          <span>Name</span>
          <input className="admin-plain-input" value={f.name} maxLength={MAX_LEN.name} placeholder="e.g. Pat Morgan" autoComplete="off" onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="ad-field ad-f-half">
          <span>Phone or email</span>
          <input className="admin-plain-input" value={f.contact} maxLength={MAX_LEN.contact} autoComplete="off" onChange={(e) => set('contact', e.target.value)} />
        </label>
        {isNew && (
          <label className="ad-field ad-f-full">
            <span>Which ad brought them?</span>
            <select className="admin-height-select" value={f.campaign_id} onChange={(e) => set('campaign_id', e.target.value)}>
              <option value="">Not sure / word of mouth</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <details className="ad-more" open={more} onToggle={(e) => setMore(e.currentTarget.open)}>
        <summary>{isNew ? 'More details (optional)' : 'Details'}</summary>
        <div className="ad-form-grid">
          <label className="ad-field ad-f-third">
            <span>What do they want?</span>
            <select className="admin-height-select" value={f.service} onChange={(e) => set('service', e.target.value)}>
              <option value="">Not set</option>
              {LEAD_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          {isNew && (
            <label className="ad-field ad-f-third">
              <span>Job value (if known)</span>
              <span className="admin-price-field ad-money-in">$<input inputMode="decimal" value={f.value} placeholder="0" autoComplete="off" onChange={(e) => set('value', e.target.value)} /></span>
            </label>
          )}
          <label className="ad-field ad-f-third">
            <span>Date</span>
            <input className="admin-plain-input" type="date" value={f.lead_date} onChange={(e) => set('lead_date', e.target.value)} />
          </label>
          <label className="ad-field ad-f-full">
            <span>Notes</span>
            <input className="admin-plain-input" value={f.notes} maxLength={MAX_LEN.notes} placeholder="What they asked for, best time to call…" autoComplete="off" onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>
      </details>

      {problem && <p className="admin-error" role="alert">{problem}</p>}

      <div className="ad-form-actions">
        <button type="submit" className="admin-primary" disabled={busy || !f.name.trim()}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="admin-mini" onClick={onCancel} disabled={busy}>Cancel</button>}
        {onDelete && <button type="button" className="admin-mini admin-mini-danger ad-form-delete" onClick={onDelete} disabled={busy}>Delete lead</button>}
      </div>
    </form>
  );
}

export default function AdLeadsView() {
  const { campaigns, leads, setLeads, error, setError, load, ready } = useAdData();
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all'); // 'all' or one campaign's id (from the Campaigns page)
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(null); // null = "open if there are no leads yet"
  const [today, setToday] = useState('');
  const [campaignDraft, setCampaignDraft] = useState(''); // remembered between adds
  const [formKey, setFormKey] = useState(0);

  // Arriving from a campaign's "Leads" number: start filtered to that campaign.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('campaign');
    if (id) setCampaignFilter(id);
    setToday(todayISO());
  }, []);

  const campaignById = useMemo(() => new Map((campaigns || []).map((c) => [c.id, c])), [campaigns]);
  const options = useMemo(() => campaignOptions(campaigns || []), [campaigns]);

  async function addLead(fields) {
    setAdding(true);
    setError('');
    try {
      const d = await adRequest('/api/admin/ad-leads', 'POST', { ...fields, status: 'new' });
      setLeads((prev) => [d.item, ...(prev || [])].sort(newestFirst));
      setCampaignDraft(fields.campaign_id || '');
      setStatusFilter('all');
      setQuery('');
      setCampaignFilter('all');
      setFormKey((k) => k + 1); // a fresh, empty form for the next one
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function save(lead, fields) {
    setBusyId(lead.id);
    setError('');
    try {
      const d = await adRequest('/api/admin/ad-leads', 'PATCH', { id: lead.id, ...fields });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? d.item : l)).sort(newestFirst));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function remove(lead) {
    if (!confirm(`Permanently delete the lead “${lead.name}”? This can't be undone.`)) return;
    setBusyId(lead.id);
    setError('');
    try {
      await adRequest('/api/admin/ad-leads', 'DELETE', { id: lead.id });
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const q = query.trim().toLowerCase();

  // Everything except the status tab, so each tab can show how many it would give.
  const base = useMemo(() => {
    if (!ready) return [];
    return leads.filter((l) => (campaignFilter === 'all' || l.campaign_id === campaignFilter) && matches(l, q, campaignById.get(l.campaign_id)?.name || ''));
  }, [ready, leads, campaignFilter, campaignById, q]);

  const counts = useMemo(() => {
    const c = { all: base.length };
    for (const s of LEAD_STATUSES) c[s] = base.filter((l) => l.status === s).length;
    return c;
  }, [base]);

  const shown = statusFilter === 'all' ? base : base.filter((l) => l.status === statusFilter);
  const totals = useMemo(() => rollup([], base), [base]);
  const filteredCampaign = campaignFilter !== 'all' ? campaignById.get(campaignFilter) : null;
  const formOpen = showAdd === null ? (ready && leads.length === 0) : showAdd;

  return (
    <div className="admin-page ad-page">
      <h1>Ad Leads</h1>
      <p className="admin-lead">
        Everyone who gets in touch because of your advertising. Add them when they call, then update
        them as they go: New, Quoted, then Won or Lost.
      </p>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {!ready ? (
        error ? <button type="button" className="admin-mini" onClick={load}>Try again</button> : <Skeleton h={260} />
      ) : (
        <>
          <div className="ad-bar">
            <button type="button" className="admin-primary ad-new-btn" aria-expanded={formOpen} onClick={() => setShowAdd(!formOpen)}>
              {formOpen ? 'Close' : '+ Add a lead'}
            </button>
          </div>

          {formOpen && (
            <div className="ad-card">
              {campaigns.length === 0 && (
                <p className="ad-hint ad-hint-top">
                  Tip: <a className="admin-table-link" href="/admin/ad-campaigns">add your ads</a> first, so you can say which one brought each person in.
                </p>
              )}
              <LeadForm
                key={formKey}
                isNew
                initial={{ name: '', contact: '', campaign_id: campaignDraft, service: '', value: '', lead_date: today, notes: '' }}
                options={options}
                submitLabel="Add lead"
                busy={adding}
                onSubmit={addLead}
              />
            </div>
          )}

          {leads.length === 0 ? (
            <p className="ad-empty ad-empty-big">No leads yet. When someone calls, texts or signs up because of an ad, add them above.</p>
          ) : (
            <>
              <Summary
                items={[
                  { label: 'Leads', value: totals.leads },
                  { label: 'Jobs won', value: totals.won },
                  { label: 'Earned', value: moneyZero(totals.revenue), tone: 'good' },
                  { label: 'Still possible', value: moneyZero(totals.pipeline), sub: plural(totals.open, 'open lead') },
                ]}
              />

              {filteredCampaign && (
                <p className="ad-filter-chip">
                  Showing leads from <strong>{filteredCampaign.name}</strong>
                  <button type="button" className="admin-mini" onClick={() => setCampaignFilter('all')}>Show all leads</button>
                </p>
              )}

              <div className="ad-toolbar">
                <div className="seg" role="group" aria-label="Filter by status">
                  {STATUS_FILTERS.map((f) => (
                    <button key={f.key} type="button" className={statusFilter === f.key ? 'is-active' : undefined} aria-pressed={statusFilter === f.key} onClick={() => setStatusFilter(f.key)}>
                      {f.label} <span className="ad-count">{counts[f.key]}</span>
                    </button>
                  ))}
                </div>
                {leads.length > 8 && (
                  <input className="admin-search ad-search" type="search" placeholder="Search name, phone, notes" aria-label="Search leads" value={query} onChange={(e) => setQuery(e.target.value)} />
                )}
              </div>

              <Panel title="Leads" meta={shown.length === leads.length ? plural(leads.length, 'lead') : `${shown.length} of ${plural(leads.length, 'lead')}`}>
                {shown.length === 0 ? (
                  <p className="ad-empty">No leads match. Try another tab{q ? ' or clear the search' : ''}.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table ad-table ad-leads-table">
                      <thead>
                        <tr>
                          <th>Who</th>
                          <th>Status</th>
                          <th>Which ad</th>
                          <th>Job value</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((l) => {
                          const busy = busyId === l.id;
                          const open = editingId === l.id;
                          const known = campaignById.has(l.campaign_id);
                          return (
                            <Fragment key={l.id}>
                              <tr className={open ? 'is-open' : undefined}>
                                <td data-label="Who" className="ad-c-name">
                                  <strong>{l.name}</strong>
                                  {l.contact && <span className="ad-c-sub">{l.contact}</span>}
                                  <span className="ad-c-sub">{[l.service, formatDay(l.lead_date, true)].filter(Boolean).join(' · ')}</span>
                                  {l.notes && <span className="ad-c-sub ad-c-note">{l.notes}</span>}
                                </td>
                                <td data-label="Status">
                                  <select className="admin-height-select ad-status" data-s={l.status} aria-label={`Status of ${l.name}`} value={l.status} disabled={busy} onChange={(e) => save(l, { status: e.target.value })}>
                                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                                  </select>
                                </td>
                                <td data-label="Which ad">
                                  <select className="admin-height-select ad-pick" aria-label={`Ad for ${l.name}`} value={known ? l.campaign_id : ''} disabled={busy} onChange={(e) => save(l, { campaign_id: e.target.value || null })}>
                                    <option value="">Not sure / word of mouth</option>
                                    {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                                  </select>
                                </td>
                                <td data-label="Job value">
                                  <EditableCell
                                    value={l.value === null || l.value === undefined ? '' : formatMoney(l.value)}
                                    placeholder="+ Add value"
                                    disabled={busy}
                                    onSave={(v) => {
                                      if (v === '') return save(l, { value: null });
                                      const n = parseMoney(v);
                                      if (n === null) return setError('Job value should be a dollar amount, like 250.');
                                      return save(l, { value: n });
                                    }}
                                  />
                                </td>
                                <td>
                                  <div className="admin-row-actions">
                                    <button type="button" className="admin-mini" aria-expanded={open} disabled={busy} onClick={() => setEditingId(open ? null : l.id)}>
                                      {open ? 'Close' : 'Edit'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {open && (
                                <tr className="ad-edit-row">
                                  <td colSpan={5}>
                                    <LeadForm
                                      initial={{ name: l.name, contact: l.contact || '', campaign_id: '', service: l.service || '', value: '', lead_date: l.lead_date, notes: l.notes || '' }}
                                      options={options}
                                      submitLabel="Save changes"
                                      busy={busy}
                                      onCancel={() => setEditingId(null)}
                                      onDelete={() => remove(l)}
                                      onSubmit={async (fields) => { if (await save(l, fields)) setEditingId(null); }}
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
                )}
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}
