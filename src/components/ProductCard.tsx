import type { Product } from '../types';

// ─── Theme constants ──────────────────────────────────────────────────────────
const theme = {
  cardBg: '#1e1e1e',
  cardBgHover: '#2a2a2a',
  border: '#333',
  borderSelected: '#8B5CF6',
  text: '#e0e0e0',
  textMuted: '#999',
  textDim: '#777',
  accent: '#8B5CF6',
  radius: 12,
} as const;

// ─── Inline styles ────────────────────────────────────────────────────────────

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: '4 / 3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  initials: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
    lineHeight: 1,
  },
  arLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
    padding: '1.5rem 0.5rem 0.5rem',
    textAlign: 'center' as const,
    fontSize: '0.7rem',
    fontWeight: 500,
    color: theme.accent,
    letterSpacing: '0.02em',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  body: {
    padding: '0.65rem 0.75rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  name: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: theme.text,
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '0.35rem',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.4rem',
  },
  categoryBadge: {
    fontSize: '0.62rem',
    fontWeight: 500,
    color: theme.accent,
    background: 'rgba(139, 92, 246, 0.15)',
    padding: '0.15rem 0.45rem',
    borderRadius: 999,
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.4,
  },
  dims: {
    fontSize: '0.62rem',
    color: theme.textDim,
    whiteSpace: 'nowrap' as const,
  },
  colorDotRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    marginTop: '0.35rem',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.15)',
    flexShrink: 0,
  } as React.CSSProperties,
  colorName: {
    fontSize: '0.62rem',
    color: theme.textDim,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract initials from product name (max 2 chars) */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Format dimensions into a compact string */
function formatDims(dims: { width: number; height: number; depth: number }): string {
  const w = dims.width.toFixed(dims.width % 1 === 0 ? 0 : 1);
  const h = dims.height.toFixed(dims.height % 1 === 0 ? 0 : 1);
  const d = dims.depth.toFixed(dims.depth % 1 === 0 ? 0 : 1);
  return `${w} × ${h} × ${d}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, isSelected, onSelect }: ProductCardProps) {
  const handleClick = () => onSelect(product);

  const cardStyle: React.CSSProperties = {
    ...cardStyles.card,
    borderColor: isSelected ? theme.borderSelected : theme.border,
    boxShadow: isSelected
      ? `0 0 0 1px ${theme.borderSelected}, 0 4px 16px rgba(139, 92, 246, 0.2)`
      : '0 1px 4px rgba(0,0,0,0.3)',
    transform: isSelected ? 'translateY(-2px)' : 'none',
  };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      aria-pressed={isSelected}
      aria-label={`${product.name} — ${product.category}`}
      // Hover state is handled via CSS class — we attach a style-manager inline
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (!isSelected) {
          el.style.borderColor = theme.accent;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        }
        const label = el.querySelector('[data-ar-label]') as HTMLElement;
        if (label) label.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (!isSelected) {
          el.style.borderColor = theme.border;
          el.style.transform = 'none';
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
        }
        const label = el.querySelector('[data-ar-label]') as HTMLElement;
        if (label) label.style.opacity = '0';
      }}
    >
      {/* Thumbnail placeholder */}
      <div
        style={{
          ...cardStyles.thumbnail,
          background: product.colorHex || '#444',
        }}
      >
        <span style={cardStyles.initials}>{getInitials(product.name)}</span>
        <div data-ar-label style={cardStyles.arLabel}>
          Tap to view in AR
        </div>
      </div>

      {/* Body */}
      <div style={cardStyles.body}>
        <div style={cardStyles.name}>{product.name}</div>

        <div style={cardStyles.metaRow}>
          <span style={cardStyles.categoryBadge}>{product.category}</span>
          <span style={cardStyles.dims}>{formatDims(product.dimensions)}</span>
        </div>

        <div style={cardStyles.colorDotRow}>
          <span
            style={{
              ...cardStyles.colorDot,
              background: product.colorHex || '#888',
            }}
          />
          <span style={cardStyles.colorName}>{product.color}</span>
        </div>
      </div>
    </div>
  );
}
