import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import ScanTable from '../components/ScanTable';
import { Notice, SkeletonRows, useUI } from '../components/ui';

const PAGE = 15;
const FILTERS = [['', 'All'], ['FAKE', 'Fake'], ['REAL', 'Authentic']];

export function Pager({ page, total, size, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  return (
    <div className="pager">
      <span>Page {page + 1} of {pages} &middot; {total} items</span>
      <span style={{ display: 'flex', gap: '.4rem' }}>
        <button className="btn btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}><Icon name="arrowLeft" /> Prev</button>
        <button className="btn btn-sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next <Icon name="arrowRight" /></button>
      </span>
    </div>
  );
}

export default function History() {
  const { confirm, notify } = useUI();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams({ limit: PAGE, skip: page * PAGE });
    if (filter) q.set('label', filter);
    api(`/api/scans?${q}`).then(setData).catch((e) => setError(e.message));
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (scan) => {
    const ok = await confirm({
      title: 'Delete this scan?',
      message: `"${scan.filename}" and any alert linked to it will be removed from your history.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/scans/${scan.id}`, { method: 'DELETE' });
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
          <h1>Scan history</h1>
          <p>{data ? `${data.total} scan${data.total === 1 ? '' : 's'}` : 'Loading'}</p>
        </div>
        <div className="actions">
          <Link to="/app/scan" className="btn btn-primary"><Icon name="scan" /> New scan</Link>
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
        {data ? <ScanTable items={data.items} onDelete={remove} /> : <SkeletonRows rows={5} />}
        {data && <Pager page={page} total={data.total} size={PAGE} onPage={setPage} />}
      </div>
    </>
  );
}
