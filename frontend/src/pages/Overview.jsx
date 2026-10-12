import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import Icon from '../components/Icon';
import ScanTable from '../components/ScanTable';
import { CountUp, Notice, SkeletonRows } from '../components/ui';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function StatTile({ icon, label, value, foot, tone }) {
  return (
    <div className={`panel stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-top"><span>{label}</span><Icon name={icon} /></div>
      <div className="value">{value === undefined ? <span className="skeleton" style={{ display: 'block', height: 28, width: 60 }} /> : <CountUp value={value} />}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/scans/stats'), api('/api/scans?limit=6')])
      .then(([s, r]) => {
        setStats(s);
        setRecent(r.items);
      })
      .catch((e) => setError(e.message));
  }, []);

  const fakeShare = stats && stats.total ? Math.round((stats.fake / stats.total) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting()}, {user.name.split(' ')[0]}</h1>
          <p>Here is what has happened across your scans.</p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" to="/app/scan"><Icon name="scan" /> New scan</Link>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="stats stagger">
        <StatTile icon="scan" label="Images scanned" value={stats?.total} foot="All time" />
        <StatTile icon="alert" label="Flagged as fake" value={stats?.fake} tone="bad" foot={stats ? `${fakeShare}% of your scans` : ' '} />
        <StatTile icon="fingerprint" label="Contained your face" value={stats?.identity_matches} foot="Identity matches" />
        <StatTile icon="bell" label="Unread alerts" value={stats?.unread_alerts} foot={<Link to="/app/alerts">View alerts</Link>} />
      </div>

      <div className="grid-main">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent scans</h2>
              <p className="sub">Your latest six results</p>
            </div>
            <Link to="/app/history" className="btn btn-sm">View all</Link>
          </div>
          {recent ? <ScanTable items={recent} /> : <SkeletonRows />}
        </div>

        <div className="stack">
          <div className="panel panel-pad">
            <h3 className="section-title">Identity protection</h3>
            {user.identity_enrolled ? (
              <>
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginBottom: '.75rem' }}>
                  <span className="module-icon"><Icon name="shieldCheck" /></span>
                  <div>
                    <b>Your face is protected</b>
                    <div className="muted" style={{ fontSize: '.85rem' }}>Every scan is checked for it.</div>
                  </div>
                </div>
                <Link to="/app/identity" className="btn btn-sm">Manage</Link>
              </>
            ) : (
              <>
                <p style={{ fontSize: '.9rem' }}>
                  Enrol a reference photo so the platform can tell you when your face appears in a manipulated image.
                </p>
                <Link to="/app/identity" className="btn btn-primary btn-sm"><Icon name="fingerprint" /> Enrol my face</Link>
              </>
            )}
          </div>

          <div className="panel panel-pad">
            <h3 className="section-title">Tips for better results</h3>
            <ul className="howto">
              <li><b>1</b><span>Use the original file where possible. Screenshots strip useful metadata.</span></li>
              <li><b>2</b><span>The face should be clearly visible and not tiny in the frame.</span></li>
              <li><b>3</b><span>Treat the verdict as evidence. Check the signals list for why.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
