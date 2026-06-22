import type { Message } from '../types';
import ChatProductCard from './ChatProductCard';

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = {
  accent: '#8B5CF6',
  userBubble: '#8B5CF6',
  aiBubble: '#2a2a2a',
  aiBubbleBorder: '#3a3a3a',
  textPrimary: '#e0e0e0',
  textSecondary: '#bbb',
  textMuted: '#888',
  timestamp: '#666',
  badgeBg: 'rgba(139, 92, 246, 0.2)',
  badgeText: '#b794f4',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  onPlaceInAR: (productId: string) => void;
}

// ─── Timestamp formatter ──────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const date = new Date(ts);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const wrapperStyle = (role: Message['role']): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: role === 'user' ? 'flex-end' : 'flex-start',
  marginBottom: '0.6rem',
  maxWidth: '100%',
});

const bubbleRowStyle = (role: Message['role']): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: '0.4rem',
  flexDirection: role === 'user' ? 'row-reverse' : 'row',
  maxWidth: '100%',
});

const aiAvatarStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: theme.badgeBg,
  color: theme.badgeText,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.6rem',
  fontWeight: 700,
  flexShrink: 0,
  letterSpacing: '0.02em',
  border: `1px solid rgba(139, 92, 246, 0.25)`,
};

const bubbleStyle = (role: Message['role']): React.CSSProperties => {
  const isUser = role === 'user';
  return {
    background: isUser ? theme.userBubble : theme.aiBubble,
    border: isUser ? 'none' : `1px solid ${theme.aiBubbleBorder}`,
    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    padding: '0.55rem 0.75rem',
    maxWidth: '85%',
    wordBreak: 'break-word',
    boxShadow: isUser
      ? '0 2px 8px rgba(139, 92, 246, 0.25)'
      : '0 1px 4px rgba(0,0,0,0.2)',
  };
};

const textStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: theme.textPrimary,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
};

const timestampStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  color: theme.timestamp,
  marginTop: '0.2rem',
  padding: '0 0.2rem',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageBubble({ message, onPlaceInAR }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const showAvatar = !isUser && !isSystem;

  return (
    <div style={wrapperStyle(message.role)}>
      <div style={bubbleRowStyle(message.role)}>
        {/* AI avatar / badge */}
        {showAvatar && (
          <div style={aiAvatarStyle} aria-label="AI assistant" title="AI">
            AI
          </div>
        )}

        {/* Spacer for user messages (no avatar) */}
        {isUser && <div style={{ width: 26, flexShrink: 0 }} />}

        {/* Bubble content */}
        <div style={bubbleStyle(message.role)}>
          {/* System messages styled subtly */}
          {isSystem ? (
            <div
              style={{
                ...textStyle,
                color: theme.textMuted,
                fontStyle: 'italic',
                fontSize: '0.75rem',
              }}
            >
              {message.content}
            </div>
          ) : (
            <div style={textStyle}>{message.content}</div>
          )}

          {/* Product cards for assistant messages */}
          {message.products && message.products.length > 0 && (
            <div style={{ marginTop: '0.15rem' }}>
              {message.products.map((product) => (
                <ChatProductCard
                  key={product.id}
                  product={product}
                  onPlaceInAR={onPlaceInAR}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div style={timestampStyle}>{formatTime(message.timestamp)}</div>
    </div>
  );
}
