import { useRef, useState } from 'react';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp';

export default function FileDrop({ onFile, accept = IMAGE_ACCEPT, maxMb = 15, label = 'Drop an image here or click to choose' }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');

  const take = (file) => {
    if (!file) return;
    if (!accept.split(',').includes(file.type)) {
      setError('Unsupported file type. Use JPG, PNG, WEBP or BMP.');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(`File is larger than ${maxMb} MB.`);
      return;
    }
    setError('');
    onFile(file);
  };

  return (
    <>
      <div
        className={`drop ${over ? 'over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files[0]);
        }}
      >
        <p><strong>{label}</strong></p>
        <p className="muted" style={{ fontSize: '.85rem' }}>JPG, PNG, WEBP or BMP &middot; up to {maxMb} MB</p>
        <input
          ref={input}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            take(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && <div className="notice notice-error" style={{ marginTop: '.75rem' }}>{error}</div>}
    </>
  );
}
