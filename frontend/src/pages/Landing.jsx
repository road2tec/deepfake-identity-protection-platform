import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import Brand from '../components/Brand';
import Icon from '../components/Icon';

const STEPS = [
  ['Upload', 'Drop in a photo you received, found online or suspect has been edited. Files are deleted after analysis.'],
  ['Inspect metadata', 'The file is checked for generator tags written by Midjourney, DALL-E, Stable Diffusion, Firefly and others.'],
  ['Analyse the face', 'Faces are located with YuNet and the largest one is scored by a CNN trained on real and GAN-generated faces.'],
  ['Match your identity', 'Every face is compared with your enrolled reference. A match inside a fake raises an alert.'],
];

const MODULES = [
  ['image', 'Image deepfake detection', 'Metadata forensics plus a neural face classifier with a clear verdict and evidence trail.', true],
  ['fingerprint', 'Protected identity', 'Enrol one photo. It is stored as a face embedding, not as a searchable picture.', true],
  ['bell', 'Misuse alerts', 'Get notified when your face is found in an image classified as synthetic.', true],
  ['history', 'Scan history and reports', 'Every scan is kept with its verdict, signals, file hash and thumbnail.', true],
  ['audio', 'Voice clone detection', 'Spectrogram-based detection of cloned or synthetic speech.', false],
  ['video', 'Video face-swap detection', 'Frame sampling with temporal consistency checks across a clip.', false],
];

function FaceSketch() {
  return (
    <svg className="face" viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="250" fill="#1e262e" />
      <path d="M0 250c10-48 44-70 100-70s90 22 100 70z" fill="#2a343e" />
      <rect x="84" y="140" width="32" height="44" rx="10" fill="#36414c" />
      <ellipse cx="100" cy="102" rx="44" ry="54" fill="#3d4a56" />
      <path d="M56 92c0-36 20-56 44-56s46 18 46 54c-10-16-28-24-46-24s-34 8-44 26z" fill="#252e37" />
      <ellipse cx="83" cy="104" rx="5" ry="3.4" fill="#1a2128" />
      <ellipse cx="117" cy="104" rx="5" ry="3.4" fill="#1a2128" />
      <path d="M100 108v16l-5 3" fill="none" stroke="#2c363f" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M88 136c7 4 17 4 24 0" fill="none" stroke="#1f272e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    api('/api/health').then((h) => setMetrics(h.image_model_metrics)).catch(() => {});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const start = user ? '/app/scan' : '/register';

  return (
    <>
      <header className={`public-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="inner">
          <Brand />
          <nav className="public-nav">
            <a href="#how">How it works</a>
            <a href="#modules">Modules</a>
            <a href="#privacy">Privacy</a>
          </nav>
          <div className="header-actions">
            {user ? (
              <Link className="btn btn-primary" to="/app">Open dashboard</Link>
            ) : (
              <>
                <Link className="btn btn-ghost" to="/login">Sign in</Link>
                <Link className="btn btn-primary" to="/register">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <div className="wrap">
          <section className="hero">
            <div className="stagger">
              <span className="eyebrow">Deepfake detection &middot; digital identity protection</span>
              <h1>Know when a photo is fake, and when <em>your face</em> is in it.</h1>
              <p className="lead">
                Sentinel ID checks images for signs of AI generation and manipulation, and watches for your own face
                appearing in synthetic media.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" to={start}>Scan an image <Icon name="arrowRight" /></Link>
                {!user && <Link className="btn btn-lg" to="/login">Sign in</Link>}
              </div>
              <div className="hero-facts">
                <div><b>3-stage</b><span>analysis pipeline</span></div>
                <div><b>{metrics ? `${(metrics.test_accuracy * 100).toFixed(1)}%` : '--'}</b><span>accuracy on unseen test faces</span></div>
                <div><b>&lt; 1 s</b><span>typical scan time</span></div>
              </div>
            </div>

            <div className="mock" aria-hidden="true">
              <div className="mock-bar">
                <span className="dots"><i /><i /><i /></span>
                <span>scan_0f3a91.jpg</span>
              </div>
              <div className="mock-body">
                <div className="mock-frame sweep">
                  <FaceSketch />
                  <div className="facebox" />
                </div>
                <div className="mock-side">
                  <div className="mock-row"><span>Generator tags</span><span className="ok">none</span></div>
                  <div className="mock-row"><span>Faces found</span><span>1</span></div>
                  <div className="mock-row"><span>Identity match</span><span className="bad">0.71</span></div>
                  <div className="mock-row"><span>Camera EXIF</span><span>missing</span></div>
                  <div className="mock-verdict">
                    <b>Likely manipulated</b>
                    <span style={{ fontSize: '.74rem' }}>91% synthetic &middot; alert raised</span>
                    <div className="mock-meter"><i /></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="band section" id="how">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2>Four checks, one clear verdict</h2>
              <p>Each scan produces an evidence list, so you can see why an image was flagged rather than trusting a single score.</p>
            </div>
            <div className="steps">
              {STEPS.map(([t, d]) => (
                <div className="step" key={t}><h3>{t}</h3><p>{d}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="modules">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Modules</span>
              <h2>What the platform covers</h2>
              <p>Image and identity protection are live. Audio and video analysis are being built next.</p>
            </div>
            <div className="modules">
              {MODULES.map(([icon, t, d, live]) => (
                <div className="module" key={t}>
                  <div className="module-top">
                    <span className={`module-icon ${live ? '' : 'planned'}`}><Icon name={icon} /></span>
                    <span className={`badge ${live ? 'badge-real' : 'badge-plain'}`}>{live ? 'Live' : 'Planned'}</span>
                  </div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="privacy" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="cta">
              <div>
                <h2>Your photos are not kept</h2>
                <p>
                  Uploads are deleted as soon as the analysis finishes. Only a small thumbnail, the verdict and the file
                  hash are stored in your private history.
                </p>
              </div>
              <Link className="btn btn-primary btn-lg" to={start}>{user ? 'Start a scan' : 'Create a free account'}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <span>Sentinel ID &middot; Deepfake Detection and Digital Identity Protection Platform</span>
          <span>Results are evidence, not proof. Always verify important content.</span>
        </div>
      </footer>
    </>
  );
}
