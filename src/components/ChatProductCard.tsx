import type { Product } from '../types';

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = {
  accent: '#8B5CF6',
  accentHover: '#7C3AED',
  text: '#e0e0e0',
  textMuted: '#999',
  border: '#444',
  cardBg: '#1e1e1e',
  cardBgHover: '#252525',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatProductCardProps {
  product: Product;
  onPlaceInAR: (productId: string) => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  background: theme.cardBg,
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: '0.5rem 0.6rem 0.5rem 0.5rem',
  marginTop: '0.5rem',
  transition: 'background 0.15s, border-color 0.15s',
};

const colorSwatchStyle = (hex: string): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: 6,
  background: hex || '#555',
  flexShrink: 0,
  border: '1px solid rgba(255,255,255,0.1)',
});

const infoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15rem',
};

const nameStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: theme.text,
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
};

const categoryBadgeStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 500,
  color: theme.accent,
  background: 'rgba(139, 92, 246, 0.15)',
  padding: '0.1rem 0.4rem',
  borderRadius: 999,
  lineHeight: 1.4,
};

const arBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  background: theme.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.3rem 0.55rem',
  fontSize: '0.62rem',
  fontWeight: 600,
  cursor: 'pointer',
  lineHeight: 1.3,
  transition: 'background 0.15s',
  whiteSpace: 'nowrap',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatProductCard({
  product,
  onPlaceInAR,
}: ChatProductCardProps) {
  const handlePlace = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlaceInAR(product.id);
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.cardBgHover;
        e.currentTarget.style.borderColor = theme.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = theme.cardBg;
        e.currentTarget.style.borderColor = theme.border;
      }}
    >
      {/* Color swatch */}
      <div style={colorSwatchStyle(product.colorHex)} />

      {/* Info */}
      <div style={infoStyle}>
        <div style={nameStyle}>{product.name}</div>
        <div style={badgeRowStyle}>
          <span style={categoryBadgeStyle}>{product.category}</span>
        </div>
      </div>

      {/* Place in AR button */}
      <button
        type="button"
        style={arBtnStyle}
        onClick={handlePlace}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.accentHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.accent;
        }}
        aria-label={`Place ${product.name} in AR`}
      >
        Place in AR
      </button>
    </div>
  );
}
