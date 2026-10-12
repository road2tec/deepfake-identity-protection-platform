import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { initials } from '../../components/AppLayout';
import Icon from '../../components/Icon';
import { Empty, Notice, SkeletonRows, useUI } from '../../components/ui';
import { dateOnly, dateTime } from '../../format';
import { Pager } from '../History';

const PAGE = 15;
const ROLES = [['', 'All'], ['user', 'Users'], ['admin', 'Admins']];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { confirm, notify } = useUI();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(q);
      setPage(0);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(() => {
    const p = new URLSearchParams({ limit: PAGE, skip: page * PAGE, q: query });
    if (role) p.set('role', role);
    api(`/api/admin/users?${p}`).then(setData).catch((e) => setError(e.message));
  }, [query, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (u, changes, message) => {
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: changes });
      notify(message);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const toggleActive = async (u) => {
    if (u.active) {
      const ok = await confirm({
        title: `Disable ${u.name}?`,
        message: 'They will be signed out and will not be able to log in until the account is enabled again.',
        confirmText: 'Disable account',
        danger: true,
      });
      if (!ok) return;
    }
    update(u, { active: !u.active }, u.active ? 'Account disabled' : 'Account enabled');
  };

  const toggleRole = async (u) => {
    const makeAdmin = u.role !== 'admin';
    const ok = await confirm({
      title: makeAdmin ? `Make ${u.name} an administrator?` : `Remove admin rights from ${u.name}?`,
      message: makeAdmin ? 'Admins can see all users and scans, and can disable or delete accounts.' : 'They will keep their account as a normal user.',
      confirmText: makeAdmin ? 'Make admin' : 'Remove admin',
    });
    if (ok) update(u, { role: makeAdmin ? 'admin' : 'user' }, makeAdmin ? 'User promoted to admin' : 'Admin rights removed');
  };

  const remove = async (u) => {
    const ok = await confirm({
      title: `Delete ${u.name}?`,
      message: `This permanently deletes the account, its ${u.scan_count} scan${u.scan_count === 1 ? '' : 's'} and all alerts. This cannot be undone.`,
      confirmText: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      notify('User deleted');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <span className="badge badge-admin" style={{ marginBottom: '.5rem' }}>Admin</span>
          <h1>Users</h1>
          <p>{data ? `${data.total} account${data.total === 1 ? '' : 's'}` : 'Loading'}</p>
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}

      <div className="panel">
        <div className="toolbar">
          <div className="input-wrap search">
            <Icon name="search" />
            <input type="search" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="seg" role="group" aria-label="Filter by role">
            {ROLES.map(([v, l]) => (
              <button key={l} className={role === v ? 'active' : ''} onClick={() => { setRole(v); setPage(0); }}>{l}</button>
            ))}
          </div>
        </div>

        {!data ? (
          <SkeletonRows rows={5} />
        ) : !data.items.length ? (
          <Empty icon="users" title="No users found">Try a different search.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="list responsive">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="num">Scans</th>
                  <th className="num">Fake</th>
                  <th>Identity</th>
                  <th>Joined</th>
                  <th>Last login</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((u, i) => {
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id} style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="primary">
                        <div className="cell-file">
                          <span className="avatar" style={{ width: 34, height: 34, background: u.role === 'admin' ? 'var(--ink)' : 'var(--accent)', fontSize: '.78rem' }}>
                            {initials(u.name)}
                          </span>
                          <div className="cell-user" style={{ minWidth: 0 }}>
                            <b>{u.name}{self && <span className="muted" style={{ fontWeight: 400 }}> (you)</span>}</b>
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Role">{u.role === 'admin' ? <span className="badge badge-admin">Admin</span> : <span className="badge badge-plain">User</span>}</td>
                      <td data-label="Status">{u.active ? <span className="badge badge-real">Active</span> : <span className="badge badge-fake">Disabled</span>}</td>
                      <td data-label="Scans" className="num">{u.scan_count}</td>
                      <td data-label="Fake" className="num">{u.fake_count}</td>
                      <td data-label="Identity">{u.identity_enrolled ? <span className="badge badge-info">Enrolled</span> : <span className="muted">&ndash;</span>}</td>
                      <td data-label="Joined" className="muted" style={{ whiteSpace: 'nowrap' }}>{dateOnly(u.created_at)}</td>
                      <td data-label="Last login" className="muted" style={{ whiteSpace: 'nowrap' }}>{u.last_login ? dateTime(u.last_login) : 'Never'}</td>
                      <td className="right">
                        {!self && (
                          <div className="row-actions">
                            <button className="btn btn-sm" onClick={() => toggleRole(u)} title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}>
                              <Icon name="key" /> {u.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                            <button className="btn btn-sm" onClick={() => toggleActive(u)}>
                              <Icon name={u.active ? 'ban' : 'check'} /> {u.active ? 'Disable' : 'Enable'}
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => remove(u)} aria-label={`Delete ${u.name}`}>
                              <Icon name="trash" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={page} total={data.total} size={PAGE} onPage={setPage} />}
      </div>
    </>
  );
}
