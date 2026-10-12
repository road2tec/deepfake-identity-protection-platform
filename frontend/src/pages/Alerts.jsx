import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { Empty, Notice, SkeletonRows, useUI } from '../components/ui';
import { dateTime } from '../format';

export default function Alerts() {
  const { notify } = useUI();
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
    notify('All alerts marked as read');
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
        {unread > 0 && (
          <div className="actions"><button className="btn" onClick={markAll}><Icon name="check" /> Mark all as read</button></div>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="panel">
        {!items ? (
          <SkeletonRows rows={3} />
        ) : !items.length ? (
          <Empty icon="shieldCheck" title="All clear">Nothing suspicious involving your face has been found.</Empty>
        ) : (
          items.map((a, i) => (
            <div key={a.id} className={`alert-row ${a.read ? '' : 'unread'}`} style={{ animationDelay: `${i * 40}ms` }}>
              <span className="a-ico"><Icon name={a.read ? 'bell' : 'alert'} /></span>
              <div className="a-body">
                <strong>{a.title}</strong>
                <p>{a.message}</p>
                <small>
                  {dateTime(a.created_at)} &middot; <Link to={`/app/history/${a.scan_id}`}>Open scan report</Link>
                </small>
              </div>
              {!a.read && (
                <button className="btn btn-sm" onClick={() => markRead(a.id)}>Mark read</button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
