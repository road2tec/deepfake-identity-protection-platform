import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { dateOnly, pct } from '../format';

export default function Account() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api('/api/health').then(setHealth).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setUser(await api('/api/auth/me', { method: 'PATCH', body: { name } }));
      setMsg('Name updated.');
    } catch (err) {
      setError(err.message);
    }
  };

  const m = health?.image_model_metrics;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>Member since {dateOnly(user.created_at)}</p>
        </div>
      </div>
      <div className="grid-2">
        <form className="panel panel-pad" onSubmit={save}>
          <h2>Profile</h2>
          {msg && <div className="notice notice-ok">{msg}</div>}
          {error && <div className="notice notice-error">{error}</div>}
          <label className="field">
            <span>Full name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={user.email} disabled />
          </label>
          <button className="btn btn-primary" disabled={name.trim().length < 2 || name === user.name}>Save changes</button>
        </form>

        <div className="panel panel-pad">
          <h2>System status</h2>
          {!health ? (
            <p className="muted">Checking...</p>
          ) : (
            <table className="kv">
              <tbody>
                <tr><th>Database</th><td>{health.database ? 'Connected' : 'Unavailable'}</td></tr>
                <tr><th>Image model</th><td>{health.image_model_loaded ? 'Loaded' : 'Loading / missing'}</td></tr>
                {m && (
                  <>
                    <tr><th>Architecture</th><td>{m.model}</td></tr>
                    <tr><th>Training data</th><td>{m.dataset}</td></tr>
                    <tr><th>Held-out test accuracy</th><td>{pct(m.test_accuracy, 2)} on {m.test_images.toLocaleString()} images</td></tr>
                    <tr><th>ROC-AUC</th><td>{m.test_roc_auc}</td></tr>
                  </>
                )}
                <tr><th>Audio module</th><td>Planned</td></tr>
                <tr><th>Video module</th><td>Planned</td></tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
