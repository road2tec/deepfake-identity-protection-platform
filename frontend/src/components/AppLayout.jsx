import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import Brand from './Brand';
import Icon from './Icon';

const TITLES = {
  '/app': 'Overview',
  '/app/scan': 'New scan',
  '/app/history': 'Scan history',
  '/app/identity': 'Protected identity',
  '/app/alerts': 'Alerts',
  '/app/account': 'Account',
  '/app/admin': 'Admin · Platform overview',
  '/app/admin/users': 'Admin · Users',
  '/app/admin/scans': 'Admin · All scans',
};

export const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    api('/api/scans/stats')
      .then((s) => {
        setUnread(s.unread_alerts);
        setOnline(true);
      })
      .catch((e) => e.status === 0 && setOnline(false));
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const title = TITLES[location.pathname] || (location.pathname.startsWith('/app/history/') ? 'Scan report' : '');
  const isAdmin = user.role === 'admin';

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <Brand to="/app" />
        <nav>
          <div className="nav-label">Detection</div>
          <NavLink to="/app" end><Icon name="grid" /> Overview</NavLink>
          <NavLink to="/app/scan"><Icon name="scan" /> New scan</NavLink>
          <NavLink to="/app/history"><Icon name="history" /> Scan history</NavLink>
          <div className="nav-label">Identity protection</div>
          <NavLink to="/app/identity"><Icon name="fingerprint" /> Protected identity</NavLink>
          <NavLink to="/app/alerts">
            <Icon name="bell" /> Alerts {unread > 0 && <span className="count">{unread}</span>}
          </NavLink>
          {isAdmin && (
            <>
              <div className="nav-label">Administration</div>
              <NavLink to="/app/admin" end><Icon name="chart" /> Platform overview</NavLink>
              <NavLink to="/app/admin/users"><Icon name="users" /> Users</NavLink>
              <NavLink to="/app/admin/scans"><Icon name="layers" /> All scans</NavLink>
            </>
          )}
          <div className="nav-label">Settings</div>
          <NavLink to="/app/account"><Icon name="settings" /> Account</NavLink>
        </nav>
        <div className="side-user">
          <span className="avatar">{initials(user.name)}</span>
          <span className="who">
            <b>{user.name}</b>
            <span>{isAdmin ? 'Administrator' : user.email}</span>
          </span>
          <button onClick={signOut} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            <button className="btn btn-ghost btn-sm menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
              <Icon name="menu" />
            </button>
            <b>{title}</b>
          </div>
          <div className="topbar-actions">
            <span className={`status-dot ${online ? '' : 'down'}`}>
              <i /> <span>{online ? 'API online' : 'API offline'}</span>
            </span>
            {location.pathname !== '/app/scan' && (
              <NavLink to="/app/scan" className="btn btn-primary btn-sm"><Icon name="scan" /> Scan</NavLink>
            )}
          </div>
        </header>
        <div className="content">
          <div className="page" key={location.pathname}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
