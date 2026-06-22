import { useMemo, useRef, useState, useCallback, useEffect } from 'react';

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = {
  bg: '#121212',
  pillBg: '#1e1e1e',
  pillBgHover: '#2a2a2a',
  pillBgActive: '#8B5CF6',
  text: '#e0e0e0',
  textActive: '#ffffff',
  textMuted: '#999',
  border: '#333',
  radius: 999,
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scroll: 0 });

  // Scroll the active pill into view when selection changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategory]);

  // ── Drag-to-scroll handlers ───────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, scroll: scrollRef.current.scrollLeft };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !scrollRef.current) return;
      const dx = e.clientX - dragStart.current.x;
      scrollRef.current.scrollLeft = dragStart.current.scroll - dx;
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Render pills ──────────────────────────────────────────────────────────
  const pills = useMemo(() => {
    return ['All', ...categories].map((cat) => {
      const isAll = cat === 'All';
      const isActive = isAll ? selectedCategory === null : selectedCategory === cat;

      return (
        <button
          key={cat}
          data-active={isActive ? 'true' : 'false'}
          onClick={() => onSelectCategory(isAll ? null : cat)}
          style={{
            background: isActive ? theme.pillBgActive : theme.pillBg,
            color: isActive ? theme.textActive : theme.textMuted,
            border: `1px solid ${isActive ? theme.pillBgActive : theme.border}`,
            borderRadius: theme.radius,
            padding: '0.4rem 0.9rem',
            fontSize: '0.75rem',
            fontWeight: isActive ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = theme.pillBgHover;
              e.currentTarget.style.color = theme.text;
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = theme.pillBg;
              e.currentTarget.style.color = theme.textMuted;
            }
          }}
        >
          {cat}
        </button>
      );
    });
  }, [categories, selectedCategory, onSelectCategory]);

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0 0 0.75rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {pills}
    </div>
  );
}
