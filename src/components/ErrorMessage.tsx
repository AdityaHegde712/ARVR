// ─── Theme ──────────────────────────────────────────────────────────────────
const theme = {
  bg: '#121212',
  surface: '#1e1e1e',
  text: '#e0e0e0',
  textMuted: '#999',
  errorAccent: '#cf6679',
  errorBg: 'rgba(207, 102, 121, 0.08)',
  errorBorder: 'rgba(207, 102, 121, 0.25)',
  accent: '#8B5CF6',
  accentHover: '#7C3AED',
  border: '#333',
};

// ─── Inline variant ─────────────────────────────────────────────────────────

const inlineContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: theme.errorBg,
  border: `1px solid ${theme.errorBorder}`,
  borderRadius: 8,
  fontSize: '0.75rem',
  color: theme.errorAccent,
  lineHeight: 1.4,
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`,
};

const inlineIconStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: '0.85rem',
  lineHeight: 1,
  opacity: 0.9,
};

const inlineMessageStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const inlineRetryStyle: React.CSSProperties = {
  flexShrink: 0,
  background: 'transparent',
  border: `1px solid ${theme.errorAccent}`,
  color: theme.errorAccent,
  borderRadius: 6,
  padding: '0.25rem 0.6rem',
  fontSize: '0.65rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s',
  outline: 'none',
  whiteSpace: 'nowrap',
};

// ─── Fullscreen variant ─────────────────────────────────────────────────────

const fullscreenContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100%',
  padding: '2rem',
  background: theme.bg,
  color: theme.text,
  textAlign: 'center',
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`,
};

const fullscreenCardStyle: React.CSSProperties = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  padding: '2rem',
  maxWidth: 400,
  width: '100%',
};

const fullscreenIconStyle: React.CSSProperties = {
  fontSize: '2rem',
  marginBottom: '0.75rem',
  opacity: 0.8,
};

const fullscreenTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: theme.errorAccent,
  marginBottom: '0.5rem',
};

const fullscreenMessageStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: theme.textMuted,
  lineHeight: 1.5,
  marginBottom: '1.25rem',
};

const fullscreenRetryStyle: React.CSSProperties = {
  background: theme.errorAccent,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '0.55rem 1.4rem',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  outline: 'none',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface ErrorMessageProps {
  /** The error message to display */
  message: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Visual variant: inline (in-flow) or fullscreen (centered card) */
  variant?: 'inline' | 'fullscreen';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ErrorMessage({
  message,
  onRetry,
  variant = 'inline',
}: ErrorMessageProps) {
  if (variant === 'fullscreen') {
    return (
      <div style={fullscreenContainerStyle}>
        <div style={fullscreenCardStyle}>
          <div style={fullscreenIconStyle}>⚠</div>
          <div style={fullscreenTitleStyle}>Error</div>
          <div style={fullscreenMessageStyle}>{message}</div>
          {onRetry && (
            <button
              type="button"
              style={fullscreenRetryStyle}
              onClick={onRetry}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div style={inlineContainerStyle} role="alert">
      <span style={inlineIconStyle}>⚠</span>
      <span style={inlineMessageStyle}>{message}</span>
      {onRetry && (
        <button
          type="button"
          style={inlineRetryStyle}
          onClick={onRetry}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(207, 102, 121, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
