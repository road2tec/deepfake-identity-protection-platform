import { useEffect, useState } from 'react';
import { api, uploadForm } from '../api';
import FileDrop from '../components/FileDrop';
import ScanResult from '../components/ScanResult';
import { bytes } from '../format';

const TABS = [
  ['image', 'Image'],
  ['audio', 'Audio'],
  ['video', 'Video'],
];

export default function NewScan() {
  const [tab, setTab] = useState('image');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (f) => {
    setFile(f);
    setResult(null);
    setError('');
  };

  const reset = () => {
    setFile(null);
    setPreview('');
    setResult(null);
    setError('');
  };

  const analyze = async () => {
    setBusy(true);
    setError('');
    try {
      setResult(await api('/api/scans/image', { method: 'POST', form: uploadForm(file) }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>New scan</h1>
          <p>Upload media to check it for AI generation or manipulation.</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
            {key !== 'image' && <span className="badge badge-plain" style={{ marginLeft: '.4rem' }}>Planned</span>}
          </button>
        ))}
      </div>

      {tab !== 'image' ? (
        <div className="panel panel-pad">
          <h2>{tab === 'audio' ? 'Audio' : 'Video'} analysis is not available yet</h2>
          <p className="muted" style={{ maxWidth: 640 }}>
            {tab === 'audio'
              ? 'Voice-clone detection using mel-spectrogram features is scheduled for the next release. It will check uploaded recordings against your enrolled voice sample.'
              : 'Frame-level face-swap detection is scheduled for the next release. Each sampled frame will go through the same face model used for images, with a temporal consistency check across frames.'}
          </p>
          <p className="muted">Image scanning is fully available in the meantime.</p>
        </div>
      ) : (
        <div className="grid-scan">
          <div className="panel panel-pad">
            <h2>Image</h2>
            {!file ? (
              <FileDrop onFile={choose} />
            ) : (
              <>
                <img className="preview" src={preview} alt="Selected upload" />
                <div className="file-line">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name} <span className="muted">({bytes(file.size)})</span>
                  </span>
                  <button className="btn-link" onClick={reset} disabled={busy}>Choose another</button>
                </div>
                {!result && (
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={analyze} disabled={busy}>
                    {busy ? (<><span className="spinner" /> Analysing...</>) : 'Analyse image'}
                  </button>
                )}
                {result && (
                  <button className="btn" style={{ width: '100%' }} onClick={reset}>Scan another image</button>
                )}
              </>
            )}
            {error && <div className="notice notice-error" style={{ marginTop: '1rem' }}>{error}</div>}
            <p className="hint" style={{ marginTop: '1rem' }}>
              Works best on photos where a face is clearly visible. Uploaded files are deleted after analysis; only a
              small thumbnail and the result are kept in your history.
            </p>
          </div>

          <div>
            {result ? (
              <ScanResult scan={result} />
            ) : (
              <div className="panel empty">The result will appear here after analysis.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
