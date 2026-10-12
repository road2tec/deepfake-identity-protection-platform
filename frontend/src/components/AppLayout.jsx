import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import Brand from './Brand';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api('/api/scans/stats')
      .then((s) => setUnread(s.unread_alerts))
      .catch(() => {});
  }, [location.pathname]);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand to="/app" sub={false} />
        <nav>
          <div className="nav-label">Detection</div>
          <NavLink to="/app" end>Overview</NavLink>
          <NavLink to="/app/scan">New scan</NavLink>
          <NavLink to="/app/history">Scan history</NavLink>
          <div className="nav-label">Identity protection</div>
          <NavLink to="/app/identity">Protected identity</NavLink>
          <NavLink to="/app/alerts">
            Alerts {unread > 0 && <span className="count">{unread}</span>}
          </NavLink>
          <div className="nav-label">Settings</div>
          <NavLink to="/app/account">Account</NavLink>
        </nav>
        <div className="side-foot">Version 0.5 &middot; image module</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="who">
            Signed in as <strong>{user.name}</strong>
          </span>
          <button className="btn btn-sm" onClick={signOut}>
            Sign out
          </button>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
