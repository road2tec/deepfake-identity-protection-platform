import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import ScanResult from '../components/ScanResult';
import { Notice, SkeletonRows, useUI } from '../components/ui';

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, notify } = useUI();
  const [scan, setScan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/scans/${id}`).then(setScan).catch((e) => setError(e.message));
  }, [id]);

  const remove = async () => {
    const ok = await confirm({ title: 'Delete this scan?', message: 'This removes the result and any linked alert.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    await api(`/api/scans/${id}`, { method: 'DELETE' });
    notify('Scan deleted');
    navigate('/app/history');
  };

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <p style={{ marginBottom: '.35rem' }}>
            <Link to="/app/history"><Icon name="arrowLeft" size={14} /> Scan history</Link>
          </p>
          <h1 style={{ wordBreak: 'break-word' }}>{scan ? scan.filename : 'Scan report'}</h1>
        </div>
        {scan && (
          <div className="actions">
            <button className="btn btn-danger" onClick={remove}><Icon name="trash" /> Delete scan</button>
          </div>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!scan && !error && <div className="panel"><SkeletonRows /></div>}
      {scan && (
        <div className="grid-scan">
          <div className="panel panel-pad">
            <div className="preview-box"><img src={scan.thumbnail} alt="Scanned file thumbnail" /></div>
            <p className="hint" style={{ marginTop: '.7rem' }}>Stored thumbnail. The original upload was deleted after analysis.</p>
          </div>
          <ScanResult scan={scan} />
        </div>
      )}
    </>
  );
}
