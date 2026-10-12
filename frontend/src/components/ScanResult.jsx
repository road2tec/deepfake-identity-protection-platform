import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bytes, dateTime, pct, RISK_TEXT } from '../format';
import Icon from './Icon';
import { CountUp, Notice } from './ui';

const STATUS_ICON = { pass: 'check', fail: 'x', info: 'info' };

/** Half-circle gauge for the probability that the image is synthetic. */
export function Gauge({ value, fake }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const length = Math.PI * 50;
  return (
    <div className="gauge" role="img" aria-label={`${pct(value)} probability of synthesis`}>
      <svg viewBox="0 0 120 68">
        <path className="track" d="M10 62 A50 50 0 0 1 110 62" />
        <path
          className="arc"
          d="M10 62 A50 50 0 0 1 110 62"
          stroke={fake ? 'var(--bad)' : 'var(--ok)'}
          strokeDasharray={length}
          strokeDashoffset={length * (1 - shown)}
        />
      </svg>
      <div className="val"><CountUp value={value * 100} format={(v) => `${v.toFixed(1)}%`} /></div>
      <div className="cap">synthetic</div>
    </div>
  );
}

export default function ScanResult({ scan }) {
  const fake = scan.label === 'FAKE';
  const id = scan.identity_match;

  return (
    <div className="panel" style={{ overflow: 'hidden', animation: 'pop .4s var(--ease) both' }}>
      <div className={`verdict ${fake ? 'fake' : 'real'}`}>
        <Gauge value={scan.fake_probability} fake={fake} />
        <div>
          <span className="eyebrow" style={{ color: 'var(--muted)', marginBottom: '.3rem' }}>Verdict</span>
          <div className="label">{fake ? 'Likely manipulated' : 'Likely authentic'}</div>
          <p>
            {RISK_TEXT[scan.risk_level]} &middot; {pct(scan.confidence)} confidence &middot; {scan.risk_level} risk
          </p>
        </div>
      </div>

      <div className="panel-pad stack">
        {id && id.matched && (
          <Notice tone={fake ? 'error' : 'info'}>
            {fake ? (
              <>
                <strong>Your protected face appears in this manipulated image.</strong> An alert was added to{' '}
                <Link to="/app/alerts">your alerts</Link>.
              </>
            ) : (
              <>Your protected face appears in this image. No manipulation was detected.</>
            )}
          </Notice>
        )}

        <div>
          <h3 className="section-title">Checks performed</h3>
          <div className="checks">
            {scan.signals.map((s, i) => (
              <div className="check" key={i} style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
                <span className={`check-ico ${s.status}`}><Icon name={STATUS_ICON[s.status]} /></span>
                <div>
                  <b>{s.check}</b>
                  <span>{s.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="section-title">File details</h3>
          <table className="kv">
            <tbody>
              <tr><th>File name</th><td>{scan.filename}</td></tr>
              <tr><th>Size</th><td>{bytes(scan.size_bytes)}</td></tr>
              <tr><th>Dimensions</th><td>{scan.width} &times; {scan.height} px</td></tr>
              <tr><th>Faces detected</th><td>{scan.faces_detected}</td></tr>
              <tr><th>SHA-256</th><td className="mono">{scan.sha256}</td></tr>
              <tr><th>Scanned</th><td>{dateTime(scan.created_at)}</td></tr>
              <tr><th>Processing time</th><td>{scan.processing_ms} ms</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
