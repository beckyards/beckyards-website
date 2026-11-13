'use client';

import { useMemo, useState } from 'react';
import { Panel, Skeleton } from './ui';
import { Summary, moneyZero, plural, useAdData } from './adShared';
import { formatReturn, rollup, yearReport, yearsPresent } from '../../../../lib/advertising';

const EMPTY = rollup([], []);

// "▲ 20% vs 2026" / "▼ 5% vs 2026" / "same as 2026"; nothing when there's no earlier year to compare to.
function vs(cur, prev, prevYear) {
  if (prevYear === null || prev === null || prev === undefined || cur === null || cur === undefined) return undefined;
  if (prev === 0) return cur === 0 ? `same as ${prevYear}` : `new since ${prevYear}`;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return `same as ${prevYear}`;
  return `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs ${prevYear}`;
}

function verdict(row, bestName) {
  if (row.campaigns === 0) return { text: 'Not used', tone: 'flat' };
  if (row.spend === 0) return row.leads > 0 ? { text: 'Free leads', tone: 'ok' } : { text: 'No leads yet', tone: 'flat' };
  if (row.leads === 0) return { text: 'No leads yet', tone: 'bad' };
  if (row.won === 0) return { text: 'Leads, no jobs yet', tone: 'warn' };
  if (row.name === bestName) return { text: 'Best return', tone: 'ok' };
  if (row.returnPerDollar >= 1) return { text: 'Paying off', tone: 'ok' };
  return { text: 'Not paid back yet', tone: 'warn' };
}

export default function AdResultsView() {
  const { campaigns, leads, error, load, ready } = useAdData();
  const [yearPick, setYearPick] = useState(null);

  const years = useMemo(() => (ready ? yearsPresent(campaigns, leads) : []), [ready, campaigns, leads]);
  const year = yearPick !== null && years.includes(yearPick) ? yearPick : (years[0] ?? new Date().getFullYear());
  // Always compared with the closest earlier year that has data.
  const compareYear = useMemo(() => years.find((y) => y < year) ?? null, [years, year]);

  const report = useMemo(() => (ready ? yearReport(year, campaigns, leads) : null), [ready, year, campaigns, leads]);
  const prev = useMemo(() => (ready && compareYear !== null ? yearReport(compareYear, campaigns, leads) : null), [ready, compareYear, campaigns, leads]);
  const allYears = useMemo(() => (ready ? years.map((y) => yearReport(y, campaigns, leads)) : []), [ready, years, campaigns, leads]);

  // Channels from this year, then any that only ran last year (so you can see what you dropped).
  const channelRows = useMemo(() => {
    if (!report) return [];
    const rows = [...report.channels];
    const prevOnly = (prev?.channels || [])
      .filter((p) => !rows.some((r) => r.name === p.name))
      .map((p) => ({ name: p.name, ...EMPTY }));
    return [...rows, ...prevOnly].sort((a, b) => (b.revenue - a.revenue) || (b.leads - a.leads) || (b.spend - a.spend));
  }, [report, prev]);

  const ranked = useMemo(
    () => channelRows.filter((r) => r.spend > 0 && r.won > 0 && r.returnPerDollar !== null).sort((a, b) => b.returnPerDollar - a.returnPerDollar),
    [channelRows],
  );
  const bestName = ranked.length >= 2 ? ranked[0].name : null; // "best" only means something when there's something to beat
  const noLeads = useMemo(() => channelRows.filter((r) => r.campaigns > 0 && r.spend > 0 && r.leads === 0), [channelRows]);

  const hasData = ready && (campaigns.length > 0 || leads.length > 0);
  const t = report?.total || EMPTY;
  const pk = compareYear;

  return (
    <div className="admin-page ad-page ad-results">
      <h1>Ad Results</h1>
      <p className="admin-lead">What your advertising cost, who it brought in, and what it earned.</p>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {!ready ? (
        error ? <button type="button" className="admin-mini" onClick={load}>Try again</button> : <Skeleton h={300} />
      ) : !hasData ? (
        <div className="ad-welcome">
          <h2>Nothing to show yet</h2>
          <p>This page fills itself in from the other two. Once you've done these, you'll see what's working:</p>
          <ol className="ad-steps">
            <li><span className="ad-step-n">1</span><div><b><a className="admin-table-link" href="/admin/ad-campaigns">Add your ads</a></b><span>Each batch of hangers, set of signs or online ad, with what it cost.</span></div></li>
            <li><span className="ad-step-n">2</span><div><b><a className="admin-table-link" href="/admin/ad-leads">Log your leads</a></b><span>Each person who calls, and which ad brought them. Mark them Won when they hire you.</span></div></li>
          </ol>
        </div>
      ) : (
        <>
          {years.length > 1 && (
            <div className="ad-bar">
              <div className="seg" role="group" aria-label="Show a year">
                {years.map((y) => (
                  <button key={y} type="button" className={year === y ? 'is-active' : undefined} aria-pressed={year === y} onClick={() => setYearPick(y)}>{y}</button>
                ))}
              </div>
            </div>
          )}

          <div className="ad-headline">
            <h2>{year} so far</h2>
            <ul>
              {t.spend > 0 ? (
                <li>
                  You spent <b>{moneyZero(t.spend)}</b> on ads and earned <b>{moneyZero(t.revenue)}</b> from them.
                  {t.won > 0 ? <> Every $1 you spent brought back <b>{formatReturn(t.returnPerDollar)}</b>.</> : ' No jobs are marked Won yet.'}
                </li>
              ) : (
                <li>You haven't logged any ad spending for {year} yet.{t.revenue > 0 && <> You earned <b>{moneyZero(t.revenue)}</b> from leads.</>}</li>
              )}
              {ranked.length > 0 && (
                <li>
                  {ranked.length >= 2 ? 'Working best' : 'Working'}: <b>{ranked[0].name}</b>, {formatReturn(ranked[0].returnPerDollar)} back for every $1.
                </li>
              )}
              {noLeads.length > 0 && (
                <li>
                  No leads yet from {noLeads.map((r) => `${r.name} (${moneyZero(r.spend)})`).join(', ')}. Give {noLeads.length === 1 ? 'it' : 'them'} time, or try something different.
                </li>
              )}
            </ul>
          </div>

          <Summary
            items={[
              { label: 'Spent', value: moneyZero(t.spend), sub: vs(t.spend, prev?.total.spend, pk) },
              { label: 'Leads', value: t.leads, sub: vs(t.leads, prev?.total.leads, pk) },
              { label: 'Jobs won', value: t.won, sub: vs(t.won, prev?.total.won, pk) },
              { label: 'Earned', value: moneyZero(t.revenue), tone: 'good', sub: vs(t.revenue, prev?.total.revenue, pk) },
            ]}
          />
          <p className="ad-hint">"Earned" is the value of leads you've marked Won.</p>

          <Panel title={`Which ads are working in ${year}`} meta={plural(channelRows.length, 'channel')}>
            {channelRows.length === 0 ? (
              <p className="ad-empty">No campaigns started in {year}.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table ad-table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Spent</th>
                      <th>Leads</th>
                      <th>Jobs won</th>
                      <th>Earned</th>
                      <th>How it's doing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows.map((r) => {
                      const v = verdict(r, bestName);
                      const before = prev?.channels.find((c) => c.name === r.name);
                      return (
                        <tr key={r.name}>
                          <td data-label="Channel" className="ad-c-name">
                            <strong>{r.name}</strong>
                            {pk && <span className="ad-c-sub">{before ? `${pk}: ${moneyZero(before.revenue)} earned` : `Didn't run in ${pk}`}</span>}
                          </td>
                          <td data-label="Spent">{moneyZero(r.spend)}</td>
                          <td data-label="Leads">{r.leads}</td>
                          <td data-label="Jobs won">{r.won}</td>
                          <td data-label="Earned">{moneyZero(r.revenue)}</td>
                          <td data-label="How it's doing"><span className={`ad-chip is-${v.tone}`}>{v.text}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {report.unknown.leads > 0 && (
              <p className="ad-note">
                {plural(report.unknown.leads, 'lead')} ({moneyZero(report.unknown.revenue)} earned) {report.unknown.leads === 1 ? "isn't" : "aren't"} tied to an ad,
                so {report.unknown.leads === 1 ? "it's" : "they're"} counted in the totals above but not in a channel. Pick the ad on the Ad Leads page.
              </p>
            )}
          </Panel>

          {report.services.length > 0 && (
            <Panel title={`What people asked for in ${year}`}>
              <div className="admin-table-wrap">
                <table className="admin-table ad-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Leads</th>
                      <th>Jobs won</th>
                      <th>Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...report.services].sort((a, b) => b.leads - a.leads).map((s) => (
                      <tr key={s.name}>
                        <td data-label="Service" className="ad-c-name"><strong>{s.name}</strong></td>
                        <td data-label="Leads">{s.leads}</td>
                        <td data-label="Jobs won">{s.won}</td>
                        <td data-label="Earned">{moneyZero(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {allYears.length > 1 && (
            <Panel title="Year by year">
              <div className="admin-table-wrap">
                <table className="admin-table ad-table ad-yoy">
                  <thead>
                    <tr>
                      <th></th>
                      {allYears.map((r) => <th key={r.year}>{r.year}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Spent', (x) => moneyZero(x.spend)],
                      ['Leads', (x) => x.leads],
                      ['Jobs won', (x) => x.won],
                      ['Earned', (x) => moneyZero(x.revenue)],
                      ['Earned per $1 spent', (x) => formatReturn(x.returnPerDollar)],
                    ].map(([label, get]) => (
                      <tr key={label}>
                        <td className="ad-c-name"><strong>{label}</strong></td>
                        {allYears.map((r) => <td key={r.year} data-label={String(r.year)}>{get(r.total)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
