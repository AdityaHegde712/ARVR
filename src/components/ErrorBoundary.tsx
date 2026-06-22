import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// ─── Theme ──────────────────────────────────────────────────────────────────
const theme = {
  bg: '#121212',
  surface: '#1e1e1e',
  text: '#e0e0e0',
  textMuted: '#999',
  accent: '#8B5CF6',
  accentHover: '#7C3AED',
  errorAccent: '#cf6679',
  border: '#333',
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
  padding: '2rem',
  background: theme.bg,
  color: theme.text,
  textAlign: 'center',
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`,
};

const cardStyle: React.CSSProperties = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  padding: '2rem',
  maxWidth: 400,
  width: '100%',
};

const iconStyle: React.CSSProperties = {
  fontSize: '2rem',
  marginBottom: '1rem',
  opacity: 0.8,
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: theme.errorAccent,
  marginBottom: '0.5rem',
};

const messageStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: theme.textMuted,
  lineHeight: 1.5,
  marginBottom: '1.5rem',
};

const detailStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#666',
  lineHeight: 1.4,
  marginBottom: '1.5rem',
  padding: '0.5rem',
  background: 'rgba(0,0,0,0.2)',
  borderRadius: 6,
  maxHeight: 80,
  overflow: 'auto',
  wordBreak: 'break-all',
  fontFamily: 'monospace',
};

const buttonStyle: React.CSSProperties = {
  background: theme.errorAccent,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '0.6rem 1.5rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  outline: 'none',
};

// ─── Props & State ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI to render instead of the default */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    // Log the error to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback was provided, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const errorMessage =
        this.state.error?.message ?? 'An unexpected error occurred.';
      const componentStack =
        this.state.errorInfo?.componentStack ?? '';

      return (
        <div style={containerStyle}>
          <div style={cardStyle}>
            <div style={iconStyle}>⚠</div>
            <div style={titleStyle}>Something went wrong</div>
            <div style={messageStyle}>
              {errorMessage}
            </div>
            {componentStack && import.meta.env.DEV && (
              <div style={detailStyle}>{componentStack}</div>
            )}
            <button
              type="button"
              style={buttonStyle}
              onClick={this.handleRetry}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
