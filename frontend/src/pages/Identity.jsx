import { useEffect, useState } from 'react';
import { api, uploadForm } from '../api';
import { useAuth } from '../auth';
import FileDrop from '../components/FileDrop';
import Icon from '../components/Icon';
import { Notice, SkeletonRows, useUI } from '../components/ui';
import { dateTime } from '../format';

export default function Identity() {
  const { refresh } = useAuth();
  const { confirm, notify } = useUI();
  const [identity, setIdentity] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    api('/api/identity').then(setIdentity).catch((e) => setError(e.message));
  }, []);

  const enrol = async (file) => {
    setBusy(true);
    setError('');
    try {
      setIdentity(await api('/api/identity', { method: 'POST', form: uploadForm(file) }));
      notify('Reference face saved. New scans will be checked against it.');
      setReplacing(false);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Remove protected identity?',
      message: 'Future scans will no longer be checked for your face. You can enrol again at any time.',
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
    setIdentity(await api('/api/identity', { method: 'DELETE' }));
    notify('Protected identity removed');
    refresh();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Protected identity</h1>
          <p>Enrol your face so the platform can warn you when it appears in manipulated images.</p>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Status</h2>
            {identity && (
              <span className={`badge ${identity.enrolled ? 'badge-real' : 'badge-warn'}`}>
                {identity.enrolled ? 'Protected' : 'Not enrolled'}
              </span>
            )}
          </div>
          {!identity ? (
            <SkeletonRows rows={2} />
          ) : (
            <div className="panel-pad">
              {identity.enrolled && !replacing ? (
                <div className="id-card">
                  <div className="id-photo">
                    <img src={identity.photo} alt="Your enrolled face" />
                    <span className="shield"><Icon name="shieldCheck" /></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <table className="kv">
                      <tbody>
                        <tr><th>Enrolled</th><td>{dateTime(identity.enrolled_at)}</td></tr>
                        <tr><th>Detector score</th><td className="num-font">{identity.face_score}</td></tr>
                        <tr><th>Stored as</th><td>128-d face embedding</td></tr>
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => setReplacing(true)}><Icon name="refresh" /> Replace photo</button>
                      <button className="btn btn-sm btn-danger" onClick={remove}><Icon name="trash" /> Remove</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {busy ? (
                    <div className="empty"><span className="spinner" style={{ width: 22, height: 22 }} /><p style={{ marginTop: '.8rem' }}>Checking photo and extracting your face</p></div>
                  ) : (
                    <FileDrop onFile={enrol} label="Drop a photo of your face, or browse" />
                  )}
                  {replacing && !busy && (
                    <button className="btn-link" style={{ marginTop: '.75rem' }} onClick={() => setReplacing(false)}>Cancel</button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="panel panel-pad">
          <h2 style={{ marginBottom: '1rem' }}>How it works</h2>
          <ul className="howto">
            <li><b>1</b><span>Upload one clear, front-facing photo with only you in it.</span></li>
            <li><b>2</b><span>Your face is located and converted into a numeric embedding with the SFace model.</span></li>
            <li><b>3</b><span>Every image you scan is searched for faces, and each one is compared with your embedding.</span></li>
            <li><b>4</b><span>If your face is found in an image classified as fake, a high-severity alert is raised.</span></li>
          </ul>
          <div style={{ marginTop: '1.4rem' }}>
            <Notice tone="info">Use good, even lighting. Avoid sunglasses, masks and group photos.</Notice>
          </div>
        </div>
      </div>
    </>
  );
}
