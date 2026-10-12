import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import Brand from '../components/Brand';

const MODULES = [
  ['Image deepfake detection', 'Available'],
  ['Protected identity (face enrolment)', 'Available'],
  ['Identity misuse alerts', 'Available'],
  ['Scan history and reports', 'Available'],
  ['Audio deepfake detection', 'Planned'],
  ['Video deepfake detection', 'Planned'],
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <>
      <header className="public-header">
        <div className="inner">
          <Brand />
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {user ? (
              <Link className="btn btn-primary" to="/app">Open dashboard</Link>
            ) : (
              <>
                <Link className="btn" to="/login">Sign in</Link>
                <Link className="btn btn-primary" to="/register">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="intro">
          <div>
            <h1>Deepfake Detection and Digital Identity Protection Platform</h1>
            <p>
              Check whether a photo has been generated or altered by AI, and find out when your own face is being used
              in manipulated media.
            </p>
            <p>
              Upload an image and the platform inspects the file metadata, locates faces and runs a neural classifier
              trained on real and generated faces. If you enrol a reference photo, every scan is also compared against
              your face and you are alerted when it shows up in a fake.
            </p>
            <div className="actions">
              <Link className="btn btn-primary" to={user ? '/app/scan' : '/register'}>Start a scan</Link>
              <Link className="btn" to={user ? '/app' : '/login'}>I already have an account</Link>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Module status</h2></div>
            <div className="panel-pad">
              <ul className="status-list">
                {MODULES.map(([name, state]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <span className={`badge ${state === 'Available' ? 'badge-real' : 'badge-plain'}`}>{state}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="columns-3">
          <div className="panel panel-pad">
            <h3>1. Metadata forensics</h3>
            <p className="muted">
              Looks for generator tags written by tools such as Midjourney, DALL-E, Stable Diffusion and Firefly, C2PA
              content credentials and camera EXIF data.
            </p>
          </div>
          <div className="panel panel-pad">
            <h3>2. Face analysis</h3>
            <p className="muted">
              Faces are located with a YuNet detector and the largest face is passed to an EfficientNet-B0 model
              fine-tuned to tell camera photos from GAN-generated faces.
            </p>
          </div>
          <div className="panel panel-pad">
            <h3>3. Identity matching</h3>
            <p className="muted">
              Your enrolled face is stored as a 128-number embedding, not as a searchable photo. Scans are compared to it
              and a match inside a fake image raises an alert.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
