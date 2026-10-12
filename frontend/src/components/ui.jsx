import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/** Animates a number from 0 to `value` when it first appears or changes. */
export function CountUp({ value, duration = 900, format = (v) => Math.round(v).toLocaleString() }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof value !== 'number') return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const begin = from.current;
    let frame;
    const tick = (now) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(begin + (value - begin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{format(shown)}</>;
}

const TONES = { error: 'alert', ok: 'check', warn: 'alert', info: 'info' };

export function Notice({ tone = 'info', children }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={TONES[tone]} />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon = 'layers', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="panel-pad" style={{ display: 'grid', gap: '.8rem' }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: '.8rem', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 40, height: 40 }} />
          <div style={{ flex: 1, display: 'grid', gap: '.4rem' }}>
            <div className="skeleton" style={{ height: 11, width: `${60 - i * 7}%` }} />
            <div className="skeleton" style={{ height: 9, width: '30%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- confirm dialog + toast, available through useUI() ---------- */
const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setDialog({ ...opts, resolve })),
    [],
  );

  const notify = useCallback((message, tone = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const close = (answer) => {
    dialog.resolve(answer);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <UIContext.Provider value={{ confirm, notify }}>
      {children}
      {dialog && (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
            <h2 id="dlg-title">{dialog.title}</h2>
            {dialog.message && <p>{dialog.message}</p>}
            <div className="modal-actions">
              <button className="btn" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${dialog.danger ? 'btn-dark' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div key={toast.key} className={`toast ${toast.tone}`} role="status">
          <Icon name={toast.tone === 'error' ? 'alert' : 'check'} />
          {toast.message}
        </div>
      )}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
