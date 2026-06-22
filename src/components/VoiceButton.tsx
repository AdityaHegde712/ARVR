import { useEffect } from 'react';

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = {
  accent: '#8B5CF6',
  listeningPulse: '#ef4444',
  iconInactive: '#999',
  iconActive: '#fff',
} as const;

// ─── Injected animation styles (once) ─────────────────────────────────────────
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes voice-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
      70%  { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .voice-btn-listening {
      animation: voice-pulse 1.5s ease-in-out infinite;
    }
    @keyframes voice-ripple {
      0%   { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    .voice-ripple {
      animation: voice-ripple 1.2s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// ─── Mic SVG path ─────────────────────────────────────────────────────────────
const MicIcon = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface VoiceButtonProps {
  isListening: boolean;
  isVoiceSupported: boolean;
  onToggle: () => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const baseBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.15s',
  flexShrink: 0,
  position: 'relative',
  outline: 'none',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceButton({
  isListening,
  isVoiceSupported,
  onToggle,
}: VoiceButtonProps) {
  useEffect(() => {
    injectStyles();
  }, []);

  // Not supported — render nothing
  if (!isVoiceSupported) return null;

  const isActive = isListening;

  const btnStyle: React.CSSProperties = {
    ...baseBtnStyle,
    background: isActive ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
    ...(isActive ? { animation: 'voice-pulse 1.5s ease-in-out infinite' } : {}),
  };

  const rippleStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(239, 68, 68, 0.4)',
    pointerEvents: 'none',
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      style={btnStyle}
      aria-label={isActive ? 'Listening, tap to stop' : 'Tap to speak'}
      title={isActive ? 'Listening…' : 'Tap to speak'}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {/* Ripple ring when listening */}
      {isActive && <span style={rippleStyle} className="voice-ripple" />}

      <MicIcon color={isActive ? theme.listeningPulse : theme.iconInactive} />
    </button>
  );
}
