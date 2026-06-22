import { useRef, useEffect, useCallback, useState } from 'react';
import type { Message } from '../types';
import MessageBubble from './MessageBubble';
import VoiceButton from './VoiceButton';
import LoadingSpinner from './LoadingSpinner';

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = {
  bg: '#121212',
  panelBg: '#1e1e1e',
  inputBg: '#1a1a1a',
  inputBorder: '#333',
  inputBorderFocus: '#8B5CF6',
  text: '#e0e0e0',
  textMuted: '#999',
  textDim: '#666',
  accent: '#8B5CF6',
  accentHover: '#7C3AED',
  sendBg: '#8B5CF6',
  sendBgHover: '#7C3AED',
  placeholder: '#555',
  typingDot: '#8B5CF6',
  scrollbarThumb: '#333',
  scrollbarTrack: 'transparent',
} as const;

// ─── Injected animation styles (once) ─────────────────────────────────────────
let stylesInjected = false;
function injectChatStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes typing-dot {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }
    .chat-typing-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${theme.typingDot};
      animation: typing-dot 1.4s ease-in-out infinite;
    }
    .chat-typing-dot:nth-child(1) { animation-delay: 0s; }
    .chat-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .chat-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    .chat-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .chat-scrollbar::-webkit-scrollbar-track {
      background: ${theme.scrollbarTrack};
    }
    .chat-scrollbar::-webkit-scrollbar-thumb {
      background: ${theme.scrollbarThumb};
      border-radius: 2px;
    }
    .chat-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `;
  document.head.appendChild(style);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  isListening: boolean;
  isVoiceSupported: boolean;
  onToggleVoice: () => void;
  selectedProductId: string | null;
  onPlaceInAR: (productId: string) => void;
}

// ─── Send SVG icon ────────────────────────────────────────────────────────────

const SendIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: theme.panelBg,
  overflow: 'hidden',
  position: 'relative',
};

const headerStyle: React.CSSProperties = {
  padding: '0.7rem 1rem',
  borderBottom: `1px solid ${theme.inputBorder}`,
  flexShrink: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: theme.text,
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
};

const headerDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: theme.accent,
  flexShrink: 0,
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '0.75rem 0.75rem 0.5rem',
  scrollBehavior: 'smooth',
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  textAlign: 'center',
  padding: '2rem',
  gap: '0.75rem',
};

const emptyIconStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'rgba(139, 92, 246, 0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.4rem',
  marginBottom: '0.25rem',
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: theme.text,
};

const emptySubStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: theme.textMuted,
  lineHeight: 1.5,
  maxWidth: 240,
};

// ─── Typing indicator ─────────────────────────────────────────────────────────

const typingContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.4rem 0.75rem',
  marginBottom: '0.3rem',
  marginLeft: '2.1rem',
};

const typingLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: theme.textDim,
  fontStyle: 'italic',
};

// ─── Input bar ────────────────────────────────────────────────────────────────

const inputBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.6rem 0.75rem',
  borderTop: `1px solid ${theme.inputBorder}`,
  background: theme.bg,
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: theme.inputBg,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 10,
  padding: '0.55rem 0.75rem',
  fontSize: '0.8rem',
  color: theme.text,
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
  resize: 'none',
  minHeight: 36,
  maxHeight: 100,
  lineHeight: 1.4,
};

const sendBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: 'none',
  borderRadius: '50%',
  background: theme.sendBg,
  color: '#fff',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background 0.15s, transform 0.1s, opacity 0.15s',
  outline: 'none',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPanel({
  messages,
  onSendMessage,
  isProcessing,
  isListening,
  isVoiceSupported,
  onToggleVoice,
  onPlaceInAR,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Inject animation styles on mount
  useEffect(() => {
    injectChatStyles();
  }, []);

  // Auto-scroll to bottom when messages change or processing state changes
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, scrollToBottom]);

  // Send message handler
  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage(trimmed);
    setInputValue('');
    // Refocus input after send
    inputRef.current?.focus();
  }, [inputValue, isProcessing, onSendMessage]);

  // Keyboard submit
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      // Auto-resize textarea
      const el = e.currentTarget;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
    },
    [],
  );

  const canSend = inputValue.trim().length > 0 && !isProcessing;

  return (
    <div className="fade-in" style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerTitleStyle}>
          <span style={headerDotStyle} />
          Chat with AI
        </div>
      </div>

      {/* Messages area */}
      <div className="chat-scrollbar" style={messagesContainerStyle}>
        {messages.length === 0 ? (
          /* Empty state */
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>
              <span role="img" aria-label="furniture">
                🛋️
              </span>
            </div>
            <div style={emptyTitleStyle}>Ask me about furniture!</div>
            <div style={emptySubStyle}>
              Try &ldquo;show me a couch&rdquo; or &ldquo;I need a coffee table
              for my living room&rdquo;
            </div>
          </div>
        ) : (
          /* Message list */
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onPlaceInAR={onPlaceInAR}
              />
            ))}

            {/* Typing indicator */}
            {isProcessing && (
              <div style={typingContainerStyle}>
                <div style={{ display: 'flex', gap: 3 }}>
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </div>
                <span style={typingLabelStyle}>AI is thinking&hellip;</span>
              </div>
            )}
          </>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={inputBarStyle}>
        {/* Voice button */}
        <VoiceButton
          isListening={isListening}
          isVoiceSupported={isVoiceSupported}
          onToggle={onToggleVoice}
        />

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about furniture…"
          rows={1}
          style={inputStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.inputBorderFocus;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.inputBorder;
          }}
          aria-label="Chat message"
          disabled={isProcessing}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          style={{
            ...sendBtnStyle,
            opacity: canSend || isProcessing ? 1 : 0.35,
            cursor: canSend ? 'pointer' : 'default',
          }}
          disabled={!canSend && !isProcessing}
          aria-label={isProcessing ? 'Processing' : 'Send message'}
          onMouseEnter={(e) => {
            if (canSend) {
              e.currentTarget.style.background = theme.sendBgHover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.sendBg;
          }}
        >
          {isProcessing ? (
            <LoadingSpinner size={16} inline />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
    </div>
  );
}
