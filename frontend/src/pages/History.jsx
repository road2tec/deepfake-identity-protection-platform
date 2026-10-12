import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { ScanTable } from './Overview';

const PAGE = 15;

export default function History() {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ total: 0, items: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ limit: PAGE, skip: page * PAGE });
    if (filter) q.set('label', filter);
    api(`/api/scans?${q}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (scan) => {
    if (!window.confirm(`Delete the scan of "${scan.filename}"?`)) return;
    try {
      await api(`/api/scans/${scan.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Scan history</h1>
          <p>{data.total} scan{data.total === 1 ? '' : 's'}</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.9rem' }}>
          Show
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            style={{ width: 'auto' }}
          >
            <option value="">All results</option>
            <option value="FAKE">Fake only</option>
            <option value="REAL">Authentic only</option>
          </select>
        </label>
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      <div className="panel">
        {loading && !data.items.length ? <div className="empty">Loading...</div> : <ScanTable items={data.items} onDelete={remove} />}
        {data.total > PAGE && (
          <div className="pager">
            <span>Page {page + 1} of {pages}</span>
            <span style={{ display: 'flex', gap: '.4rem' }}>
              <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn btn-sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </span>
          </div>
        )}
      </div>
    </>
  );
}
