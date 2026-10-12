import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { dateTime } from '../format';

export default function Alerts() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = () => api('/api/alerts').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    await api(`/api/alerts/${id}/read`, { method: 'POST' });
    load();
  };

  const markAll = async () => {
    await api('/api/alerts/read-all', { method: 'POST' });
    load();
  };

  const unread = items ? items.filter((a) => !a.read).length : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Alerts</h1>
          <p>Raised when your protected face is found in an image classified as fake.</p>
        </div>
        {unread > 0 && <button className="btn" onClick={markAll}>Mark all as read</button>}
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      <div className="panel">
        {!items ? (
          <div className="empty">Loading...</div>
        ) : !items.length ? (
          <div className="empty">No alerts. Nothing suspicious involving your face has been found.</div>
        ) : (
          items.map((a) => (
            <div key={a.id} className={`alert-row ${a.read ? '' : 'unread'}`}>
              <div>
                <strong>{a.title}</strong>
                <p style={{ margin: '.2rem 0' }}>{a.message}</p>
                <small>
                  {dateTime(a.created_at)} &middot; <Link to={`/app/history/${a.scan_id}`}>Open scan</Link>
                </small>
              </div>
              <div>
                {!a.read && (
                  <button className="btn btn-sm" onClick={() => markRead(a.id)}>Mark read</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
