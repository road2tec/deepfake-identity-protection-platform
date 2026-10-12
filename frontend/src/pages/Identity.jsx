import { useEffect, useState } from 'react';
import { api, uploadForm } from '../api';
import { useAuth } from '../auth';
import FileDrop from '../components/FileDrop';
import { dateTime } from '../format';

export default function Identity() {
  const { refresh } = useAuth();
  const [identity, setIdentity] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    api('/api/identity').then(setIdentity).catch((e) => setError(e.message));
  }, []);

  const enrol = async (file) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setIdentity(await api('/api/identity', { method: 'POST', form: uploadForm(file) }));
      setMessage('Reference face saved. New scans will be checked against it.');
      setReplacing(false);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove your protected identity? Future scans will no longer be checked for your face.')) return;
    setIdentity(await api('/api/identity', { method: 'DELETE' }));
    setMessage('Protected identity removed.');
    refresh();
  };

  if (!identity) return error ? <div className="notice notice-error">{error}</div> : <div className="empty">Loading...</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Protected identity</h1>
          <p>Enrol your face so the platform can warn you when it appears in manipulated images.</p>
        </div>
      </div>

      {error && <div className="notice notice-error">{error}</div>}
      {message && <div className="notice notice-ok">{message}</div>}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Status</h2>
            <span className={`badge ${identity.enrolled ? 'badge-real' : 'badge-warn'}`}>
              {identity.enrolled ? 'Protected' : 'Not enrolled'}
            </span>
          </div>
          <div className="panel-pad">
            {identity.enrolled && !replacing ? (
              <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <img className="identity-photo" src={identity.photo} alt="Your enrolled face" />
                <div>
                  <table className="kv">
                    <tbody>
                      <tr><th>Enrolled</th><td>{dateTime(identity.enrolled_at)}</td></tr>
                      <tr><th>Detector score</th><td>{identity.face_score}</td></tr>
                      <tr><th>Stored as</th><td>128-d face embedding</td></tr>
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
                    <button className="btn" onClick={() => setReplacing(true)}>Replace photo</button>
                    <button className="btn btn-danger" onClick={remove}>Remove</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {busy ? (
                  <div className="empty"><span className="spinner" /> Checking photo...</div>
                ) : (
                  <FileDrop onFile={enrol} label="Drop a photo of your face or click to choose" />
                )}
                {replacing && (
                  <button className="btn-link" style={{ marginTop: '.75rem' }} onClick={() => setReplacing(false)}>
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="panel panel-pad">
          <h2>How it works</h2>
          <ol style={{ paddingLeft: '1.1rem', margin: '0 0 1rem' }}>
            <li>Upload one clear, front-facing photo with only you in it.</li>
            <li>The face is located and converted into a numeric embedding (SFace model).</li>
            <li>Every image you scan is searched for faces, and each one is compared with your embedding.</li>
            <li>If your face is found in an image classified as fake, an alert is raised.</li>
          </ol>
          <h3>Photo tips</h3>
          <ul className="muted" style={{ paddingLeft: '1.1rem', margin: 0 }}>
            <li>Good, even lighting; no sunglasses or masks.</li>
            <li>Face should fill a reasonable part of the frame.</li>
            <li>You can replace the photo at any time.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
