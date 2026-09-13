'use client';

import { useState } from 'react';
import { fmt } from './ui';

// Area (views) + dashed line (unique visitors) over time. One inline SVG, no
// dependencies. Hover anywhere for a per-day readout.
export default function TrafficChart({ series = [], height = 240 }) {
  const [hover, setHover] = useState(null);

  if (!series.length) {
    return <p className="barlist-empty">No traffic recorded yet — data appears here as visitors arrive.</p>;
  }

  const W = 760;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 22;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const maxV = Math.max(...series.map((d) => d.views), 1);
  const n = series.length;
  const x = (i) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => padT + ih - (v / maxV) * ih;

  const viewsPath = series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.views).toFixed(1)}`).join(' ');
  const areaPath = `${viewsPath} L${x(n - 1).toFixed(1)} ${(padT + ih).toFixed(1)} L${x(0).toFixed(1)} ${(padT + ih).toFixed(1)} Z`;
  const visPath = series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.visitors).toFixed(1)}`).join(' ');

  // ~4 gridlines
  const gridY = [0.25, 0.5, 0.75, 1].map((f) => ({ v: Math.round(maxV * f), yy: y(maxV * f) }));

  // x labels: first, ~middle, last
  const labelIdx = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
  const fmtDay = (s) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round(((px - padL) / iw) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover(idx);
  }

  const hv = hover != null ? series[hover] : null;

  return (
    <div>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Traffic over time"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {gridY.map((g, i) => (
          <g key={i}>
            <line className="grid" x1={padL} x2={W - padR} y1={g.yy} y2={g.yy} />
            <text className="axis" x={padL} y={g.yy - 3}>{fmt(g.v)}</text>
          </g>
        ))}

        <path className="area" d={areaPath} />
        <path className="line-v" d={viewsPath} />
        <path className="line-u" d={visPath} />

        {labelIdx.map((i) => (
          <text
            key={i}
            className="axis"
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          >
            {fmtDay(series[i].day)}
          </text>
        ))}

        {hv && (
          <g>
            <line className="grid" x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--a-faint)" />
            <circle className="dot" cx={x(hover)} cy={y(hv.views)} r="3.5" />
            <circle cx={x(hover)} cy={y(hv.visitors)} r="3" fill="var(--a-ink)" opacity="0.6" />
          </g>
        )}
      </svg>

      <div className="chart-legend">
        <span><i className="k-v" />Page views</span>
        <span><i className="k-u" />Unique visitors</span>
        {hv && (
          <span style={{ marginLeft: 'auto', color: 'var(--a-text)', fontWeight: 500 }}>
            {fmtDay(hv.day)}: {fmt(hv.views)} views · {fmt(hv.visitors)} visitors
          </span>
        )}
      </div>
    </div>
  );
}
