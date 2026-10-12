import { useState } from 'react';

const W = 640;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 30 };

function niceMax(v) {
  if (v <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
}

const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * Daily stacked bars: total scans split into authentic (bottom) and fake (top).
 * data: [{ date: 'YYYY-MM-DD', count, fake }]
 */
export default function BarChart({ data, label = 'Scans per day' }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.count), 0));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(26, slot * 0.62);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  return (
    <div className="chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <g className="grid">
          {ticks.map((t) => <line key={t} x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />)}
        </g>
        <g className="axis">
          {ticks.map((t) => <text key={t} x={PAD.left - 8} y={y(t) + 3} textAnchor="end">{t}</text>)}
          {data.map((d, i) => (i % 2 === data.length % 2 || data.length <= 8) && (
            <text key={d.date} x={PAD.left + slot * i + slot / 2} y={H - 6} textAnchor="middle">{shortDate(d.date)}</text>
          ))}
        </g>
        {data.map((d, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const real = d.count - d.fake;
          const realTop = y(real);
          const fakeTop = y(d.count);
          const gap = d.fake && real ? 2 : 0;
          return (
            <g
              key={d.date}
              className={`bar ${hover !== null && hover !== i ? 'dim' : ''}`}
              onMouseEnter={() => setHover(i)}
            >
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {real > 0 && (
                <rect x={x} y={realTop} width={barW} height={y(0) - realTop} rx="3" fill="var(--chart-real)" style={{ animationDelay: `${i * 35}ms` }} />
              )}
              {d.fake > 0 && (
                <rect x={x} y={fakeTop} width={barW} height={realTop - fakeTop - gap} rx="3" fill="var(--chart-fake)" style={{ animationDelay: `${i * 35}ms` }} />
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%`, top: `${(y(data[hover].count) / H) * 100}%` }}
        >
          {shortDate(data[hover].date)} &middot; <b>{data[hover].count}</b> scans, <b>{data[hover].fake}</b> fake
        </div>
      )}
    </div>
  );
}
