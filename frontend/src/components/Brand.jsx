import { Link } from 'react-router-dom';

export function BrandMark({ className = 'brand-mark' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#11161b" stroke="#2a333c" />
      <path d="M16 5.5l8.5 3.2v6.4c0 5.3-3.6 9.6-8.5 11.4-4.9-1.8-8.5-6.1-8.5-11.4V8.7z" fill="none" stroke="#2bb39a" strokeWidth="2" />
      <circle cx="16" cy="14.5" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path d="M11.2 21.2c1.2-2 2.9-3 4.8-3s3.6 1 4.8 3" fill="none" stroke="#fff" strokeWidth="1.8" />
    </svg>
  );
}

export default function Brand({ to = '/', sub = true }) {
  return (
    <Link to={to} className="brand">
      <BrandMark />
      <span className="brand-text">
        <b>Sentinel ID</b>
        {sub && <small>Deepfake &amp; identity protection</small>}
      </span>
    </Link>
  );
}
