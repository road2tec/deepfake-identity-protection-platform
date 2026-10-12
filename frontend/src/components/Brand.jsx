import { Link } from 'react-router-dom';

export default function Brand({ to = '/', sub = true }) {
  return (
    <Link to={to} className="brand">
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="4" fill="#0b5c55" />
        <path d="M16 6l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V9z" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M12.5 15.5l2.5 2.5 4.5-5" fill="none" stroke="#fff" strokeWidth="2" />
      </svg>
      <span>
        DDIP{sub && <small> &middot; Deepfake &amp; Identity Protection</small>}
      </span>
    </Link>
  );
}
