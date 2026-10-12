import { useEffect, useState } from 'react';
import { api, uploadForm } from '../api';
import FileDrop from '../components/FileDrop';
import Icon from '../components/Icon';
import ScanResult from '../components/ScanResult';
import { Empty, Notice } from '../components/ui';
import { bytes } from '../format';

const TABS = [
  ['image', 'Image', 'image'],
  ['audio', 'Audio', 'audio'],
  ['video', 'Video', 'video'],
];

const STAGES = ['Uploading file', 'Reading metadata', 'Locating faces', 'Running neural classifier', 'Checking your identity'];

export default function NewScan() {
  const [tab, setTab] = useState('image');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Walk through the pipeline stages while the request is running.
  useEffect(() => {
    if (!busy) return undefined;
    setStage(0);
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 420);
    return () => clearInterval(id);
  }, [busy]);

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
      const started = Date.now();
      const scan = await api('/api/scans/image', { method: 'POST', form: uploadForm(file) });
      // Keep the scanning animation on screen long enough to be readable.
      const wait = Math.max(0, 1400 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      setResult(scan);
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

      <div className="tabs" role="tablist">
        {TABS.map(([key, label, icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            <Icon name={icon} /> {label}
            {key !== 'image' && <span className="badge badge-plain">Planned</span>}
          </button>
        ))}
      </div>

      {tab !== 'image' ? (
        <div className="panel">
          <Empty icon={tab} title={`${tab === 'audio' ? 'Audio' : 'Video'} analysis is coming in the next phase`}>
            <p style={{ maxWidth: 520, margin: '.3rem auto 0' }}>
              {tab === 'audio'
                ? 'Voice-clone detection using mel-spectrogram features will check recordings for synthetic speech.'
                : 'Frame-level face-swap detection will run every sampled frame through the face model, with a consistency check across frames.'}
            </p>
            <button className="btn btn-sm" style={{ marginTop: '1rem' }} onClick={() => setTab('image')}>Scan an image instead</button>
          </Empty>
        </div>
      ) : (
        <div className="grid-scan">
          <div className="panel panel-pad">
            {!file ? (
              <FileDrop onFile={choose} />
            ) : (
              <>
                <div className={`preview-box ${busy ? 'scanning' : ''}`}>
                  <img src={preview} alt="Selected upload" />
                  {busy && (
                    <>
                      <div className="corners"><span /><span /><span /><span /></div>
                      <div className="scan-status"><span className="spinner" /> {STAGES[stage]}</div>
                    </>
                  )}
                </div>
                <div className="file-line">
                  <span className="name">{file.name} <span className="muted">&middot; {bytes(file.size)}</span></span>
                  <button className="btn-link" onClick={reset} disabled={busy}>Change</button>
                </div>
                {!result ? (
                  <button className="btn btn-primary btn-lg btn-block" onClick={analyze} disabled={busy}>
                    {busy ? <><span className="spinner" /> Analysing</> : <><Icon name="scan" /> Analyse image</>}
                  </button>
                ) : (
                  <button className="btn btn-lg btn-block" onClick={reset}><Icon name="upload" /> Scan another image</button>
                )}
              </>
            )}
            {error && <div style={{ marginTop: '1rem' }}><Notice tone="error">{error}</Notice></div>}
            <p className="hint" style={{ marginTop: '1rem' }}>
              Works best on photos where a face is clearly visible. The original file is deleted after analysis.
            </p>
          </div>

          <div>
            {result ? (
              <ScanResult scan={result} />
            ) : busy ? (
              <div className="panel panel-pad">
                <h3 className="section-title">Analysis in progress</h3>
                <ul className="progress-steps">
                  {STAGES.map((s, i) => (
                    <li key={s} className={i < stage ? 'done' : i === stage ? 'now' : ''}>
                      <i>{i < stage && <Icon name="check" />}</i> {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="panel">
                <Empty icon="shieldCheck" title="No result yet">
                  Choose an image and run the analysis. The verdict, evidence and file details will appear here.
                </Empty>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
