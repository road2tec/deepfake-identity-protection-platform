import { Link } from 'react-router-dom';
import { bytes, dateTime, pct, RISK_TEXT } from '../format';

const STATUS = { pass: ['PASS', 's-pass'], fail: ['FLAG', 's-fail'], info: ['INFO', 's-info'] };

export default function ScanResult({ scan }) {
  const fake = scan.label === 'FAKE';
  const id = scan.identity_match;

  return (
    <div className="panel">
      <div className={`verdict ${fake ? 'fake' : 'real'}`}>
        <div>
          <div className="word">{fake ? 'LIKELY FAKE' : 'LIKELY AUTHENTIC'}</div>
          <div className="muted">{RISK_TEXT[scan.risk_level]}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>{pct(scan.confidence)}</div>
          <div className="muted" style={{ fontSize: '.8rem' }}>confidence</div>
        </div>
      </div>

      <div className="panel-pad stack">
        <div>
          <h3>Probability the image is synthetic</h3>
          <div className={`meter ${fake ? 'fake' : ''}`}>
            <div style={{ width: pct(scan.fake_probability) }} />
          </div>
          <div className="meter-scale">
            <span>0% authentic</span>
            <span>{pct(scan.fake_probability)}</span>
            <span>100% synthetic</span>
          </div>
        </div>

        {id && id.matched && (
          <div className={`notice ${fake ? 'notice-error' : 'notice-info'}`}>
            {fake ? (
              <>
                <strong>Your protected face appears in this manipulated image.</strong> An alert has been added to your{' '}
                <Link to="/app/alerts">alerts</Link>.
              </>
            ) : (
              <>Your protected face appears in this image. No manipulation was detected.</>
            )}
          </div>
        )}

        <div>
          <h3>Checks performed</h3>
          {scan.signals.map((s, i) => (
            <div className="signal" key={i}>
              <span className={STATUS[s.status][1]}>{STATUS[s.status][0]}</span>
              <span>
                <strong>{s.check}.</strong> {s.detail}
              </span>
            </div>
          ))}
        </div>

        <div>
          <h3>File details</h3>
          <table className="kv">
            <tbody>
              <tr><th>File name</th><td>{scan.filename}</td></tr>
              <tr><th>Size</th><td>{bytes(scan.size_bytes)}</td></tr>
              <tr><th>Dimensions</th><td>{scan.width} x {scan.height} px</td></tr>
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
