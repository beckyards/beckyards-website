'use client';

// Small presentational building blocks shared by the dashboard, analytics and
// messages screens. Pure markup + inline SVG — no chart library (keeps the
// bundle tiny and avoids the site's CSP allowlist entirely).

export function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return Math.round(n / 1000) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function DeltaChip({ value, unit = '%' }) {
  if (value == null || !Number.isFinite(value)) return <span className="chip flat">—</span>;
  if (value === 0) return <span className="chip flat">±0{unit}</span>;
  const up = value > 0;
  return (
    <span className={`chip ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(value)}{unit}
    </span>
  );
}

export function Sparkline({ data = [], w = 120, h = 34 }) {
  const vals = data.map((d) => (typeof d === 'number' ? d : d.views || 0));
  if (vals.length < 2) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} />;
  const max = Math.max(...vals, 1);
  const step = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const fill = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path className="f" d={fill} />
      <path className="s" d={line} />
    </svg>
  );
}

export function StatTile({ label, value, sub, delta, spark }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-num">{value}</span>
      <div className="stat-foot">
        {delta !== undefined && <DeltaChip value={delta} />}
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
      {spark && <Sparkline data={spark} />}
    </div>
  );
}

export function Panel({ title, meta, actions, children }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h2 className="panel-title">{title}</h2>}
            {meta && <span className="panel-meta">{meta}</span>}
          </div>
          {actions}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

// rows: [{ label, views, visitors }]. `href` builds an optional link per row.
export function BarList({ rows = [], metric = 'views', href, empty = 'No data yet.' }) {
  if (!rows.length) return <p className="barlist-empty">{empty}</p>;
  const max = Math.max(...rows.map((r) => r[metric] || 0), 1);
  return (
    <div className="barlist">
      {rows.map((r) => {
        const link = href && r.label && r.label !== '(none)' ? href(r.label) : null;
        return (
          <div className="barlist-row" key={r.label}>
            <span className="barlist-label">
              {link ? (
                <a href={link} target="_blank" rel="noreferrer">{r.label}</a>
              ) : (
                r.label
              )}
            </span>
            <span className="barlist-val">
              {fmt(r[metric] || 0)}
              {r.visitors != null && metric === 'views' && (
                <span style={{ color: 'var(--a-faint)' }}> · {fmt(r.visitors)} vis</span>
              )}
            </span>
            <span className="barlist-track">
              <span className="barlist-fill" style={{ width: `${((r[metric] || 0) / max) * 100}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RangePicker({ value, onChange, options = ['7d', '30d', '90d'] }) {
  return (
    <div className="seg" role="tablist" aria-label="Date range">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={o === value ? 'is-active' : undefined}
          onClick={() => onChange(o)}
        >
          {o.replace('d', ' days').replace('1 days', '24h')}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ h = 96, style }) {
  return <div className="admin-skel" style={{ height: h, width: '100%', ...style }} />;
}
