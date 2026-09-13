'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatTile, Panel, BarList, RangePicker, Skeleton, fmt } from './ui';
import TrafficChart from './TrafficChart';

const COUNTRY_NAMES =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(undefined, { type: 'region' })
    : null;

function countryLabel(code) {
  if (!code || code === '(none)') return 'Unknown';
  try {
    return `${COUNTRY_NAMES ? COUNTRY_NAMES.of(code) : code} (${code})`;
  } catch {
    return code;
  }
}

export default function AnalyticsView() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((r) => {
    setLoading(true);
    setError('');
    const tz = new Date().getTimezoneOffset();
    fetch(`/api/admin/analytics?range=${r}&tz=${tz}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  const t = data?.totals;
  const busiest = data?.series?.length
    ? [...data.series].sort((a, b) => b.views - a.views)[0]
    : null;

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Analytics</h1>
          <p className="admin-lead">
            First-party, cookie-free traffic for beckyards.com. Bots are filtered; visitors are counted with a
            daily one-way hash, so nobody is tracked across days.
          </p>
        </div>
        <div className="admin-head-actions">
          <RangePicker value={range} onChange={setRange} options={['7d', '30d', '90d']} />
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="stat-row">
        {loading || !data ? (
          <><Skeleton h={112} /><Skeleton h={112} /><Skeleton h={112} /><Skeleton h={112} /></>
        ) : (
          <>
            <StatTile label={`Page views · ${range}`} value={fmt(t.views)} delta={t.viewsDelta} spark={data.series} />
            <StatTile label={`Unique visitors · ${range}`} value={fmt(t.visitors)} delta={t.visitorsDelta} />
            <StatTile label="Pages / visit" value={t.viewsPerVisitor || '—'} sub={`${fmt(t.viewsPrev)} → ${fmt(t.views)} views`} />
            <StatTile
              label="Busiest day"
              value={busiest && busiest.views ? fmt(busiest.views) : '—'}
              sub={busiest && busiest.views ? new Date(busiest.day + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No data'}
            />
          </>
        )}
      </div>

      <Panel title="Traffic" meta={data ? `${range} · vs previous ${range}` : ''}>
        {loading || !data ? <Skeleton h={240} /> : <TrafficChart series={data.series} />}
      </Panel>

      <div className="panel-grid">
        <Panel title="Top pages">
          {loading || !data ? <Skeleton h={180} /> : (
            <BarList rows={data.topPages} href={(l) => l} empty="No page views in this range." />
          )}
        </Panel>
        <Panel title="Referrers" meta="External sources">
          {loading || !data ? <Skeleton h={180} /> : (
            <BarList rows={data.referrers} href={(l) => `https://${l}`} empty="No external referrers — traffic is direct." />
          )}
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="Devices">
          {loading || !data ? <Skeleton h={140} /> : <BarList rows={data.devices} empty="No data." />}
        </Panel>
        <Panel title="Browsers">
          {loading || !data ? <Skeleton h={140} /> : <BarList rows={data.browsers} empty="No data." />}
        </Panel>
      </div>

      <div className="panel-grid">
        <Panel title="Operating systems">
          {loading || !data ? <Skeleton h={140} /> : <BarList rows={data.operatingSystems} empty="No data." />}
        </Panel>
        <Panel title="Countries" meta="Approx., from edge geo">
          {loading || !data ? <Skeleton h={140} /> : (
            <BarList
              rows={(data.countries || []).map((c) => ({ ...c, label: countryLabel(c.label) }))}
              empty="No country data (local traffic has none)."
            />
          )}
        </Panel>
      </div>

      {data && (
        <p className="admin-lead" style={{ marginTop: 16, fontSize: 12 }}>
          Generated {new Date(data.generatedAt).toLocaleString()}. Counts exclude <code>/admin</code> and known bots.
        </p>
      )}
    </div>
  );
}
