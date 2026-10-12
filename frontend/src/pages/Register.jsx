import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import AuthLayout, { PasswordInput, passwordScore } from '../components/AuthLayout';
import Icon from '../components/Icon';
import { Notice } from '../components/ui';

const SCORE_TEXT = ['', 'Weak', 'Fair', 'Good', 'Strong'];

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
  const score = passwordScore(form.password);

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
    <AuthLayout>
      <h1>Create your account</h1>
      <p>It takes less than a minute. No card or phone number needed.</p>
      <form onSubmit={submit} noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <label className="field" htmlFor="name">
          <span>Full name</span>
          <div className="input-wrap">
            <Icon name="user" />
            <input id="name" type="text" autoComplete="name" value={form.name} onChange={set('name')} />
          </div>
        </label>
        <label className="field" htmlFor="email">
          <span>Email</span>
          <div className="input-wrap">
            <Icon name="mail" />
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </div>
        </label>
        <label className="field" htmlFor="password">
          <span>Password</span>
          <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          <div className="pw-meter" data-score={score}><i /><i /><i /><i /></div>
          <div className="hint">
            {form.password ? `${SCORE_TEXT[score] || 'Too short'} password. ` : ''}At least 8 characters with a letter and a number.
          </div>
        </label>
        <label className="field" htmlFor="confirm">
          <span>Confirm password</span>
          <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </label>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? <><span className="spinner" /> Creating account</> : <>Create account <Icon name="arrowRight" /></>}
        </button>
      </form>
      <p className="auth-foot">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
