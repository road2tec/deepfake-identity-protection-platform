import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { PasswordInput } from '../components/AuthLayout';
import { initials } from '../components/AppLayout';
import { Notice, useUI } from '../components/ui';
import { dateOnly, pct } from '../format';

export default function Account() {
  const { user, setUser } = useAuth();
  const { notify } = useUI();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api('/api/health').then(setHealth).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setUser(await api('/api/auth/me', { method: 'PATCH', body: { name } }));
      notify('Profile updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) {
      setPwError('New password needs at least 8 characters, with a letter and a number.');
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { current_password: pw.current, new_password: pw.next } });
      setPw({ current: '', next: '', confirm: '' });
      notify('Password changed');
    } catch (err) {
      setPwError(err.message);
    }
  };

  const m = health?.image_model_metrics;
  const setP = (k) => (e) => setPw({ ...pw, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="avatar" style={{ width: 52, height: 52, fontSize: '1.05rem', background: 'var(--ink)' }}>{initials(user.name)}</span>
          <div>
            <h1>{user.name}</h1>
            <p>
              {user.email} &middot; member since {dateOnly(user.created_at)}
              {user.role === 'admin' && <> &middot; <span className="badge badge-admin">Admin</span></>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <form className="panel panel-pad" onSubmit={save}>
            <h2 style={{ marginBottom: '1rem' }}>Profile</h2>
            {error && <Notice tone="error">{error}</Notice>}
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

          <form className="panel panel-pad" onSubmit={changePassword}>
            <h2 style={{ marginBottom: '1rem' }}>Change password</h2>
            {pwError && <Notice tone="error">{pwError}</Notice>}
            <label className="field">
              <span>Current password</span>
              <PasswordInput autoComplete="current-password" value={pw.current} onChange={setP('current')} />
            </label>
            <label className="field">
              <span>New password</span>
              <PasswordInput autoComplete="new-password" value={pw.next} onChange={setP('next')} />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <PasswordInput autoComplete="new-password" value={pw.confirm} onChange={setP('confirm')} />
            </label>
            <button className="btn btn-dark" disabled={!pw.current || !pw.next}>Update password</button>
          </form>
        </div>

        <div className="panel panel-pad">
          <h2 style={{ marginBottom: '1rem' }}>System status</h2>
          {!health ? (
            <p className="muted">Checking...</p>
          ) : (
            <div className="health-list">
              <div className="health-row"><span>Database</span><span className={`badge ${health.database ? 'badge-real' : 'badge-fake'}`}>{health.database ? 'Connected' : 'Unavailable'}</span></div>
              <div className="health-row"><span>Image model</span><span className={`badge ${health.image_model_loaded ? 'badge-real' : 'badge-warn'}`}>{health.image_model_loaded ? 'Loaded' : 'Loading'}</span></div>
              {m && (
                <>
                  <div className="health-row"><span>Architecture</span><span>{m.model.split(' (')[0]}</span></div>
                  <div className="health-row"><span>Test accuracy</span><span className="num-font">{pct(m.test_accuracy, 1)}</span></div>
                  <div className="health-row"><span>ROC-AUC</span><span className="num-font">{m.test_roc_auc}</span></div>
                </>
              )}
              <div className="health-row"><span>Audio module</span><span className="badge badge-plain">Planned</span></div>
              <div className="health-row"><span>Video module</span><span className="badge badge-plain">Planned</span></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
