import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { dateTime, pct } from '../format';

export function ScanTable({ items, onDelete }) {
  if (!items.length) return <div className="empty">No scans yet. <Link to="/app/scan">Run your first scan</Link>.</div>;
  return (
    <table className="list">
      <thead>
        <tr>
          <th style={{ width: 60 }}></th>
          <th>File</th>
          <th>Result</th>
          <th className="num">Synthetic prob.</th>
          <th>Identity</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((s) => (
          <tr key={s.id}>
            <td>{s.thumbnail && <img className="thumb" src={s.thumbnail} alt="" />}</td>
            <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Link to={`/app/history/${s.id}`}>{s.filename}</Link>
            </td>
            <td>
              <span className={`badge ${s.label === 'FAKE' ? 'badge-fake' : 'badge-real'}`}>
                {s.label === 'FAKE' ? 'Fake' : 'Authentic'}
              </span>
            </td>
            <td className="num">{pct(s.fake_probability)}</td>
            <td>
              {s.identity_match?.matched ? (
                <span className="badge badge-warn">Your face</span>
              ) : (
                <span className="muted">-</span>
              )}
            </td>
            <td className="muted">{dateTime(s.created_at)}</td>
            <td style={{ textAlign: 'right' }}>
              {onDelete && (
                <button className="btn btn-sm btn-danger" onClick={() => onDelete(s)}>Delete</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/scans/stats'), api('/api/scans?limit=5')])
      .then(([s, r]) => {
        setStats(s);
        setRecent(r.items);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Welcome back, {user.name.split(' ')[0]}.</p>
        </div>
        <Link className="btn btn-primary" to="/app/scan">New scan</Link>
      </div>

      {error && <div className="notice notice-error">{error}</div>}

      {!user.identity_enrolled && (
        <div className="notice notice-warn">
          Your identity is not protected yet. <Link to="/app/identity">Enrol a reference photo</Link> so scans can tell
          you when your face appears in manipulated images.
        </div>
      )}

      {stats && (
        <div className="stats">
          <div className="stat"><div className="num">{stats.total}</div><div className="lbl">Images scanned</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--bad)' }}>{stats.fake}</div><div className="lbl">Flagged as fake</div></div>
          <div className="stat"><div className="num">{stats.identity_matches}</div><div className="lbl">Scans containing your face</div></div>
          <div className="stat"><div className="num">{stats.unread_alerts}</div><div className="lbl">Unread alerts</div></div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Recent scans</h2>
          <Link to="/app/history" style={{ fontSize: '.9rem' }}>View all</Link>
        </div>
        <ScanTable items={recent} />
      </div>
    </>
  );
}
