import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import ScanResult from '../components/ScanResult';

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/scans/${id}`).then(setScan).catch((e) => setError(e.message));
  }, [id]);

  const remove = async () => {
    if (!window.confirm('Delete this scan?')) return;
    await api(`/api/scans/${id}`, { method: 'DELETE' });
    navigate('/app/history');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p><Link to="/app/history">Scan history</Link> /</p>
          <h1>{scan ? scan.filename : 'Scan'}</h1>
        </div>
        {scan && <button className="btn btn-danger" onClick={remove}>Delete scan</button>}
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      {scan && (
        <div className="grid-scan">
          <div className="panel panel-pad">
            <img className="preview" src={scan.thumbnail} alt="Scanned file thumbnail" />
            <p className="hint" style={{ marginTop: '.6rem' }}>Stored thumbnail. The original upload was deleted after analysis.</p>
          </div>
          <ScanResult scan={scan} />
        </div>
      )}
    </>
  );
}
