import { useState } from 'react';
import Brand from './Brand';
import Icon from './Icon';

const POINTS = [
  'Detect AI-generated and manipulated face images',
  'Get alerted when your face appears in a fake',
  'Uploads are deleted right after analysis',
];

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <div className="auth-main">
        <Brand />
        <div className="auth-form">{children}</div>
      </div>
      <aside className="auth-aside">
        <div className="grid-lines" />
        <span className="eyebrow" style={{ color: 'var(--accent-bright)' }}>Sentinel ID</span>
        <h2>Protect your face from being misused in synthetic media.</h2>
        <p>One account keeps your scan history, your protected identity and your alerts in one place.</p>
        <ul>
          {POINTS.map((p) => (
            <li key={p}><Icon name="check" /> {p}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export function PasswordInput({ value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <Icon name="lock" />
      <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} />
      <button type="button" className="toggle-pw" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
    </div>
  );
}

export function passwordScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}
