export const pct = (v, digits = 1) => `${(v * 100).toFixed(digits)}%`;

export const dateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const dateOnly = (iso) => new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

export const bytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

export const RISK_TEXT = {
  none: 'No signs of manipulation',
  low: 'Minor irregularities',
  medium: 'Likely manipulated',
  high: 'Strong evidence of manipulation',
};
