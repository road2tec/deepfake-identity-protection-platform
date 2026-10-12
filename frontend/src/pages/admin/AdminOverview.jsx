import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import BarChart from '../../components/BarChart';
import Icon from '../../components/Icon';
import ScanTable from '../../components/ScanTable';
import { CountUp, Notice, SkeletonRows, useUI } from '../../components/ui';
import { pct } from '../../format';
import { StatTile } from '../Overview';

const RISK = [['none', 'None'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];

function ModelCard({ metrics, loaded, onReload, reloading }) {
  if (!metrics) {
    return <p className="muted">{loaded ? 'Model loaded, no metrics file found.' : 'The image model is not loaded yet.'}</p>;
  }
  const [[tn, fp], [fn, tp]] = metrics.confusion_matrix;
  return (
    <>
      <div className="metric-big">
        <b><CountUp value={metrics.test_accuracy * 100} format={(v) => `${v.toFixed(1)}%`} /></b>
        <span className="muted">test accuracy</span>
      </div>
      <p className="muted" style={{ fontSize: '.84rem' }}>
        {metrics.model}. Trained on {metrics.train_images.toLocaleString()} images for {metrics.epochs} epoch
        {metrics.epochs === 1 ? '' : 's'}, evaluated on {metrics.test_images.toLocaleString()} unseen faces.
      </p>
      <div className="health-list">
        <div className="health-row"><span>ROC-AUC</span><span className="num-font">{metrics.test_roc_auc}</span></div>
        <div className="health-row"><span>Best validation accuracy</span><span className="num-font">{pct(metrics.best_val_accuracy)}</span></div>
        {metrics.pipeline_accuracy !== undefined && (
          <div className="health-row"><span>End-to-end pipeline accuracy</span><span className="num-font">{pct(metrics.pipeline_accuracy)}</span></div>
        )}
        <div className="health-row"><span>Training time</span><span className="num-font">{metrics.training_minutes} min</span></div>
      </div>
      <h3 className="section-title" style={{ marginTop: '1rem' }}>Confusion matrix (test set)</h3>
      <div className="cm" role="table" aria-label="Confusion matrix">
        <div className="h" />
        <div className="h">Predicted real</div>
        <div className="h">Predicted fake</div>
        <div className="h" style={{ textAlign: 'left' }}>Real</div>
        <div className="hit">{tn}</div>
        <div className="miss">{fp}</div>
        <div className="h" style={{ textAlign: 'left' }}>Fake</div>
        <div className="miss">{fn}</div>
        <div className="hit">{tp}</div>
      </div>
      <button className="btn btn-sm" style={{ marginTop: '1rem' }} onClick={onReload} disabled={reloading}>
        {reloading ? <span className="spinner" /> : <Icon name="refresh" />} Reload model from disk
      </button>
    </>
  );
}

export default function AdminOverview() {
  const { notify } = useUI();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reloading, setReloading] = useState(false);

  const load = () => api('/api/admin/overview').then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const reload = async () => {
    setReloading(true);
    try {
      await api('/api/admin/model/reload', { method: 'POST' });
      notify('Model reloaded');
      load();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setReloading(false);
    }
  };

  const s = data?.scans;
  const u = data?.users;
  const fakePct = s && s.total ? (s.fake / s.total) * 100 : 0;
  const riskMax = s ? Math.max(1, ...Object.values(s.risk_levels)) : 1;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="badge badge-admin" style={{ marginBottom: '.5rem' }}>Admin</span>
          <h1>Platform overview</h1>
          <p>Live numbers across every user, scan and alert.</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={load}><Icon name="refresh" /> Refresh</button>
          <Link className="btn btn-dark" to="/app/admin/users"><Icon name="users" /> Manage users</Link>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="stats stagger">
        <StatTile icon="users" label="Registered users" value={u?.total} foot={u ? `${u.new_last_7_days} new in the last 7 days` : ' '} />
        <StatTile icon="scan" label="Total scans" value={s?.total} foot={s ? `Avg ${s.avg_processing_ms} ms per scan` : ' '} />
        <StatTile icon="alert" label="Flagged as fake" value={s?.fake} tone="bad" foot={s ? `${fakePct.toFixed(1)}% of all scans` : ' '} />
        <StatTile icon="fingerprint" label="Identities protected" value={u?.identities_enrolled} foot={data ? `${data.alerts.total} alerts raised` : ' '} />
      </div>

      <div className="grid-main mb">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Scans per day</h2>
              <p className="sub">Last 14 days, all users</p>
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--chart-real)' }} /> Authentic</span>
              <span><i style={{ background: 'var(--chart-fake)' }} /> Fake</span>
            </div>
          </div>
          <div className="panel-pad">
            {s ? <BarChart data={s.per_day} /> : <div className="skeleton" style={{ height: 200 }} />}
          </div>
        </div>

        <div className="panel panel-pad">
          <h2>Verdict split</h2>
          {s ? (
            <>
              <div className="split" role="img" aria-label={`${s.real} authentic, ${s.fake} fake`}>
                <i style={{ width: `${100 - fakePct}%`, background: 'var(--chart-real)' }} />
                <i style={{ width: `${fakePct}%`, background: 'var(--chart-fake)' }} />
              </div>
              <div className="split-legend">
                <div><b><CountUp value={s.real} /></b><span><i className="legend-dot" style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--chart-real)', display: 'inline-block' }} /> Authentic</span></div>
                <div><b><CountUp value={s.fake} /></b><span><i style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--chart-fake)', display: 'inline-block' }} /> Fake</span></div>
              </div>
              <h3 className="section-title" style={{ marginTop: '1.3rem' }}>Risk levels</h3>
              <div className="risk-list">
                {RISK.map(([k, l]) => (
                  <div className="risk-row" key={k}>
                    <span>{l}</span>
                    <span className="track"><i style={{ width: `${(s.risk_levels[k] / riskMax) * 100}%` }} /></span>
                    <span className="n">{s.risk_levels[k]}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <SkeletonRows rows={3} />}
        </div>
      </div>

      <div className="panel mb">
        <div className="panel-head">
          <div>
            <h2>Latest activity</h2>
            <p className="sub">Most recent scans from all users</p>
          </div>
          <Link to="/app/admin/scans" className="btn btn-sm">All scans</Link>
        </div>
        {data ? <ScanTable items={data.recent_scans} showUser linkTo={null} /> : <SkeletonRows />}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <>
          <div className="panel panel-pad">
            <h2 style={{ marginBottom: '.9rem' }}>Detection model</h2>
            {data ? (
              <ModelCard metrics={data.system.image_model_metrics} loaded={data.system.image_model_loaded} onReload={reload} reloading={reloading} />
            ) : <SkeletonRows rows={2} />}
          </div>

          <div className="panel panel-pad">
            <h2 style={{ marginBottom: '.6rem' }}>System health</h2>
            {data && (
              <div className="health-list">
                <div className="health-row"><span><Icon name="database" size={15} /> MongoDB</span><span className="badge badge-real">Connected</span></div>
                <div className="health-row"><span><Icon name="cpu" size={15} /> Image model</span><span className={`badge ${data.system.image_model_loaded ? 'badge-real' : 'badge-warn'}`}>{data.system.image_model_loaded ? 'Loaded' : 'Not loaded'}</span></div>
                <div className="health-row"><span>Active accounts</span><span className="num-font">{u.active} / {u.total}</span></div>
                <div className="health-row"><span>Administrators</span><span className="num-font">{u.admins}</span></div>
                <div className="health-row"><span>Unread alerts</span><span className="num-font">{data.alerts.unread}</span></div>
                <div className="health-row"><span>Average confidence</span><span className="num-font">{pct(s.avg_confidence)}</span></div>
                {Object.entries(data.system.modules).map(([k, v]) => (
                  <div className="health-row" key={k}>
                    <span style={{ textTransform: 'capitalize' }}>{k} module</span>
                    <span className={`badge ${v === 'available' ? 'badge-real' : 'badge-plain'}`}>{v === 'available' ? 'Live' : 'Planned'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      </div>
    </>
  );
}
