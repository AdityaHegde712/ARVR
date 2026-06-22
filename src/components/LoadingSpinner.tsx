// ─── Theme ──────────────────────────────────────────────────────────────────
const theme = {
  accent: '#8B5CF6',
  text: '#e0e0e0',
  textMuted: '#999',
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  padding: '2rem',
};

const spinnerRingStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: `3px solid rgba(139, 92, 246, 0.15)`,
  borderTopColor: theme.accent,
  animation: 'arvr-spin 0.8s linear infinite',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: theme.textMuted,
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`,
  textAlign: 'center',
};

// ─── Inline spinner keyframes (injected once) ────────────────────────────────

let injected = false;
function injectKeyframes() {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes arvr-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  /** Optional label shown below the spinner */
  label?: string;
  /** Optional size override in pixels (default: 32) */
  size?: number;
  /** Inline mode: no padding/column, just the ring (for buttons etc.) */
  inline?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LoadingSpinner({
  label,
  size,
  inline,
}: LoadingSpinnerProps) {
  // Inject keyframes on first render
  if (!injected) injectKeyframes();

  const ringStyle = {
    ...spinnerRingStyle,
    width: size ?? 32,
    height: size ?? 32,
  };

  if (inline) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={ringStyle} role="status" aria-label={label ?? 'Loading'} />
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div style={ringStyle} role="status" aria-label={label ?? 'Loading'} />
      {label && <div style={labelStyle}>{label}</div>}
    </div>
  );
}
