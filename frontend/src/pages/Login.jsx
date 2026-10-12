import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import AuthLayout, { PasswordInput } from '../components/AuthLayout';
import Icon from '../components/Icon';
import { Notice } from '../components/ui';

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1>Welcome back</h1>
      <p>Sign in to see your scans, alerts and protected identity.</p>
      <form onSubmit={submit} noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <label className="field" htmlFor="email">
          <span>Email</span>
          <div className="input-wrap">
            <Icon name="mail" />
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </label>
        <label className="field" htmlFor="password">
          <span>Password</span>
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? <><span className="spinner" /> Signing in</> : <>Sign in <Icon name="arrowRight" /></>}
        </button>
      </form>
      <p className="auth-foot">
        New to Sentinel ID? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
