import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import ScanTable from '../../components/ScanTable';
import { Notice, SkeletonRows, useUI } from '../../components/ui';
import { Pager } from '../History';

const PAGE = 20;
const FILTERS = [['', 'All'], ['FAKE', 'Fake'], ['REAL', 'Authentic']];

export default function AdminScans() {
  const { confirm, notify } = useUI();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams({ limit: PAGE, skip: page * PAGE });
    if (filter) q.set('label', filter);
    api(`/api/admin/scans?${q}`).then(setData).catch((e) => setError(e.message));
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (scan) => {
    const ok = await confirm({
      title: 'Delete this scan?',
      message: `"${scan.filename}" from ${scan.user.name} will be removed together with any alert it raised.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/scans/${scan.id}`, { method: 'DELETE' });
      notify('Scan deleted');
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
          <h1>All scans</h1>
          <p>{data ? `${data.total} scan${data.total === 1 ? '' : 's'} across all users` : 'Loading'}</p>
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="panel">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Filter by result">
            {FILTERS.map(([v, l]) => (
              <button key={l} className={filter === v ? 'active' : ''} onClick={() => { setFilter(v); setPage(0); }}>{l}</button>
            ))}
          </div>
        </div>
        {data ? <ScanTable items={data.items} showUser onDelete={remove} linkTo={null} /> : <SkeletonRows rows={6} />}
        {data && <Pager page={page} total={data.total} size={PAGE} onPage={setPage} />}
      </div>
    </>
  );
}
