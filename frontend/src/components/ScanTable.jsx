import { Link } from 'react-router-dom';
import { dateTime, pct } from '../format';
import Icon from './Icon';
import { Empty } from './ui';

export function Verdict({ label }) {
  return label === 'FAKE'
    ? <span className="badge badge-fake">Fake</span>
    : <span className="badge badge-real">Authentic</span>;
}

export function Prob({ value, fake }) {
  return (
    <span className="prob">
      <span className="prob-bar"><i className={fake ? 'fake' : ''} style={{ width: pct(value) }} /></span>
      {pct(value)}
    </span>
  );
}

/** Scan list used on the overview, history and admin pages. `showUser` adds the owner column. */
export default function ScanTable({ items, onDelete, showUser = false, linkTo = (s) => `/app/history/${s.id}` }) {
  if (!items.length) {
    return (
      <Empty icon="scan" title="No scans yet">
        {showUser ? 'Scans from all users will appear here.' : <><Link to="/app/scan">Run your first scan</Link> to see results here.</>}
      </Empty>
    );
  }
  return (
    <div className="table-wrap">
      <table className="list responsive">
        <thead>
          <tr>
            <th>File</th>
            {showUser && <th>User</th>}
            <th>Result</th>
            <th className="num">Synthetic</th>
            <th>Identity</th>
            <th>Date</th>
            {onDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={s.id} style={{ animationDelay: `${i * 30}ms` }}>
              <td className="primary">
                <div className="cell-file">
                  {s.thumbnail ? <img className="thumb" src={s.thumbnail} alt="" /> : <span className="thumb" />}
                  {linkTo ? <Link to={linkTo(s)}>{s.filename}</Link> : <span className="name">{s.filename}</span>}
                </div>
              </td>
              {showUser && (
                <td data-label="User" className="cell-user">
                  <div><b>{s.user.name}</b><span>{s.user.email}</span></div>
                </td>
              )}
              <td data-label="Result"><Verdict label={s.label} /></td>
              <td data-label="Synthetic" className="num"><Prob value={s.fake_probability} fake={s.label === 'FAKE'} /></td>
              <td data-label="Identity">
                {s.identity_match?.matched ? <span className="badge badge-warn">Face match</span> : <span className="muted">&ndash;</span>}
              </td>
              <td data-label="Date" className="muted" style={{ whiteSpace: 'nowrap' }}>{dateTime(s.created_at)}</td>
              {onDelete && (
                <td className="right">
                  <div className="row-actions">
                    <button className="btn btn-sm btn-ghost btn-danger" onClick={() => onDelete(s)} aria-label={`Delete ${s.filename}`}>
                      <Icon name="trash" /> <span>Delete</span>
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
