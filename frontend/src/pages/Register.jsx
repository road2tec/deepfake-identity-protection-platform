import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import Brand from '../components/Brand';

function validate({ name, email, password, confirm }) {
  if (name.trim().length < 2) return 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain a letter and a number.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="public-header">
        <div className="inner"><Brand /></div>
      </header>
      <main className="public-main">
        <div className="auth-wrap">
          <h1>Create an account</h1>
          <p className="muted">An account keeps your scan history and lets you protect your identity.</p>
          <form className="panel" onSubmit={submit} noValidate>
            {error && <div className="notice notice-error">{error}</div>}
            <label className="field">
              <span>Full name</span>
              <input type="text" autoComplete="name" value={form.name} onChange={set('name')} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
              <div className="hint">At least 8 characters, with a letter and a number.</div>
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
            </label>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p className="auth-foot">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </>
  );
}
